import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors.js';
import {
  validateRequired,
  validateEmail,
} from '../utils/validation.js';
import { systemSlugOfRole, resolveUserRole } from '../utils/roles.js';
import { assertWithinPlanLimit, withCompanyLock } from '../utils/planLimits.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import {
  assertValidScope,
  assertScopeFitsRole,
  COMPANY_WIDE_SLUGS,
  countActiveOwners,
  resolveCompanyRole,
  ROLE_WITH_TEMPLATE,
} from '../utils/roleAssignmentGuards.js';
import {
  buildEmailChangeToken,
  verifyEmailChangeToken,
  sendEmailChangeConfirmation,
  sendEmailChangedNotice,
} from '../utils/emailChangeTokens.js';


const USER_SELECT_FIELDS = {
  id: true,
  companyId: true,
  fullName: true,
  email: true,
  jobTitle: true,
  managerUserId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deactivatedAt: true,
  company: { select: { id: true, legalName: true } },
  manager: { select: { id: true, fullName: true, email: true } },
  roleAssignments: {
    where: { revokedAt: null },
    include: {
      role: true,
    },
    orderBy: { grantedAt: 'desc' },
  },
  teamMembers: {
    include: {
      team: {
        select: {
          id: true,
          name: true,
          branch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  },
};

/**
 * WHY: Validates reporting lines to prevent ancestor hierarchy cycles (e.g. Alice -> Bob -> Charlie -> Alice)
 */
export async function validateNoReportingCycle(prismaClient, companyId, employeeId, proposedManagerId) {
  if (!proposedManagerId) return;
  let currentId = proposedManagerId;
  const visited = new Set([employeeId]);
  let depth = 0;
  while (currentId && depth < 20) {
    if (visited.has(currentId)) {
      throw new BadRequestError('Circular reporting line detected: An employee cannot report to their own subordinate');
    }
    visited.add(currentId);
    const mgr = await prismaClient.user.findFirst({
      where: { id: currentId, companyId },
      select: { managerUserId: true },
    });
    currentId = mgr?.managerUserId;
    depth++;
  }
}

function formatUserResponse(u) {
  if (!u) return u;
  const teams = (u.teamMembers || []).map((tm) => ({
    teamId: tm.team?.id,
    teamName: tm.team?.name,
    role: tm.role || 'Member',
    branchId: tm.team?.branch?.id,
    branchName: tm.team?.branch?.name,
    joinedAt: tm.joinedAt,
  }));
  return {
    ...u,
    teams,
    primaryTeam: teams[0] || null,
  };
}

/**
 * GET /users & GET /api/users
 * Returns list of users in the authenticated user's company.
 */
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: USER_SELECT_FIELDS,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: users.map(formatUserResponse),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/roles/mapping & GET /api/users/roles/mapping
 * Returns role assignments mapping for company users.
 */
export async function listUserRoleMappings(req, res, next) {
  try {
    const mappings = await prisma.roleAssignment.findMany({
      where: { user: { companyId: req.user.companyId }, revokedAt: null },
      include: {
        user: { select: { id: true, fullName: true, email: true, companyId: true } },
        role: true,
      },
      orderBy: { grantedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: mappings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id & GET /api/users/:id
 * Retrieves a user within the authenticated user's company.
 */
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
      select: {
        ...USER_SELECT_FIELDS,
        reports: { select: { id: true, fullName: true, email: true } },
        assignedTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found in this company`);
    }

    res.status(200).json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Works out the scope for a new primary role from the request body (SEC-M5-04 / SEC-M5-10).
 * - branchId, or scopeType + scopeId, must name a real row of the company (400 otherwise).
 * - Company Owner / System Admin are always Company-scoped.
 * - Branch Manager must end up Branch-scoped.
 * `fallback` is the scope to keep when the body names none.
 */
async function resolveAssignmentScope({ companyId, body, role, fallback }) {
  const slug = systemSlugOfRole(role);
  if (COMPANY_WIDE_SLUGS.includes(slug)) {
    return { scopeType: 'Company', scopeId: companyId };
  }

  const branchId = body.branchId || body.branch_id;
  const scopeType = body.scopeType || body.scope_type;
  const scopeId = body.scopeId || body.scope_id;

  let scope;
  if (branchId) {
    scope = { scopeType: 'Branch', scopeId: String(branchId) };
  } else if (scopeType) {
    scope = { scopeType, scopeId: String(scopeId || (scopeType === 'Company' ? companyId : '')) };
  } else {
    scope = fallback;
  }
  await assertValidScope({ companyId, ...scope });
  assertScopeFitsRole(role, scope.scopeType);
  return scope;
}

/** Throws unless the caller may grant this role (only owners grant owner; owners/admins grant admin). */
function assertMayGrantRole(req, role) {
  const slug = systemSlugOfRole(role);
  if (slug === 'company_owner' && req.user.role !== 'company_owner') {
    throw new ForbiddenError('Only the Company Owner can assign the Company Owner role');
  }
  if (slug === 'system_admin' && !['company_owner', 'system_admin'].includes(req.user.role)) {
    throw new ForbiddenError('You do not have permission to assign elevated administrative roles');
  }
}

async function loadCompanyRoles(companyId) {
  return prisma.role.findMany({ where: { companyId }, ...ROLE_WITH_TEMPLATE });
}

/**
 * POST /users & POST /api/users
 * Creates a new user in the caller's company and assigns requested permitted role.
 */
export async function createUser(req, res, next) {
  try {
    const body = req.body || {};
    const companyId = req.user.companyId;
    const fullName = (body.fullName || body.full_name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || body.password_hash || '';
    const jobTitle = body.jobTitle || body.job_title || null;
    const managerUserId = body.managerUserId || body.manager_user_id || null;
    const requestedRole = body.role || body.roleId || body.role_id || null;

    validateRequired({ fullName, email, password }, ['fullName', 'email', 'password']);
    validateEmail(email);

    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('Password validation failed', [
        { field: 'password', message: 'Password must be at least 8 characters long' },
      ]);
    }

    // Emails are unique across all tenants (case-insensitive) so that /auth/login,
    // which identifies a user by email alone, can never match two accounts.
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Verify manager reference belongs to same company
    if (managerUserId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerUserId, companyId },
      });
      if (!manager) {
        throw new BadRequestError('Assigned manager does not exist in this company');
      }
    }

    // Resolve and validate the role and its scope before anything is written.
    let targetRole = null;
    let scope = null;
    if (requestedRole) {
      targetRole = resolveCompanyRole(await loadCompanyRoles(companyId), requestedRole);
      if (!targetRole) {
        throw new BadRequestError(`Role "${requestedRole}" is not configured for this company`);
      }
      assertMayGrantRole(req, targetRole);

      let fallback = { scopeType: 'Company', scopeId: companyId };
      if (systemSlugOfRole(targetRole) === 'branch_manager' && !(body.branchId || body.branch_id || body.scopeType || body.scope_type)) {
        // No branch given: use the company's first branch, as before.
        const defaultBranch = await prisma.branch.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
        if (defaultBranch) fallback = { scopeType: 'Branch', scopeId: defaultBranch.id };
      }
      scope = await resolveAssignmentScope({ companyId, body, role: targetRole, fallback });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Seat check and create run under the company row lock, so parallel creates cannot all
    // pass the same count (SEC-M5-09).
    const newUser = await withCompanyLock(companyId, async (tx) => {
      await assertWithinPlanLimit(companyId, 'users', { client: tx });

      const user = await tx.user.create({
        data: {
          companyId,
          fullName,
          email,
          passwordHash,
          jobTitle,
          managerUserId,
          isActive: true,
          // null => the user must replace this admin-chosen password at first sign-in
          passwordChangedAt: null,
        },
      });

      if (targetRole) {
        await tx.roleAssignment.create({
          data: {
            companyId,
            userId: user.id,
            roleId: targetRole.id,
            scopeType: scope.scopeType,
            scopeId: scope.scopeId,
            grantedById: req.user.id,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: USER_SELECT_FIELDS,
      });
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId,
        targetUserId: newUser.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { fullName: newUser.fullName, email: newUser.email, role: targetRole?.label, ...(scope || {}) },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: formatUserResponse(newUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id & PATCH /api/users/:id
 * Updates supported user profile and role assignments.
 *
 * On your own account this endpoint changes profile fields only: your password goes through
 * POST /auth/change-password (SEC-M5-05), your email through POST /users/me/email-change
 * (SEC-M5-06), and your role cannot be changed by you at all (D-S3).
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const companyId = req.user.companyId;

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId },
    });

    if (!targetUser) {
      throw new NotFoundError(`User with ID ${id} not found in this company`);
    }

    const isSelf = req.user.id === id;
    const isAdmin = ['company_owner', 'system_admin', 'hr_manager'].includes(req.user.role);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenError('You do not have permission to update this user');
    }

    // Sovereign checks: Non-owners cannot modify Company Owner accounts (demote, change credentials, or deactivate)
    const targetAssignments = await prisma.roleAssignment.findMany({
      where: { userId: id, revokedAt: null },
      include: { role: ROLE_WITH_TEMPLATE },
    });
    const targetIsOwner = targetAssignments.some(
      (ra) => systemSlugOfRole(ra.role) === 'company_owner'
    );
    const targetIsAdmin = targetAssignments.some(
      (ra) => systemSlugOfRole(ra.role) === 'system_admin'
    );

    const callerIsOwner = req.user.role === 'company_owner';
    const callerIsAdminOrOwner = ['company_owner', 'system_admin'].includes(req.user.role);

    if (!isSelf) {
      if (targetIsOwner && !callerIsOwner) {
        throw new ForbiddenError('Only the Company Owner can modify Company Owner accounts');
      }
      if (targetIsAdmin && !callerIsAdminOrOwner) {
        throw new ForbiddenError('You do not have permission to modify System Administrator accounts');
      }
    }

    const updateData = {};

    if (body.fullName || body.full_name) {
      updateData.fullName = String(body.fullName || body.full_name).trim();
    }

    if (body.jobTitle !== undefined || body.job_title !== undefined) {
      updateData.jobTitle = body.jobTitle !== undefined ? body.jobTitle : body.job_title;
    }

    if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      validateEmail(email);

      if (email !== targetUser.email.toLowerCase()) {
        if (isSelf) {
          throw new BadRequestError('To change your own email, use POST /users/me/email-change with your current password');
        }
        const duplicate = await prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } },
        });
        if (duplicate) {
          throw new ConflictError('A user with this email address already exists');
        }
        updateData.email = email;
      }
    }

    if (body.password) {
      if (isSelf) {
        throw new BadRequestError('To change your own password, use POST /auth/change-password with your current password');
      }
      if (typeof body.password !== 'string' || body.password.length < 8) {
        throw new ValidationError('Password validation failed', [
          { field: 'password', message: 'Password must be at least 8 characters long' },
        ]);
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
      // Sign out existing sessions. An admin-set password must be replaced at next sign-in.
      updateData.tokenVersion = { increment: 1 };
      updateData.passwordChangedAt = null;
    }

    let needsSeat = false;
    if (isAdmin && (body.isActive !== undefined || body.is_active !== undefined)) {
      const activeVal = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(body.is_active);
      if (targetIsOwner && !activeVal) {
        throw new ForbiddenError('The Company Owner account cannot be deactivated');
      }
      needsSeat = activeVal && !targetUser.isActive;
      updateData.isActive = activeVal;
      updateData.deactivatedAt = activeVal ? null : new Date();
      if (!activeVal) updateData.tokenVersion = { increment: 1 };
    }

    if (isAdmin && (body.managerUserId !== undefined || body.manager_user_id !== undefined)) {
      const mgrId = body.managerUserId !== undefined ? body.managerUserId : body.manager_user_id;
      if (mgrId) {
        if (mgrId === id) {
          throw new BadRequestError('A user cannot be their own reporting manager');
        }
        const manager = await prisma.user.findFirst({
          where: { id: mgrId, companyId },
        });
        if (!manager) {
          throw new BadRequestError('Assigned manager does not exist in this company');
        }
        // Guard against circular reporting lines
        await validateNoReportingCycle(prisma, companyId, id, mgrId);
      }
      updateData.managerUserId = mgrId || null;
    }

    // Role change (SEC-M5-04 / SEC-M5-14): replace only the primary assignment and keep its scope.
    const requestedRole = body.role || body.roleId || body.role_id;
    let targetRole = null;
    let primary = null;
    let newScope = null;

    if (requestedRole && isAdmin) {
      targetRole = resolveCompanyRole(await loadCompanyRoles(companyId), requestedRole);
      if (!targetRole) {
        throw new BadRequestError(`Role "${requestedRole}" is not configured for this company`);
      }
    }

    const updatedUser = await withCompanyLock(companyId, async (tx) => {
      if (needsSeat) {
        await assertWithinPlanLimit(companyId, 'users', { client: tx });
      }

      if (targetRole) {
        // Read the current assignments under the lock, so parallel role changes for the same
        // user see each other's result and cannot each add a new primary.
        const current = await tx.roleAssignment.findMany({
          where: { userId: id, revokedAt: null },
          include: { role: ROLE_WITH_TEMPLATE },
        });
        primary = resolveUserRole({ roleAssignments: current }).matchedAssignment;
        const fallback = primary
          ? { scopeType: primary.scopeType, scopeId: primary.scopeId }
          : { scopeType: 'Company', scopeId: companyId };
        newScope = await resolveAssignmentScope({ companyId, body, role: targetRole, fallback });

        const unchanged =
          primary &&
          primary.roleId === targetRole.id &&
          primary.scopeType === newScope.scopeType &&
          primary.scopeId === newScope.scopeId;

        if (unchanged) {
          // Re-sending the current role (for example from a full edit form) changes nothing.
          targetRole = null;
        } else {
          if (isSelf) {
            throw new ForbiddenError('You cannot change your own role');
          }
          assertMayGrantRole(req, targetRole);

          const losesOwner =
            primary &&
            systemSlugOfRole(primary.role) === 'company_owner' &&
            systemSlugOfRole(targetRole) !== 'company_owner' &&
            !current.some((ra) => ra.id !== primary.id && systemSlugOfRole(ra.role) === 'company_owner');
          if (losesOwner && (await countActiveOwners(companyId, tx)) <= 1) {
            throw new ForbiddenError('The only Company Owner cannot be demoted. Assign another Company Owner first.');
          }
          if (primary) {
            // Soft revoke keeps the history of who held which role (D-S9).
            await tx.roleAssignment.updateMany({ where: { id: primary.id, revokedAt: null }, data: { revokedAt: new Date() } });
          }
          await tx.roleAssignment.create({
            data: {
              companyId,
              userId: id,
              roleId: targetRole.id,
              scopeType: newScope.scopeType,
              scopeId: newScope.scopeId,
              grantedById: req.user.id,
            },
          });
        }
      }

      await tx.user.update({
        where: { id },
        data: updateData,
      });

      return tx.user.findUnique({
        where: { id },
        select: USER_SELECT_FIELDS,
      });
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId,
        targetUserId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        oldValue: targetRole && primary ? { role: primary.role?.label, scopeType: primary.scopeType, scopeId: primary.scopeId } : undefined,
        newValue: { fieldsUpdated: Object.keys(updateData), role: targetRole?.label, ...(targetRole ? newScope : {}) },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/me/email-change   { newEmail, currentPassword }
 * Starts an email change for the signed-in user (SEC-M5-06). The address changes only when
 * the link sent to the NEW address is confirmed; the token is never returned in the response.
 */
export async function requestEmailChange(req, res, next) {
  try {
    const body = req.body || {};
    const newEmail = String(body.newEmail || body.email || '').trim().toLowerCase();
    const currentPassword = body.currentPassword;
    validateRequired({ newEmail, currentPassword }, ['newEmail', 'currentPassword']);
    validateEmail(newEmail);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new NotFoundError('User not found');
    // 400, not 401: the session is valid, only the typed password is wrong. A 401 would make the
    // frontend API client treat it as an expired session and sign the user out.
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestError('Current password is incorrect');
    }
    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestError('This is already your email address');
    }
    // Same answer whether or not the address is taken, so this endpoint cannot be used to find
    // out which emails exist (SEC-M5-06). A taken address simply gets no link; the confirm step
    // re-checks anyway.
    const duplicate = await prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' }, NOT: { id: user.id } },
      select: { id: true },
    });
    if (!duplicate) {
      const { url } = buildEmailChangeToken({
        userId: user.id,
        companyId: user.companyId,
        tokenVersion: user.tokenVersion,
        newEmail,
      });
      sendEmailChangeConfirmation({ to: newEmail, fullName: user.fullName, url });
    }

    res.status(202).json({
      success: true,
      message: `A confirmation link was sent to ${newEmail}. Your email changes when you open it.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/email-change/confirm   { token }
 * Applies a pending email change. Works once: it bumps tokenVersion, which also signs out
 * every session that used the old address.
 */
export async function confirmEmailChange(req, res, next) {
  try {
    const payload = verifyEmailChangeToken((req.body || {}).token);
    const user = await prisma.user.findUnique({ where: { id: String(payload.sub) } });
    if (!user || !user.isActive || user.companyId !== payload.companyId || user.tokenVersion !== payload.tokenVersion) {
      throw new BadRequestError('This email confirmation link is invalid or has expired');
    }
    const newEmail = String(payload.newEmail).toLowerCase();
    const duplicate = await prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' }, NOT: { id: user.id } },
    });
    if (duplicate) {
      throw new ConflictError('A user with this email address already exists');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail, tokenVersion: { increment: 1 } },
    });
    sendEmailChangedNotice({ to: user.email, fullName: user.fullName, newEmail });

    try {
      await createSystemAuditLog({
        companyId: user.companyId,
        targetUserId: user.id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: user.id,
        oldValue: { email: user.email },
        newValue: { email: newEmail, via: 'email-change-confirmation' },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during email change:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Email address updated. Please sign in again with your new address.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /users/:id & DELETE /api/users/:id
 * Deactivates a user (soft delete) rather than permanent database deletion.
 */
export async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      throw new BadRequestError('You cannot deactivate your own administrative account');
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!targetUser) {
      throw new NotFoundError(`User with ID ${id} not found in this company`);
    }

    // Sovereign checks: Non-owners cannot deactivate Company Owner or System Admin
    const targetAssignments = await prisma.roleAssignment.findMany({
      where: { userId: id, revokedAt: null },
      include: { role: ROLE_WITH_TEMPLATE },
    });
    const isTargetOwner = targetAssignments.some(
      (ra) => systemSlugOfRole(ra.role) === 'company_owner'
    );
    if (isTargetOwner) {
      throw new ForbiddenError('The Company Owner account cannot be deactivated');
    }

    const callerIsOwner = req.user.role === 'company_owner';
    const isTargetAdmin = targetAssignments.some(
      (ra) => systemSlugOfRole(ra.role) === 'system_admin'
    );
    if (isTargetAdmin && !callerIsOwner) {
      throw new ForbiddenError('Only the Company Owner can deactivate System Administrators');
    }

    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        tokenVersion: { increment: 1 }, // revoke existing sessions immediately
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        targetUserId: id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        performedById: req.user.id,
        newValue: { isActive: false, deactivatedAt: new Date().toISOString() },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user deactivation:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id/reactivate & POST /users/:id/reactivate
 * Reactivates an employee account (resets isActive to true, clears deactivatedAt).
 */
export async function reactivateUser(req, res, next) {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!targetUser) {
      throw new NotFoundError(`User with ID ${id} not found in this company`);
    }

    if (targetUser.isActive) {
      // Return the same safe, list-shaped record as every other user response (never the raw row,
      // which contains passwordHash).
      const current = await prisma.user.findUnique({ where: { id }, select: USER_SELECT_FIELDS });
      return res.status(200).json({
        success: true,
        message: `User "${targetUser.fullName}" is already active`,
        data: formatUserResponse(current),
      });
    }

    // Plan seat check and reactivation under the company lock (SEC-M5-09).
    const updatedUser = await withCompanyLock(req.user.companyId, async (tx) => {
      await assertWithinPlanLimit(req.user.companyId, 'users', { client: tx });
      return tx.user.update({
        where: { id },
        data: {
          isActive: true,
          deactivatedAt: null,
          tokenVersion: { increment: 1 },
        },
        select: USER_SELECT_FIELDS,
      });
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        targetUserId: id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        performedById: req.user.id,
        oldValue: { isActive: false, deactivatedAt: targetUser.deactivatedAt },
        newValue: { isActive: true, deactivatedAt: null },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user reactivation:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: `User "${updatedUser.fullName}" reactivated successfully`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    next(err);
  }
}



