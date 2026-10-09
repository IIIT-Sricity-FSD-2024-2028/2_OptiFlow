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
import { hasRole, normalizeRole, ROLES } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


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
    include: {
      role: true,
    },
    orderBy: { grantedAt: 'desc' },
  },
};

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
      data: users,
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
      where: { user: { companyId: req.user.companyId } },
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
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /users & POST /api/users
 * Creates a new user in the caller's company and assigns requested permitted role.
 */
export async function createUser(req, res, next) {
  try {
    const body = req.body || {};
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

    // --- SECURITY IMPLEMENTATION 2: Feature Gating (Plan Limits) ---
    // 1. Count how many users already exist in this company
    const currentUserCount = await prisma.user.count({
      where: { companyId: req.user.companyId },
    });

    // 2. Fetch the company's active subscription and its associated plan
    const company = await prisma.company.findUnique({
      where: { id: req.user.companyId },
      include: {
        subscriptions: {
          where: { status: { in: ['Active', 'Trialing'] } },
          include: { plan: true },
        },
      },
    });

    // 3. Compare and Block
    const activeSub = company?.subscriptions?.[0];
    const maxUsers = activeSub?.plan?.maxUsers;

    // If maxUsers is null, it means unlimited. Otherwise, enforce the limit.
    if (maxUsers !== null && maxUsers !== undefined && currentUserCount >= maxUsers) {
      throw new ForbiddenError(`Plan limit reached: Your current plan only allows up to ${maxUsers} users. Please upgrade your plan.`);
    }
    // ----------------------------------------------------------------

    // Check duplicate email within this company
    const existing = await prisma.user.findFirst({
      where: { companyId: req.user.companyId, email },
    });
    if (existing) {
      throw new ConflictError('A user with this email address already exists in this company');
    }

    // Verify manager reference belongs to same company
    if (managerUserId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerUserId, companyId: req.user.companyId },
      });
      if (!manager) {
        throw new BadRequestError('Assigned manager does not exist in this company');
      }
    }

    // Resolve and validate role assignment within the company
    let targetRole = null;
    if (requestedRole) {
      const roles = await prisma.role.findMany({
        where: { companyId: req.user.companyId },
      });

      const normReq = normalizeRole(requestedRole);
      targetRole = roles.find(
        (r) =>
          r.id === requestedRole ||
          normalizeRole(r.label) === normReq ||
          (normReq === 'superuser' && normalizeRole(r.label) === 'company_owner')
      );

      if (!targetRole) {
        throw new BadRequestError(`Role "${requestedRole}" is not configured for this company`);
      }

      // Privilege escalation check: only Company Owners & System Admins can grant Company Owner or System Admin
      const isTargetPrivileged =
        normalizeRole(targetRole.label) === 'company_owner' ||
        normalizeRole(targetRole.label) === 'system_admin';

      const callerIsPrivileged =
        hasRole(req.user.roleLabel || req.user.role, [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN]);

      if (isTargetPrivileged && !callerIsPrivileged) {
        throw new ForbiddenError('You do not have permission to assign elevated administrative roles');
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: req.user.companyId,
          fullName,
          email,
          passwordHash,
          jobTitle,
          managerUserId,
          isActive: true,
        },
      });

      if (targetRole) {
        await tx.roleAssignment.create({
          data: {
            userId: user.id,
            roleId: targetRole.id,
            scopeType: 'Company',
            scopeId: req.user.companyId,
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
      await createSystemAuditLog({companyId: req.user.companyId,
        targetUserId: newUser.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { fullName: newUser.fullName, email: newUser.email, role: targetRole?.label },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /users/:id & PATCH /api/users/:id
 * Updates supported user profile and role assignments.
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const targetUser = await prisma.user.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!targetUser) {
      throw new NotFoundError(`User with ID ${id} not found in this company`);
    }

    const isSelf = req.user.id === id;
    const isAdmin = hasRole(req.user.roleLabel || req.user.role, [
      ROLES.COMPANY_OWNER,
      ROLES.SYSTEM_ADMIN,
      ROLES.ACCESS_GOVERNANCE,
    ]);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenError('You do not have permission to update this user');
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
        const duplicate = await prisma.user.findFirst({
          where: { companyId: req.user.companyId, email, NOT: { id } },
        });
        if (duplicate) {
          throw new ConflictError('A user with this email address already exists in this company');
        }
        updateData.email = email;
      }
    }

    if (body.password) {
      if (typeof body.password !== 'string' || body.password.length < 8) {
        throw new ValidationError('Password validation failed', [
          { field: 'password', message: 'Password must be at least 8 characters long' },
        ]);
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    if (isAdmin && (body.isActive !== undefined || body.is_active !== undefined)) {
      const activeVal = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(body.is_active);
      updateData.isActive = activeVal;
      updateData.deactivatedAt = activeVal ? null : new Date();
    }

    if (isAdmin && (body.managerUserId !== undefined || body.manager_user_id !== undefined)) {
      const mgrId = body.managerUserId !== undefined ? body.managerUserId : body.manager_user_id;
      if (mgrId) {
        const manager = await prisma.user.findFirst({
          where: { id: mgrId, companyId: req.user.companyId },
        });
        if (!manager) {
          throw new BadRequestError('Assigned manager does not exist in this company');
        }
      }
      updateData.managerUserId = mgrId || null;
    }

    const requestedRole = body.role || body.roleId || body.role_id;
    let targetRole = null;

    if (requestedRole && isAdmin) {
      const roles = await prisma.role.findMany({
        where: { companyId: req.user.companyId },
      });
      const normReq = normalizeRole(requestedRole);
      targetRole = roles.find(
        (r) => r.id === requestedRole || normalizeRole(r.label) === normReq
      );

      if (!targetRole) {
        throw new BadRequestError(`Role "${requestedRole}" is not configured for this company`);
      }

      // Privilege check
      const isTargetPrivileged =
        normalizeRole(targetRole.label) === 'company_owner' ||
        normalizeRole(targetRole.label) === 'system_admin';

      const callerIsPrivileged =
        hasRole(req.user.roleLabel || req.user.role, [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN]);

      if (isTargetPrivileged && !callerIsPrivileged) {
        throw new ForbiddenError('You do not have permission to assign elevated administrative roles');
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: updateData,
      });

      if (targetRole) {
        await tx.roleAssignment.deleteMany({ where: { userId: id } });
        await tx.roleAssignment.create({
          data: {
            userId: id,
            roleId: targetRole.id,
            scopeType: 'Company',
            scopeId: req.user.companyId,
            grantedById: req.user.id,
          },
        });
      }

      return tx.user.findUnique({
        where: { id },
        select: USER_SELECT_FIELDS,
      });
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        targetUserId: id,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        newValue: { fieldsUpdated: Object.keys(updateData), role: targetRole?.label },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during user update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
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

    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
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


