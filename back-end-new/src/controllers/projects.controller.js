import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { normalizeRole, ROLES } from '../utils/roles.js';
import {
  buildProjectListWhere,
  buildTaskListWhere,
  buildSubtaskListWhere,
  assertBranchManagerScope,
  isBranchManager,
} from '../utils/tenantScope.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

async function getProjectListWhere(req, branchId) {
  const role = normalizeRole(req.user.role || req.user.roleLabel);
  let assignedProjectIds = [];

  if (role === 'project_manager' || role === 'pm') {
    const assignments = await prisma.roleAssignment.findMany({
      where: {
        userId: req.user.id,
        companyId: req.user.companyId,
        revokedAt: null,
        scopeType: 'Project',
        role: {
          OR: [
            { label: ROLES.PROJECT_MANAGER },
            { name: 'project_manager' },
            { roleTemplate: { slug: 'project_manager' } },
          ],
        },
      },
      select: { scopeId: true },
    });
    assignedProjectIds = assignments.map(({ scopeId }) => scopeId);
  }

  return buildProjectListWhere({
    companyId: req.user.companyId,
    branchId,
    user: req.user,
    assignedProjectIds,
  });
}


async function enrichProjectsWithManagers(projects, companyId) {
  if (!projects || projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);
  const teamIds = projects.map((p) => p.teamId).filter(Boolean);
  const creatorIds = projects.map((p) => p.createdById).filter(Boolean);

  // 1. Project-level and Team-level PM role assignments
  const pmAssignments = await prisma.roleAssignment.findMany({
    where: {
      companyId,
      revokedAt: null,
      OR: [
        { scopeType: 'Project', scopeId: { in: projectIds } },
        { scopeType: 'Team', scopeId: { in: teamIds } },
      ],
      role: {
        OR: [
          { label: ROLES.PROJECT_MANAGER },
          { name: 'project_manager' },
          { roleTemplate: { slug: 'project_manager' } },
        ],
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, jobTitle: true },
      },
    },
  });

  const projectAssignmentMap = new Map();
  const teamAssignmentMap = new Map();
  for (const a of pmAssignments) {
    if (a.scopeType === 'Project' && !projectAssignmentMap.has(a.scopeId)) {
      projectAssignmentMap.set(a.scopeId, a.user);
    } else if (a.scopeType === 'Team' && !teamAssignmentMap.has(a.scopeId)) {
      teamAssignmentMap.set(a.scopeId, a.user);
    }
  }

  // 2. Fetch creators if needed
  const creators = creatorIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: creatorIds }, companyId },
    select: {
      id: true,
      fullName: true,
      email: true,
      jobTitle: true,
      roleAssignments: {
        where: { revokedAt: null },
        include: { role: true },
      },
    },
  }) : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c]));

  // 3. Fetch company-wide PMs as fallback
  const companyPms = await prisma.roleAssignment.findMany({
    where: {
      companyId,
      revokedAt: null,
      scopeType: 'Company',
      role: {
        OR: [
          { label: ROLES.PROJECT_MANAGER },
          { name: 'project_manager' },
          { roleTemplate: { slug: 'project_manager' } },
        ],
      },
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, jobTitle: true },
      },
    },
  });
  const defaultCompanyPm = companyPms[0]?.user || null;

  // 4. Fetch team members to check explicit PM role or Team Lead's overseeing manager
  const allTeamMemberUserIds = projects.flatMap(
    (p) => p.team?.teamMembers?.map((m) => m.userId) || []
  );
  const teamUsers = allTeamMemberUserIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: allTeamMemberUserIds } },
    select: {
      id: true,
      fullName: true,
      email: true,
      jobTitle: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
          jobTitle: true,
          roleAssignments: {
            where: { revokedAt: null },
            include: { role: true },
          },
        },
      },
      roleAssignments: {
        where: { revokedAt: null },
        include: { role: true },
      },
    },
  }) : [];
  const teamUserMap = new Map(teamUsers.map((u) => [u.id, u]));

  return projects.map((p) => {
    // 1. Direct project-scoped or team-scoped PM assignment
    let pm = projectAssignmentMap.get(p.id) || teamAssignmentMap.get(p.teamId);

    // 2. Check if any team member explicitly holds the Project Manager role (strictly NOT Team Lead)
    if (!pm && p.team?.teamMembers) {
      const pmMember = p.team.teamMembers.find((m) => {
        const u = teamUserMap.get(m.userId);
        const hasPmRole = u?.roleAssignments?.some(
          (ra) =>
            normalizeRole(ra.role?.label) === 'project_manager' ||
            ra.role?.name === 'project_manager'
        );
        const isPmTitle = (u?.jobTitle || '').toLowerCase().includes('project manager');
        return (m.role === 'Project Manager' || hasPmRole || isPmTitle) && m.role !== 'Lead';
      });
      if (pmMember?.user) {
        pm = pmMember.user;
      }
    }

    // 3. If squad has a Team Lead, resolve the Team Lead's reporting manager (the overseeing Project Manager)
    if (!pm && p.team?.teamMembers) {
      for (const m of p.team.teamMembers) {
        const u = teamUserMap.get(m.userId);
        const isLead =
          m.role === 'Lead' ||
          u?.roleAssignments?.some(
            (ra) =>
              normalizeRole(ra.role?.label) === 'team_lead' ||
              ra.role?.name === 'team_lead'
          );
        if (isLead && u?.manager) {
          const managerIsPm = u.manager.roleAssignments?.some(
            (ra) =>
              normalizeRole(ra.role?.label) === 'project_manager' ||
              ra.role?.name === 'project_manager'
          );
          if (managerIsPm) {
            pm = {
              id: u.manager.id,
              fullName: u.manager.fullName,
              email: u.manager.email,
              jobTitle: u.manager.jobTitle || 'Project Manager',
            };
            break;
          }
        }
      }
    }

    // 4. If creator was a PM, use creator
    if (!pm && p.createdById && creatorMap.has(p.createdById)) {
      const creator = creatorMap.get(p.createdById);
      const isPm = creator.roleAssignments?.some(
        (ra) =>
          normalizeRole(ra.role?.label) === 'project_manager' ||
          ra.role?.name === 'project_manager'
      );
      if (isPm) {
        pm = {
          id: creator.id,
          fullName: creator.fullName,
          email: creator.email,
          jobTitle: creator.jobTitle || 'Project Manager',
        };
      }
    }

    // 5. Default company-wide PM fallback if none found
    if (!pm && defaultCompanyPm) {
      pm = defaultCompanyPm;
    }

    const creatorUser = p.createdById && creatorMap.has(p.createdById) ? {
      id: creatorMap.get(p.createdById).id,
      fullName: creatorMap.get(p.createdById).fullName,
      email: creatorMap.get(p.createdById).email,
    } : null;

    return {
      ...p,
      projectManager: pm
        ? {
            id: pm.id,
            fullName: pm.fullName,
            email: pm.email,
            jobTitle: pm.jobTitle || 'Project Manager',
          }
        : null,
      creator: creatorUser,
    };
  });
}

