import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { resolveEffectiveBranchId, isBranchManager, assertBranchManagerScope } from '../utils/tenantScope.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listTeams(req, res, next) {
  try {
    const effectiveBranchId = resolveEffectiveBranchId({
      user: req.user,
      branchId: req.query.branchId,
    });

    const where = {
      branch: {
        companyId: req.user.companyId,
        ...(effectiveBranchId ? { id: effectiveBranchId } : {}),
      },
    };

    const teams = await prisma.team.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
        projects: { select: { id: true, name: true, status: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTeamById(req, res, next) {
  try {
    const { id } = req.params;

    const team = await prisma.team.findFirst({
      where: {
        id,
        branch: { companyId: req.user.companyId },
      },
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
        projects: {
          include: {
            tasks: { where: { deletedAt: null }, select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundError(`Team with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, team.branchId, 'view details for this team');
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || body.team_name || '').trim();
    const branchId = (body.branchId || body.branch_id || '').trim();

    validateRequired({ name, branchId }, ['name', 'branchId']);

    // Verify branch belongs to caller's company
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, companyId: req.user.companyId },
    });

    if (!branch) {
      throw new BadRequestError('The specified branch does not exist in this company');
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, branchId, 'create teams in this branch');
    }

    const team = await prisma.team.create({
      data: {
        name,
        branchId,
      },
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        teamId: team.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { name: team.name, branchId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during team creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.team.findFirst({
      where: { id, branch: { companyId: req.user.companyId } },
    });

    if (!existing) {
      throw new NotFoundError(`Team with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, existing.branchId, 'modify this team');
    }

    const updateData = {};
    if (body.name || body.team_name) {
      updateData.name = String(body.name || body.team_name).trim();
    }

    const newBranchId = body.branchId || body.branch_id;
    if (newBranchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: newBranchId, companyId: req.user.companyId },
      });
      if (!branch) {
        throw new BadRequestError('The target branch does not exist in this company');
      }

      if (isBranchManager(req.user)) {
        assertBranchManagerScope(req.user, newBranchId, 'reassign teams to this branch');
      }

      updateData.branchId = newBranchId;
    }

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        teamId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { name: existing.name, branchId: existing.branchId },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during team update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.team.findFirst({
      where: { id, branch: { companyId: req.user.companyId } },
    });

    if (!existing) {
      throw new NotFoundError(`Team with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, existing.branchId, 'delete this team');
    }

    const projectsCount = await prisma.project.count({
      where: { teamId: id },
    });

    if (projectsCount > 0) {
      throw new ConflictError(`Cannot delete team: ${projectsCount} project(s) are currently assigned to this team`);
    }

    await prisma.team.delete({
      where: { id },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        teamId: id,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { name: existing.name },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during team deletion:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

