import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';
import { resolveEffectiveBranchId, isBranchManager, assertBranchManagerScope } from '../utils/tenantScope.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

async function enrichBranchesWithManagers(branches, companyId) {
  if (!branches || branches.length === 0) return branches;

  const branchIds = branches.map((b) => b.id);
  const managerAssignments = await prisma.roleAssignment.findMany({
    where: {
      companyId,
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
      include: {
        teams: {
          include: {
            _count: { select: { projects: true } },
          },
        },
        company: { select: { id: true, legalName: true } },
      },
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
            projects: true,
          },
        },
        company: { select: { id: true, legalName: true } },
      },
    });

    if (!branch) {
      throw new NotFoundError(`Branch with ID ${id} not found in this company`);
    }

    const [enriched] = await enrichBranchesWithManagers([branch], req.user.companyId);

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

export async function createBranch(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const code = (body.code || '').trim() || null;

    validateRequired({ name }, ['name']);

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        companyId: req.user.companyId,
      },
    });

    const managerUserId = body.managerUserId || body.managerId;
    if (managerUserId) {
      const bmRole = await prisma.role.findFirst({
        where: {
          companyId: req.user.companyId,
          OR: [
            { label: ROLES.BRANCH_MANAGER },
            { name: 'branch_manager' },
            { roleTemplate: { slug: 'branch_manager' } },
          ],
        },
      });
      if (bmRole) {
        await prisma.roleAssignment.create({
          data: {
            companyId: req.user.companyId,
            userId: String(managerUserId),
            roleId: bmRole.id,
            scopeType: 'Branch',
            scopeId: branch.id,
            grantedById: req.user.id,
          },
        });
      }
    }

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

    const [enriched] = await enrichBranchesWithManagers([branch], req.user.companyId);

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

    const managerUserId = body.managerUserId || body.managerId;
    if (managerUserId !== undefined) {
      const bmRole = await prisma.role.findFirst({
        where: {
          companyId: req.user.companyId,
          OR: [
            { label: ROLES.BRANCH_MANAGER },
            { name: 'branch_manager' },
            { roleTemplate: { slug: 'branch_manager' } },
          ],
        },
      });
      if (bmRole) {
        const existingBmAssignment = await prisma.roleAssignment.findFirst({
          where: {
            companyId: req.user.companyId,
            scopeType: 'Branch',
            scopeId: id,
            revokedAt: null,
          },
        });
        if (managerUserId) {
          if (existingBmAssignment) {
            await prisma.roleAssignment.update({
              where: { id: existingBmAssignment.id },
              data: { userId: String(managerUserId), roleId: bmRole.id },
            });
          } else {
            await prisma.roleAssignment.create({
              data: {
                companyId: req.user.companyId,
                userId: String(managerUserId),
                roleId: bmRole.id,
                scopeType: 'Branch',
                scopeId: id,
                grantedById: req.user.id,
              },
            });
          }
        } else if (existingBmAssignment) {
          await prisma.roleAssignment.delete({
            where: { id: existingBmAssignment.id },
          });
        }
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: updateData,
      include: {
        teams: {
          include: {
            _count: { select: { projects: true } },
          },
        },
        company: { select: { id: true, legalName: true } },
      },
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
        await tx.roleAssignment.updateMany({
          where: {
            companyId: req.user.companyId,
            scopeType: 'Branch',
            scopeId: id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

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
      await tx.roleAssignment.updateMany({
        where: {
          companyId: req.user.companyId,
          scopeType: 'Branch',
          scopeId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // Nullify branchId on historical systemAuditLogs
      await tx.systemAuditLog.updateMany({
        where: { branchId: id },
        data: { branchId: null },
      });

      await tx.branch.delete({
        where: { id },
      });
    });

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