/**
 * GET /projects & GET /api/projects
 * Lists projects with tenant scoping and branch filtering.
 */
export async function listProjects(req, res, next) {
  try {
    const where = await getProjectListWhere(req, req.query.branchId);

    const projects = await prisma.project.findMany({
      where,
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
            teamMembers: {
              select: {
                id: true,
                userId: true,
                role: true,
                user: { select: { id: true, fullName: true, email: true, jobTitle: true } },
              },
            },
          },
        },
        tasks: {
          where: buildTaskListWhere({
            companyId: req.user.companyId,
            user: req.user,
          }),
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

    const enriched = await enrichProjectsWithManagers(projects, req.user.companyId);

    res.status(200).json({
      success: true,
      data: enriched,
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
        ...await getProjectListWhere(req),
        id,
      },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
            teamMembers: {
              select: {
                id: true,
                userId: true,
                role: true,
                user: { select: { id: true, fullName: true, email: true, jobTitle: true } },
              },
            },
          },
        },
        tasks: {
          where: buildTaskListWhere({
            companyId: req.user.companyId,
            user: req.user,
          }),
          include: {
            subtasks: {
              where: buildSubtaskListWhere({
                companyId: req.user.companyId,
                user: req.user,
              }),
            },
            assignedTo: { select: { id: true, fullName: true, email: true } },
            escalations: true,
          },
        },
        processInstances: {
          include: {
            template: true,
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

    const [enriched] = await enrichProjectsWithManagers([project], req.user.companyId);

    res.status(200).json({
      success: true,
      data: enriched,
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
    const targetDate = body.targetDate || body.target_date || body.endDate || body.end_date || null;

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
        companyId: req.user.companyId,
        teamId,
        name,
        description: body.description ? String(body.description).trim() : null,
        status,
        startDate: startDate ? new Date(startDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        createdById: req.user.id,
      },
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
            teamMembers: {
              select: {
                id: true,
                userId: true,
                role: true,
                user: { select: { id: true, fullName: true, email: true, jobTitle: true } },
              },
            },
          },
        },
      },
    });

    const pmId = body.projectManagerId || body.managerId || body.pmId;
    if (pmId) {
      const pmRole = await prisma.role.findFirst({
        where: {
          companyId: req.user.companyId,
          OR: [
            { label: ROLES.PROJECT_MANAGER },
            { name: 'project_manager' },
            { roleTemplate: { slug: 'project_manager' } },
          ],
        },
      });
      if (pmRole) {
        await prisma.roleAssignment.create({
          data: {
            companyId: req.user.companyId,
            userId: String(pmId),
            roleId: pmRole.id,
            scopeType: 'Project',
            scopeId: newProject.id,
            grantedById: req.user.id,
          },
        });
      }
    }

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

    const [enrichedProject] = await enrichProjectsWithManagers([newProject], req.user.companyId);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: enrichedProject,
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
    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }
    if (body.status) {
      updateData.status = String(body.status).trim();
    }
    if (body.startDate !== undefined || body.start_date !== undefined) {
      const val = body.startDate !== undefined ? body.startDate : body.start_date;
      updateData.startDate = val ? new Date(val) : null;
    }
    if (body.targetDate !== undefined || body.target_date !== undefined || body.endDate !== undefined || body.end_date !== undefined) {
      const val = body.targetDate ?? body.target_date ?? body.endDate ?? body.end_date;
      updateData.targetDate = val ? new Date(val) : null;
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

    const pmId = body.projectManagerId || body.managerId || body.pmId;
    if (pmId) {
      const pmRole = await prisma.role.findFirst({
        where: {
          companyId: req.user.companyId,
          OR: [
            { label: ROLES.PROJECT_MANAGER },
            { name: 'project_manager' },
            { roleTemplate: { slug: 'project_manager' } },
          ],
        },
      });
      if (pmRole) {
        const existingPmAssignment = await prisma.roleAssignment.findFirst({
          where: {
            companyId: req.user.companyId,
            scopeType: 'Project',
            scopeId: id,
            revokedAt: null,
          },
        });
        if (existingPmAssignment) {
          await prisma.roleAssignment.update({
            where: { id: existingPmAssignment.id },
            data: { userId: String(pmId), roleId: pmRole.id },
          });
        } else {
          await prisma.roleAssignment.create({
            data: {
              companyId: req.user.companyId,
              userId: String(pmId),
              roleId: pmRole.id,
              scopeType: 'Project',
              scopeId: id,
              grantedById: req.user.id,
            },
          });
        }
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          include: {
            branch: { select: { id: true, name: true, companyId: true } },
            teamMembers: {
              select: {
                id: true,
                userId: true,
                role: true,
                user: { select: { id: true, fullName: true, email: true, jobTitle: true } },
              },
            },
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

    const [enrichedUpdated] = await enrichProjectsWithManagers([updated], req.user.companyId);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: enrichedUpdated,
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
