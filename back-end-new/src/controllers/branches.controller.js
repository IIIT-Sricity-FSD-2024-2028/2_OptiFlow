import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors.js';
import { resolveEffectiveBranchId, assertBranchManagerScope } from '../utils/tenantScope.js';
import { validateRequired } from '../utils/validation.js';
import { ROLES } from '../utils/roles.js';
import { assertWithinPlanLimit, withCompanyLock } from '../utils/planLimits.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { assertMayRevokeFromHolders, assertGrantBelowCaller, ROLE_WITH_TEMPLATE } from '../utils/roleAssignmentGuards.js';

async function enrichBranchesWithManagers(branches, companyId) {
  if (!branches || branches.length === 0) return branches;

  const branchIds = branches.map((b) => b.id);
  const managerAssignments = await prisma.roleAssignment.findMany({
    where: {
      user: { companyId },
      scopeType: 'Branch',
      scopeId: { in: branchIds },
      revokedAt: null,
      role: {
        OR: [
          { label: ROLES.BRANCH_MANAGER },
          { name: 'branch_manager' },
          { roleTemplate: { slug: 'branch_manager' } },
        ],
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, jobTitle: true },
      },
    },
  });

  const branchManagerMap = new Map();
  for (const a of managerAssignments) {
    if (!branchManagerMap.has(a.scopeId)) {
      branchManagerMap.set(a.scopeId, a.user);
    }
  }

  return branches.map((b) => ({
    ...b,
    manager: branchManagerMap.get(b.id) || null,
  }));
}

/** One include shared by list, create and update so every response has the same shape. */
const BRANCH_LIST_INCLUDE = {
  teams: {
    include: {
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
  },
  company: { select: { id: true, legalName: true } },
};

export async function listBranches(req, res, next) {
  try {
    const effectiveBranchId = resolveEffectiveBranchId({
      user: req.user,
      branchId: req.query.branchId,
    });

    const where = {
      companyId: req.user.companyId,
      ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
    };

    const branches = await prisma.branch.findMany({
      where,
      include: BRANCH_LIST_INCLUDE,
      orderBy: { name: 'asc' },
    });

    const enriched = await enrichBranchesWithManagers(branches, req.user.companyId);

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

// Roles that see the project rows of every team in a branch (branch managers are scope-checked first).
const BRANCH_DETAIL_ROLES = ['company_owner', 'system_admin', 'hr_manager', 'branch_manager'];

export async function getBranchById(req, res, next) {
  try {
    const { id } = req.params;

    assertBranchManagerScope(req.user, id, 'view details for this branch');

    const branch = await prisma.branch.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
      include: {
        teams: {
          include: {
            projects: { where: { deletedAt: null } },
          },
        },
        company: { select: { id: true, legalName: true } },
      },
    });

    if (!branch) {
      throw new NotFoundError(`Branch with ID ${id} not found in this company`);
    }

    let [enriched] = await enrichBranchesWithManagers([branch], req.user.companyId);

    // R5: other roles get project rows only for the teams they belong to.
    if (!BRANCH_DETAIL_ROLES.includes(req.user.role)) {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: req.user.id, teamId: { in: enriched.teams.map((t) => t.id) } },
        select: { teamId: true },
      });
      const mine = new Set(memberships.map((m) => m.teamId));
      enriched = {
        ...enriched,
        teams: enriched.teams.map((t) => {
          if (mine.has(t.id)) return t;
          const { projects, ...rest } = t;
          return rest;
        }),
      };
    }

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Sets (or clears, when managerUserId is empty) the Branch Manager of a branch.
 * Same rules as role assignments (SEC-M5-01 / SEC-M5-08, D-S1, D-S3, D-S9):
 * - the manager must be an active user of the caller's company;
 * - nobody can make themselves Branch Manager or remove their own Branch Manager role;
 * - only Branch Manager rows of this branch are touched, and they are soft-revoked, never
 *   rewritten in place or deleted.
 * Takes the company row lock first, so two concurrent changes cannot both leave a manager.
 * Returns the rows it revoked and granted, for the caller to audit after the transaction commits.
 */
