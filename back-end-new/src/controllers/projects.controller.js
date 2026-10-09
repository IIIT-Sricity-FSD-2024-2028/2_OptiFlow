import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { ROLES } from '../utils/roles.js';
import {
  buildProjectListWhere,
  assertBranchManagerScope,
  isBranchManager,
} from '../utils/tenantScope.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


/**
 * GET /projects & GET /api/projects
 * Lists projects with tenant scoping and branch filtering.
 */
export async function listProjects(req, res, next) {
  try {
    const where = buildProjectListWhere({
      companyId: req.user.companyId,
      branchId: req.query.branchId,
      user: req.user,
    });

    const projects = await prisma.project.findMany({
      where,
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            estimatedHours: true,
            actualHours: true,
          },
        },
        escalations: {
          where: { status: 'Open' },
        },
      },
      orderBy: { id: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /projects/:id & GET /api/projects/:id
 * Retrieves a single project within the caller's company.
 */
export async function getProjectById(req, res, next) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        team: { branch: { companyId: req.user.companyId } },
      },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            subtasks: { where: { deletedAt: null } },
            assignedTo: { select: { id: true, fullName: true, email: true } },
            escalations: true,
          },
        },
        processInstances: {
          include: {
            template: true,
            currentStep: true,
          },
        },
        escalations: true,
      },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, project.team?.branchId, 'view this project');
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /projects & POST /api/projects
 * Creates a project under a verified company team.
 */
export async function createProject(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || body.project_name || '').trim();
    const teamId = (body.teamId || body.team_id || '').trim();
    const status = body.status || 'Active';
    const startDate = body.startDate || body.start_date || null;
    const endDate = body.endDate || body.end_date || null;

    validateRequired({ name, teamId }, ['name', 'teamId']);

    const team = await prisma.team.findFirst({
      where: { id: teamId, branch: { companyId: req.user.companyId } },
      include: { branch: true },
    });

    if (!team) {
      throw new NotFoundError(`Team with ID ${teamId} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, team.branchId, 'create projects in');
    }

    const newProject = await prisma.project.create({
      data: {
        teamId,
        name,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdById: req.user.id,
      },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
      },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        projectId: newProject.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { name: newProject.name, teamId: newProject.teamId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during project creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: newProject,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /projects/:id & PATCH /api/projects/:id
 * Updates permitted project fields.
 */
export async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.project.findFirst({
      where: { id, team: { branch: { companyId: req.user.companyId } } },
      include: { team: true },
    });

    if (!existing) {
      throw new NotFoundError(`Project with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, existing.team.branchId, 'modify projects in');
    }

    const updateData = {};
    if (body.name || body.project_name) {
      updateData.name = String(body.name || body.project_name).trim();
    }
    if (body.status) {
      updateData.status = String(body.status).trim();
    }
    if (body.startDate !== undefined || body.start_date !== undefined) {
      const val = body.startDate !== undefined ? body.startDate : body.start_date;
      updateData.startDate = val ? new Date(val) : null;
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      const val = body.endDate !== undefined ? body.endDate : body.end_date;
      updateData.endDate = val ? new Date(val) : null;
    }

    const targetTeamId = body.teamId || body.team_id;
    if (targetTeamId && targetTeamId !== existing.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: targetTeamId, branch: { companyId: req.user.companyId } },
        include: { branch: true },
      });
      if (!team) {
        throw new NotFoundError(`Target team with ID ${targetTeamId} not found in this company`);
      }
      if (isBranchManager(req.user)) {
        assertBranchManagerScope(req.user, team.branchId, 'move projects into');
      }
      updateData.teamId = targetTeamId;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
          },
        },
      },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        projectId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: { name: existing.name, status: existing.status },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during project update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /projects/:id & DELETE /api/projects/:id
 * Deletes a project.
 */
export async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.project.findFirst({
      where: { id, team: { branch: { companyId: req.user.companyId } } },
      include: { team: true },
    });

    if (!existing) {
      throw new NotFoundError(`Project with ID ${id} not found in this company`);
    }

    if (isBranchManager(req.user)) {
      assertBranchManagerScope(req.user, existing.team.branchId, 'delete projects in');
    }

    await prisma.project.delete({
      where: { id },
    });

    // Record audit log
    try {
      await createProcessAuditLog({companyId: req.user.companyId,
        projectId: id,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { name: existing.name },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during project deletion:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

