import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listRoleAssignments(req, res, next) {
  try {
    const { userId, roleId } = req.query;

    const where = {
      user: { companyId: req.user.companyId },
      ...(userId ? { userId: String(userId) } : {}),
      ...(roleId ? { roleId: String(roleId) } : {}),
    };

    const assignments = await prisma.roleAssignment.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: true,
        grantedByUser: { select: { id: true, fullName: true, email: true } },
      },
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

export async function createRoleAssignment(req, res, next) {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    const roleId = body.roleId || body.role_id;
    const scopeType = body.scopeType || body.scope_type || 'Company';
    const scopeId = body.scopeId || body.scope_id || req.user.companyId;

    validateRequired({ userId, roleId }, ['userId', 'roleId']);

    // Ensure target user belongs to caller's company
    const targetUser = await prisma.user.findFirst({
      where: { id: String(userId), companyId: req.user.companyId },
    });
    if (!targetUser) {
      throw new NotFoundError(`User ${userId} not found in this company`);
    }

    // Ensure role belongs to caller's company
    const role = await prisma.role.findFirst({
      where: { id: String(roleId), companyId: req.user.companyId },
    });
    if (!role) {
      throw new NotFoundError(`Role ${roleId} not found in this company`);
    }

    const assignment = await prisma.roleAssignment.create({
      data: {
        companyId: req.user.companyId,
        userId: String(userId),
        roleId: String(roleId),
        scopeType,
        scopeId: String(scopeId),
        grantedById: req.user.id,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        role: true,
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        action: AUDIT_ACTIONS.ROLE_ASSIGNED,
        performedById: req.user.id,
        newValue: { userId, roleId: role.id, roleLabel: role.label },
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

export async function deleteRoleAssignment(req, res, next) {
  try {
    const { id } = req.params;

    const assignment = await prisma.roleAssignment.findFirst({
      where: { id, user: { companyId: req.user.companyId } },
      include: { role: true },
    });

    if (!assignment) {
      throw new NotFoundError(`Role assignment ${id} not found in this company`);
    }

    await prisma.roleAssignment.delete({ where: { id } });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        action: AUDIT_ACTIONS.ROLE_REVOKED,
        performedById: req.user.id,
        oldValue: { userId: assignment.userId, roleLabel: assignment.role?.label },
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