async function setBranchManager(tx, req, branchId, managerUserId) {
  const companyId = req.user.companyId;
  const none = { revoked: [], granted: null, roleLabel: null };
  await tx.$queryRaw`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`;
  const bmRole = await tx.role.findFirst({
    where: {
      companyId,
      isSystem: true,
      OR: [{ roleTemplate: { slug: 'branch_manager' } }, { name: 'branch_manager' }],
    },
    ...ROLE_WITH_TEMPLATE,
  });
  if (!bmRole) return none;

  const newManagerId = managerUserId ? String(managerUserId) : null;
  if (newManagerId) {
    // D2: naming a Branch Manager is a grant. HR (below branch_manager) cannot do it here either,
    // or it could create an account and make it a Branch Manager with powers HR lacks.
    assertGrantBelowCaller(req, bmRole);
    if (newManagerId === req.user.id) {
      throw new ForbiddenError('You cannot make yourself the Branch Manager');
    }
    const manager = await tx.user.findFirst({
      where: { id: newManagerId, companyId, isActive: true },
      select: { id: true },
    });
    if (!manager) {
      throw new BadRequestError('The selected Branch Manager is not an active user of this company');
    }
  }

  const current = await tx.roleAssignment.findMany({
    where: { user: { companyId }, roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId, revokedAt: null },
  });
  if (newManagerId && current.length === 1 && current[0].userId === newManagerId) {
    return none; // unchanged
  }
  if (current.some((ra) => ra.userId === req.user.id)) {
    throw new ForbiddenError('You cannot remove your own Branch Manager role');
  }
  // D1: the outgoing managers' holder rule, same as /role-assignments and /users.
  await assertMayRevokeFromHolders(req, current.filter((ra) => ra.userId !== newManagerId).map((ra) => ra.userId), tx);

  if (current.length) {
    await tx.roleAssignment.updateMany({
      where: { id: { in: current.map((ra) => ra.id) } },
      data: { revokedAt: new Date() },
    });
  }
  let granted = null;
  if (newManagerId) {
    granted = await tx.roleAssignment.create({
      data: { companyId, userId: newManagerId, roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId, grantedById: req.user.id },
    });
  }
  return { revoked: current, granted, roleId: bmRole.id, roleLabel: bmRole.label };
}

/** One PERMISSION_CHANGE audit row per Branch Manager row revoked or granted by setBranchManager. */
async function auditBranchManagerChange(req, branchId, { revoked, granted, roleId, roleLabel }) {
  // Same payload shape as the role-assignments audit rows.
  const scope = (userId) => ({ userId, roleId, roleLabel, scopeType: 'Branch', scopeId: branchId });
  const entries = [
    ...revoked.map((ra) => ({ targetUserId: ra.userId, oldValue: { event: 'ROLE_REVOKED', ...scope(ra.userId) } })),
    ...(granted ? [{ targetUserId: granted.userId, newValue: { event: 'ROLE_ASSIGNED', ...scope(granted.userId) } }] : []),
  ];
  for (const entry of entries) {
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        branchId,
        action: AUDIT_ACTIONS.PERMISSION_CHANGE,
        performedById: req.user.id,
        ...entry,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during Branch Manager change:', auditErr.message);
    }
  }
}

