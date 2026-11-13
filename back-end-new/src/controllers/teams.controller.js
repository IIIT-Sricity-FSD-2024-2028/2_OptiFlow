import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { resolveEffectiveBranchId, isBranchManager, assertBranchManagerScope } from '../utils/tenantScope.js';
import { validateRequired } from '../utils/validation.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

/** Include shared by list, create and update so every response has the same shape. */
const TEAM_LIST_INCLUDE = {
  branch: { select: { id: true, name: true, companyId: true } },
  projects: { select: { id: true, name: true, status: true } },
  teamMembers: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          jobTitle: true,
          isActive: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  },
};

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
      include: TEAM_LIST_INCLUDE,
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
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                jobTitle: true,
                isActive: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
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
        companyId: req.user.companyId,
        name,
        branchId,
      },
      include: TEAM_LIST_INCLUDE,
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
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

    // Pre-check for unique constraint @@unique([branchId, name]) to prevent P2002 crash (RAT-03)
    const effectiveBranchId = updateData.branchId || existing.branchId;
    const effectiveName = updateData.name || existing.name;
    if (updateData.name || updateData.branchId) {
      const duplicate = await prisma.team.findFirst({
        where: {
          branchId: effectiveBranchId,
          name: effectiveName,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new ConflictError(
          `A team named "${effectiveName}" already exists in the destination branch`
        );
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
      include: TEAM_LIST_INCLUDE,
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
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

    // Wrap deletion in transaction to nullify foreign key references in SystemAuditLog (RAT-02)
    await prisma.$transaction(async (tx) => {
      await tx.systemAuditLog.updateMany({
        where: { teamId: id },
        data: { teamId: null },
      });

      await tx.teamMember.deleteMany({
        where: { teamId: id },
      });

      await tx.team.delete({
        where: { id },
      });
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        newValue: { deletedTeamName: existing.name, branchId: existing.branchId },
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

// ---------------------------------------------------------------------------
// Team members (SEC-M5-11 / 12 / 16)
// ---------------------------------------------------------------------------

/** The only team roles, stored in this spelling (SEC-M5-11, PRE-M5-05). */
const TEAM_ROLES = ['Member', 'Lead'];
/**
 * Spellings of the Lead role found in existing data. Every Lead check matches all of them, so
 * old rows keep working; new writes always store 'Lead'.
 */
const LEAD_ROLES = ['Lead', 'Leader'];
const isLeadRole = (role) => LEAD_ROLES.includes(role);
// Accepted input spellings: Lead, Leader, Team Lead, Team Leader, team_lead (any case).
const LEAD_INPUT = /^(team[\s_-]?)?lead(er)?$/i;
const MEMBER_INPUT = /^(team[\s_-]?)?member$/i;
const OPEN_TASK_STATUSES_EXCLUDED = ['Completed', 'Cancelled'];
// Same user fields as the team list/get include, so add/update return the list shape (BD11).
const MEMBER_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true, jobTitle: true, isActive: true } },
};

/**
 * Runs fn(tx) holding a row lock on the team, so Lead checks and changes for one team are
 * serialised: two concurrent handovers or Lead adds cannot both commit (SEC-M5-12).
 */
async function withTeamLock(teamId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM teams WHERE id = ${teamId} FOR UPDATE`;
    return fn(tx);
  });
}

function parseTeamRole(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestError(`role is required: one of ${TEAM_ROLES.join(', ')}`);
    return 'Member';
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (LEAD_INPUT.test(text)) return 'Lead';
  if (MEMBER_INPUT.test(text)) return 'Member';
  throw new BadRequestError(`role must be one of: ${TEAM_ROLES.join(', ')}`);
}

async function findCompanyTeam(req, id) {
  const team = await prisma.team.findFirst({
    where: { id, branch: { companyId: req.user.companyId } },
  });
  if (!team) throw new NotFoundError(`Team with ID ${id} not found in this company`);
  return team;
}

/**
 * Who may change a team's membership:
 * - Owner, System Admin, HR: any team of the company.
 * - Branch Manager: teams of their branch.
 * - Team Leader: only a team they lead.
 * - Project Manager: only teams that carry a project they were assigned (by someone else) to manage.
 */
async function assertMayManageMembers(req, team) {
  const { role, id: callerId } = req.user;
  if (['company_owner', 'system_admin', 'hr_manager'].includes(role)) return;

  if (role === 'branch_manager') {
    assertBranchManagerScope(req.user, team.branchId, 'manage members of this team');
    return;
  }

  if (role === 'team_leader') {
    const leads = await prisma.teamMember.findFirst({
      where: { teamId: team.id, userId: callerId, role: { in: LEAD_ROLES } },
      select: { id: true },
    });
    if (!leads) throw new ForbiddenError('Team Leaders can only manage members of a team they lead');
    return;
  }

  if (role === 'project_manager') {
    // Only a Project Manager assignment granted by someone else counts (SEC-M5-16). Creating a
    // project on a team, or naming yourself PM of it, must not hand you that team's roster.
    const pmProjects = await prisma.roleAssignment.findMany({
      where: {
        userId: callerId,
        revokedAt: null,
        scopeType: 'Project',
        OR: [{ grantedById: null }, { grantedById: { not: callerId } }],
        role: { isSystem: true, OR: [{ roleTemplate: { slug: 'project_manager' } }, { name: 'project_manager' }] },
      },
      select: { scopeId: true },
    });
    const managesProject = await prisma.project.findFirst({
      where: {
        teamId: team.id,
        companyId: req.user.companyId,
        deletedAt: null,
        id: { in: pmProjects.map((a) => a.scopeId) },
      },
      select: { id: true },
    });
    if (!managesProject) throw new ForbiddenError('Project Managers can only manage members of teams on projects they were assigned to manage');
    return;
  }

  throw new ForbiddenError('You do not have permission to manage team members');
}

async function auditMembership(req, team, action, oldValue, newValue) {
  try {
    await createSystemAuditLog({
      companyId: req.user.companyId,
      teamId: team.id,
      targetUserId: (newValue || oldValue)?.userId || null,
      action,
      performedById: req.user.id,
      oldValue,
      newValue,
    });
  } catch (auditErr) {
    console.warn('[AuditLog] Notice: Audit record logging during team membership change:', auditErr.message);
  }
}

/** POST /teams/:id/members  { userId, role? }  Adds a new member (409 if already one). */
export async function addTeamMember(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const userId = typeof (body.userId || body.user_id) === 'string' ? (body.userId || body.user_id).trim() : '';
    validateRequired({ userId }, ['userId']);
    const role = parseTeamRole(body.role);

    const team = await findCompanyTeam(req, id);
    await assertMayManageMembers(req, team);

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: req.user.companyId },
    });
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found in this company`);
    }
    if (!user.isActive) {
      throw new BadRequestError('A deactivated user cannot be added to a team');
    }

    const membership = await withTeamLock(id, async (tx) => {
      const existing = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId } },
      });
      if (existing) {
        throw new ConflictError(`User is already a ${existing.role || 'Member'} of this team. Use PATCH /teams/${id}/members/${userId} to change the role.`);
      }

      if (role === 'Lead') {
        const currentLead = await tx.teamMember.findFirst({ where: { teamId: id, role: { in: LEAD_ROLES } } });
        if (currentLead) {
          throw new ConflictError('This team already has a Lead. Add the user as Member, then hand over with PATCH role "Lead".');
        }
      }

      return tx.teamMember.create({
        data: { companyId: req.user.companyId, teamId: id, userId, role },
        include: MEMBER_INCLUDE,
      });
    });
    await auditMembership(req, team, AUDIT_ACTIONS.CREATE, null, { userId, role, teamMember: true });

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: membership,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /teams/:id/members/:userId  { role }
 * Changes a member's team role. Promoting someone to Lead hands the lead over: the current
 * Lead becomes Member in the same transaction, so a team never has two Leads.
 */
