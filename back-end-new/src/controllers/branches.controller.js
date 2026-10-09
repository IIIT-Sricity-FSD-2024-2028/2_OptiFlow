import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { resolveEffectiveBranchId, isBranchManager, assertBranchManagerScope } from '../utils/tenantScope.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

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

    res.status(200).json({
      success: true,
      data: branches,
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

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (err) {
    next(err);
  }
}

export async function createBranch(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();

    validateRequired({ name }, ['name']);

    const branch = await prisma.branch.create({
      data: {
        name,
        companyId: req.user.companyId,
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        branchId: branch.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { name: branch.name },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch,
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

    const updated = await prisma.branch.update({
      where: { id },
      data: { name },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        branchId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { name: existing.name },
        newValue: { name: updated.name },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteBranch(req, res, next) {
  try {
    const { id } = req.params;

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
      throw new ConflictError(`Cannot delete branch: ${teamsCount} team(s) are currently assigned to this branch`);
    }

    await prisma.branch.delete({
      where: { id },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        branchId: id,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { name: existing.name },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during branch deletion:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