/** Soft-revokes every active Branch-scoped grant of a branch being deleted and returns the rows (R13). */
async function revokeBranchScopedAssignments(tx, req, branchId) {
  const rows = await tx.roleAssignment.findMany({
    where: { user: { companyId: req.user.companyId }, scopeType: 'Branch', scopeId: branchId, revokedAt: null },
    include: { role: { select: { id: true, label: true } } },
  });
  if (rows.length) {
    // revokedAt: null again, so a row revoked concurrently keeps its own timestamp and audit.
    await tx.roleAssignment.updateMany({ where: { id: { in: rows.map((r) => r.id) }, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  return rows;
}

/**
 * One PERMISSION_CHANGE ROLE_REVOKED row per grant revoked by a branch deletion, after commit.
 * No branchId on the row: the branch no longer exists.
 */
async function auditBranchScopedRevokes(req, rows) {
  for (const ra of rows) {
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        targetUserId: ra.userId,
        action: AUDIT_ACTIONS.PERMISSION_CHANGE,
        performedById: req.user.id,
        oldValue: { event: 'ROLE_REVOKED', userId: ra.userId, roleId: ra.roleId, roleLabel: ra.role?.label, scopeType: 'Branch', scopeId: ra.scopeId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch deletion revoke:', auditErr.message);
    }
  }
}

/** R10: a field that is present must be a string, so malformed bodies get a 400, not a 500. */
function assertStringFields(body, fields) {
  const errors = fields
    .filter((f) => body[f] !== undefined && body[f] !== null && typeof body[f] !== 'string')
    .map((f) => ({ field: f, message: `${f} must be a string` }));
  if (errors.length) throw new ValidationError('Invalid field types', errors);
}

export async function createBranch(req, res, next) {
  try {
    const body = req.body || {};
    assertStringFields(body, ['name', 'code', 'managerUserId', 'managerId']);
    const name = (body.name || '').trim();
    const code = (body.code || '').trim() || null;

    validateRequired({ name }, ['name']);

    const managerUserId = body.managerUserId || body.managerId;
    // Branch and its manager are written together, so an invalid manager leaves no orphan branch.
    // The company lock is taken before the insert: the insert's foreign-key lock on the company row
    // would otherwise deadlock with setBranchManager's lock when two creates run at once.
    const { branch, managerChange } = await withCompanyLock(req.user.companyId, async (tx) => {
      // Counted under the company lock, so parallel creates cannot all pass the plan limit.
      await assertWithinPlanLimit(req.user.companyId, 'branches', { client: tx });
      const created = await tx.branch.create({
        data: {
          name,
          code,
          companyId: req.user.companyId,
        },
      });
      const change = managerUserId ? await setBranchManager(tx, req, created.id, managerUserId) : null;
      return { branch: created, managerChange: change };
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        branchId: branch.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { name: branch.name, code: branch.code },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch creation:', auditErr.message);
    }
    if (managerChange) await auditBranchManagerChange(req, branch.id, managerChange);

    const fullBranch = await prisma.branch.findUnique({ where: { id: branch.id }, include: BRANCH_LIST_INCLUDE });
    const [enriched] = await enrichBranchesWithManagers([fullBranch], req.user.companyId);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBranch(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    assertStringFields(body, ['name', 'code', 'managerUserId', 'managerId']);
    const name = (body.name || '').trim();

    validateRequired({ name }, ['name']);

    const existing = await prisma.branch.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Branch with ID ${id} not found in this company`);
    }

    const updateData = { name };
    if (body.code !== undefined) {
      updateData.code = body.code ? String(body.code).trim() : null;
    }

    const managerUserId = body.managerUserId !== undefined ? body.managerUserId : body.managerId;
    const { updated, managerChange } = await prisma.$transaction(async (tx) => {
      const change = managerUserId !== undefined ? await setBranchManager(tx, req, id, managerUserId) : null;
      const row = await tx.branch.update({
        where: { id },
        data: updateData,
        include: BRANCH_LIST_INCLUDE,
      });
      return { updated: row, managerChange: change };
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        branchId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { name: existing.name, code: existing.code },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch update:', auditErr.message);
    }
    if (managerChange) await auditBranchManagerChange(req, id, managerChange);

    const [enrichedUpdated] = await enrichBranchesWithManagers([updated], req.user.companyId);

    res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: enrichedUpdated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBranch(req, res, next) {
  try {
    const { id } = req.params;
    const reassignBranchId = req.body?.reassignBranchId || req.query?.reassignBranchId;

    const existing = await prisma.branch.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Branch with ID ${id} not found in this company`);
    }
    let revokedRows = [];

    const teamsCount = await prisma.team.count({
      where: { branchId: id },
    });

    if (teamsCount > 0) {
      if (!reassignBranchId) {
        throw new ConflictError(
          `Cannot delete branch: ${teamsCount} team(s) are currently assigned. Specify a destination branch (reassignBranchId) to migrate teams before deletion.`
        );
      }

      if (reassignBranchId === id) {
        throw new BadRequestError('Cannot reassign teams to the same branch being deleted');
      }

      const targetBranch = await prisma.branch.findFirst({
        where: { id: String(reassignBranchId), companyId: req.user.companyId },
      });

      if (!targetBranch) {
        throw new NotFoundError(`Target migration branch with ID ${reassignBranchId} not found in this company`);
      }

      await prisma.$transaction(async (tx) => {
        // Fetch existing team names in target branch to avoid @@unique([branchId, name]) collisions
        const existingTargetTeams = await tx.team.findMany({
          where: { branchId: targetBranch.id },
          select: { name: true },
        });
        const targetTeamNames = new Set(existingTargetTeams.map((t) => t.name.toLowerCase()));

        const teamsToMigrate = await tx.team.findMany({
          where: { branchId: id },
        });

        for (const team of teamsToMigrate) {
          let newName = team.name;
          if (targetTeamNames.has(team.name.toLowerCase())) {
            newName = `${team.name} (${existing.code || existing.name})`;
          }
          await tx.team.update({
            where: { id: team.id },
            data: {
              branchId: targetBranch.id,
              name: newName,
            },
          });
        }

        // Revoke any branch manager assignments for this decommissioned branch
        revokedRows = await revokeBranchScopedAssignments(tx, req, id);

        // Nullify branchId on historical systemAuditLogs so deleting branch doesn't hit FK constraint
        await tx.systemAuditLog.updateMany({
          where: { branchId: id },
          data: { branchId: null },
        });

        // Delete the now empty branch
        await tx.branch.delete({
          where: { id },
        });
      });

      await auditBranchScopedRevokes(req, revokedRows);

      // Record audit log
      try {
        await createSystemAuditLog({
          companyId: req.user.companyId,
          action: AUDIT_ACTIONS.DELETE,
          performedById: req.user.id,
          oldValue: { name: existing.name, code: existing.code, teamsMigrated: teamsCount },
          newValue: { migratedToBranchId: targetBranch.id, migratedToBranchName: targetBranch.name },
        });
      } catch (auditErr) {
        console.warn('[AuditLog] Notice: Audit record logging during branch deletion:', auditErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Branch "${existing.name}" decommissioned successfully. ${teamsCount} team(s) migrated to "${targetBranch.name}".`,
      });
    }

    // teamsCount === 0: Clean decommission
    await prisma.$transaction(async (tx) => {
      // Revoke any branch manager assignments for this branch
      revokedRows = await revokeBranchScopedAssignments(tx, req, id);

      // Nullify branchId on historical systemAuditLogs
      await tx.systemAuditLog.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      await tx.branch.delete({
        where: { id },
      });
    });

    await auditBranchScopedRevokes(req, revokedRows);

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { name: existing.name, code: existing.code },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch deletion:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Branch "${existing.name}" deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
}