export async function updateTeamMemberRole(req, res, next) {
  try {
    const { id, userId } = req.params;
    const role = parseTeamRole((req.body || {}).role, { required: true });

    const team = await findCompanyTeam(req, id);
    await assertMayManageMembers(req, team);

    let oldRole;
    const membershipId = await withTeamLock(id, async (tx) => {
      const membership = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId } },
      });
      if (!membership) throw new NotFoundError('User is not a member of this team');
      // Compare canonical roles; a legacy 'Leader' row is rewritten as 'Lead' when touched.
      oldRole = isLeadRole(membership.role) ? 'Lead' : 'Member';

      if (oldRole === 'Lead' && role !== 'Lead') {
        const others = await tx.teamMember.count({ where: { teamId: id, NOT: { userId } } });
        if (others > 0) {
          throw new ConflictError('A team with members needs a Lead. Promote another member to Lead instead; that hands the role over.');
        }
      }
      if (role === 'Lead') {
        // Hand over: every other Lead becomes Member. Also repairs teams that already have two Leads.
        await tx.teamMember.updateMany({ where: { teamId: id, role: { in: LEAD_ROLES }, NOT: { userId } }, data: { role: 'Member' } });
      }
      if (membership.role !== role) {
        await tx.teamMember.update({ where: { id: membership.id }, data: { role } });
      }
      return membership.id;
    });
    if (oldRole !== role) {
      await auditMembership(req, team, AUDIT_ACTIONS.UPDATE, { userId, role: oldRole }, { userId, role });
    }

    const updated = await prisma.teamMember.findUnique({ where: { id: membershipId }, include: MEMBER_INCLUDE });
    res.status(200).json({
      success: true,
      message: oldRole === role ? 'Team role unchanged' : 'Team role updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /teams/:id/members/:userId
 * 404 when the user is not a member. The Lead cannot be removed while they still have open
 * tasks on the team's projects, or while other members remain (hand the lead over first).
 */
export async function removeTeamMember(req, res, next) {
  try {
    const { id, userId } = req.params;

    const team = await findCompanyTeam(req, id);
    await assertMayManageMembers(req, team);

    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId } },
    });
    if (!membership) throw new NotFoundError('User is not a member of this team');

    if (isLeadRole(membership.role)) {
      // Open work = tasks and subtasks assigned to the Lead on this team's live projects.
      const openStatus = { notIn: OPEN_TASK_STATUSES_EXCLUDED };
      const teamProject = { teamId: id, deletedAt: null };
      const [openTasks, openSubtasks] = await Promise.all([
        prisma.task.count({
          where: { assignedToId: userId, deletedAt: null, status: openStatus, project: teamProject },
        }),
        prisma.subtask.count({
          where: { assignedToId: userId, deletedAt: null, status: openStatus, task: { deletedAt: null, project: teamProject } },
        }),
      ]);
      if (openTasks + openSubtasks > 0) {
        throw new ConflictError(
          `The team Lead still has ${openTasks} open task(s) and ${openSubtasks} open subtask(s) on this team's projects. Reassign them first.`
        );
      }
      const others = await prisma.teamMember.count({ where: { teamId: id, NOT: { userId } } });
      if (others > 0) {
        throw new ConflictError('Hand over the Lead role to another member before removing the current Lead.');
      }
    }

    await prisma.teamMember.delete({ where: { id: membership.id } });
    await auditMembership(req, team, AUDIT_ACTIONS.DELETE, { userId, role: membership.role, teamMember: true }, null);

    res.status(200).json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (err) {
    next(err);
  }
}
