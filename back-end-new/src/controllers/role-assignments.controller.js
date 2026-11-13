import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { systemSlugOfRole } from '../utils/roles.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { assertValidScope, assertScopeFitsRole, countActiveOwners, ROLE_WITH_TEMPLATE } from '../utils/roleAssignmentGuards.js';
import { withCompanyLock } from '../utils/planLimits.js';

/** Shared by list, create and the 'already assigned' path so all return the same shape (BD11). */
const ASSIGNMENT_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true } },
  role: true,
  grantedByUser: { select: { id: true, fullName: true, email: true } },
};

export async function listRoleAssignments(req, res, next) {
  try {
    const { userId, roleId } = req.query;

    const where = {
      user: { companyId: req.user.companyId },
      revokedAt: null,
      ...(userId ? { userId: String(userId) } : {}),
      ...(roleId ? { roleId: String(roleId) } : {}),
    };

    const assignments = await prisma.roleAssignment.findMany({
      where,
      include: ASSIGNMENT_INCLUDE,
      orderBy: { grantedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Who may grant or revoke a role (D-S1, D-S3).
 * Decided by the resolved system slug of the role and of the caller, never by label text.
 * - Nobody may change their own roles.
 * - Company Owner can be granted or revoked only by a Company Owner.
 * - System Admin only by a Company Owner or System Admin.
 */
function assertMayChangeRole(req, targetUserId, role, verb) {
  if (String(targetUserId) === req.user.id) {
    throw new ForbiddenError(`You cannot ${verb} your own roles`);
  }
  const slug = systemSlugOfRole(role);
  if (slug === 'company_owner' && req.user.role !== 'company_owner') {
    throw new ForbiddenError(`Only a Company Owner can ${verb} the Company Owner role`);
  }
  if (slug === 'system_admin' && !['company_owner', 'system_admin'].includes(req.user.role)) {
    throw new ForbiddenError(`Only a Company Owner or System Admin can ${verb} the System Admin role`);
  }
}

export async function createRoleAssignment(req, res, next) {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    const roleId = body.roleId || body.role_id;
    const scopeType = body.scopeType || body.scope_type || 'Company';
    const scopeId = String(body.scopeId || body.scope_id || req.user.companyId);
    const companyId = req.user.companyId;

    validateRequired({ userId, roleId }, ['userId', 'roleId']);

    // Ensure target user belongs to caller's company
    const targetUser = await prisma.user.findFirst({
      where: { id: String(userId), companyId },
    });
    if (!targetUser) {
      throw new NotFoundError(`User ${userId} not found in this company`);
    }

    // Ensure role belongs to caller's company
    const role = await prisma.role.findFirst({
      where: { id: String(roleId), companyId },
      ...ROLE_WITH_TEMPLATE,
    });
    if (!role) {
      throw new NotFoundError(`Role ${roleId} not found in this company`);
    }

    assertMayChangeRole(req, targetUser.id, role, 'assign');
    if (!targetUser.isActive) {
      throw new BadRequestError('Roles cannot be assigned to a deactivated user');
    }
    assertScopeFitsRole(role, scopeType);
    await assertValidScope({ companyId, scopeType, scopeId });

    // WHY: Idempotency & DoS Prevention (MAL-04 & NORM-04) - an identical active assignment is
    // returned instead of duplicated. The check and the insert run under the company row lock,
    // so parallel identical requests cannot each create a row.
    const { assignment, created } = await withCompanyLock(companyId, async (tx) => {
      const existing = await tx.roleAssignment.findFirst({
        where: {
          companyId,
          userId: targetUser.id,
          roleId: role.id,
          scopeType,
          scopeId,
          revokedAt: null,
        },
        include: ASSIGNMENT_INCLUDE,
      });
      if (existing) return { assignment: existing, created: false };

      const row = await tx.roleAssignment.create({
        data: {
          companyId,
          userId: targetUser.id,
          roleId: role.id,
          scopeType,
          scopeId,
          grantedById: req.user.id,
        },
        include: ASSIGNMENT_INCLUDE,
      });
      return { assignment: row, created: true };
    });

    if (!created) {
      return res.status(200).json({
        success: true,
        message: 'Role is already assigned to this user',
        data: assignment,
      });
    }

    // Record audit log
    try {
      await createSystemAuditLog({companyId,
        targetUserId: targetUser.id,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        performedById: req.user.id,
        newValue: { userId: targetUser.id, roleId: role.id, roleLabel: role.label, scopeType, scopeId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during role assignment:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Role assigned successfully',
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /role-assignments/:id
 * Soft revoke (D-S9): the row stays with revokedAt set, so access history is kept.
 * The auth middleware and every list ignore revoked rows.
 */
export async function deleteRoleAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const assignment = await prisma.roleAssignment.findFirst({
      where: { id, revokedAt: null, user: { companyId } },
      include: { role: ROLE_WITH_TEMPLATE },
    });

    if (!assignment) {
      throw new NotFoundError(`Role assignment ${id} not found in this company`);
    }

    assertMayChangeRole(req, assignment.userId, assignment.role, 'revoke');

    // Count and revoke under the company lock so two owners cannot remove each other at once.
    // Identical active duplicates (same user, role and scope, left by older code) are revoked
    // together, so a revoke really removes the access.
    await withCompanyLock(companyId, async (tx) => {
      const identical = await tx.roleAssignment.findMany({
        where: {
          userId: assignment.userId,
          roleId: assignment.roleId,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
          revokedAt: null,
        },
        select: { id: true },
      });
      const ids = identical.map((r) => r.id);

      if (systemSlugOfRole(assignment.role) === 'company_owner') {
        const stillOwner = await tx.roleAssignment.count({
          where: {
            userId: assignment.userId,
            revokedAt: null,
            id: { notIn: ids },
            role: { companyId, isSystem: true, OR: [{ roleTemplate: { slug: 'company_owner' } }, { name: 'company_owner' }] },
          },
        });
        if (!stillOwner && (await countActiveOwners(companyId, tx)) <= 1) {
          throw new ForbiddenError('Cannot revoke the sole active Company Owner of the organization');
        }
      }
      await tx.roleAssignment.updateMany({ where: { id: { in: ids }, revokedAt: null }, data: { revokedAt: new Date() } });
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId,
        targetUserId: assignment.userId,
        action: AUDIT_ACTIONS.ROLE_REVOKED,
        performedById: req.user.id,
        oldValue: { userId: assignment.userId, roleLabel: assignment.role?.label, scopeType: assignment.scopeType, scopeId: assignment.scopeId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during role revocation:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Role assignment revoked successfully',
    });
  } catch (err) {
    next(err);
  }
}
