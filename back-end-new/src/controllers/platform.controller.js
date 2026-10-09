import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.js';
import { validateRequired, validateEmail, validateNumber } from '../utils/validation.js';


// ============================================================================
// 1. PLATFORM ADMIN AUTHENTICATION
// ============================================================================

/**
 * POST /platform/auth/login & POST /api/platform/auth/login
 */
export async function platformLogin(req, res, next) {
  try {
    const body = req.body || {};
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    validateRequired({ email, password }, ['email', 'password']);
    validateEmail(email, 'email');

    const admin = await prisma.platformAdminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedError('Invalid platform administrator credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Platform administrator account is deactivated');
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid platform administrator credentials');
    }

    const token = jwt.sign(
      {
        sub: admin.id,
        role: 'platform_admin',
        type: 'platform_admin',
        email: admin.email,
        fullName: admin.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN || '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Platform admin authenticated successfully',
      data: {
        token,
        adminUser: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          role: 'platform_admin',
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/auth/me & GET /api/platform/auth/me
 */
export async function platformAuthMe(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: req.platformAdmin,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 2. PLATFORM METRICS & DASHBOARD
// ============================================================================

/**
 * GET /platform/metrics & GET /api/platform/metrics
 */
export async function getPlatformMetrics(req, res, next) {
  try {
    const totalCompanies = await prisma.company.count();
    const totalAdmins = await prisma.platformAdminUser.count();

    const activeSubscriptions = await prisma.subscription.groupBy({
      by: ['planId'],
      _count: { planId: true },
      where: { status: 'Active' },
    });

    const plans = await prisma.plan.findMany();
    const planMap = new Map(plans.map((p) => [p.id, p.name]));

    const subscriptionsByPlan = activeSubscriptions.map((sub) => ({
      planName: planMap.get(sub.planId) || 'Unknown Plan',
      count: sub._count.planId,
    }));

    const recentSupportLogs = await prisma.platformSupportAccess.findMany({
      orderBy: { grantedAt: 'desc' },
      take: 10,
      include: {
        company: { select: { legalName: true } },
        adminUser: { select: { fullName: true, email: true } },
      },
    });

    const recentCompanies = await prisma.company.findMany({
      take: 5,
      include: {
        subscriptions: {
          include: { plan: true },
          where: { status: 'Active' },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        totalAdmins,
        subscriptionsByPlan,
        recentSupportLogs,
        recentCompanies,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 3. COMPANIES (PLATFORM MANAGEMENT)
// ============================================================================

/**
 * GET /platform/companies & GET /api/platform/companies
 */
export async function listPlatformCompanies(req, res, next) {
  try {
    const companies = await prisma.company.findMany({
      include: {
        subscriptions: {
          include: { plan: true },
          where: { status: 'Active' },
        },
        _count: {
          select: { users: true, branches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/companies/:id & GET /api/platform/companies/:id
 */
export async function getPlatformCompanyById(req, res, next) {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        subscriptions: { include: { plan: true } },
        users: { select: { id: true, fullName: true, email: true, status: true, jobTitle: true } },
        branches: true,
      },
    });

    if (!company) {
      throw new NotFoundError(`Company with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /platform/companies/:id & PATCH /api/platform/companies/:id
 */
export async function updatePlatformCompany(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundError(`Company with ID ${id} not found`);
    }

    const updateData = {};
    if (body.legalName) updateData.legalName = body.legalName.trim();
    if (body.status) updateData.status = body.status;

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 4. PLANS (PLATFORM CRUD)
// ============================================================================

/**
 * GET /platform/plans & GET /api/platform/plans
 */
export async function listPlans(req, res, next) {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/plans/:id & GET /api/platform/plans/:id
 */
export async function getPlanById(req, res, next) {
  try {
    const { id } = req.params;
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundError(`Plan with ID ${id} not found`);
    }
    res.status(200).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/plans & POST /api/platform/plans
 */
export async function createPlan(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const auditLogRetentionDays = Number(body.auditLogRetentionDays ?? 90);
    const allowsIntegrations = Boolean(body.allowsIntegrations ?? false);

    validateRequired({ name }, ['name']);

    const newPlan = await prisma.plan.create({
      data: {
        name,
        maxBranches: body.maxBranches !== undefined ? Number(body.maxBranches) : null,
        maxUsers: body.maxUsers !== undefined ? Number(body.maxUsers) : null,
        maxActiveProcessTemplates: body.maxActiveProcessTemplates !== undefined ? Number(body.maxActiveProcessTemplates) : null,
        maxComplianceRules: body.maxComplianceRules !== undefined ? Number(body.maxComplianceRules) : null,
        auditLogRetentionDays,
        allowsIntegrations,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /platform/plans/:id & PATCH /api/platform/plans/:id
 */
export async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError(`Plan with ID ${id} not found`);

    const updateData = {};
    if (body.name) updateData.name = body.name.trim();
    if (body.maxBranches !== undefined) updateData.maxBranches = Number(body.maxBranches);
    if (body.maxUsers !== undefined) updateData.maxUsers = Number(body.maxUsers);
    if (body.allowsIntegrations !== undefined) updateData.allowsIntegrations = Boolean(body.allowsIntegrations);

    const updated = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 5. SUBSCRIPTIONS (PLATFORM CRUD)
// ============================================================================

/**
 * GET /platform/subscriptions & GET /api/platform/subscriptions
 */
export async function listSubscriptions(req, res, next) {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        company: { select: { id: true, legalName: true } },
        plan: true,
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/subscriptions & POST /api/platform/subscriptions
 */
export async function createSubscription(req, res, next) {
  try {
    const body = req.body || {};
    const companyId = body.companyId || body.company_id;
    const planId = body.planId || body.plan_id;
    const billingCycle = body.billingCycle || body.billing_cycle || 'monthly';
    const status = body.status || 'Active';

    validateRequired({ companyId, planId }, ['companyId', 'planId']);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundError(`Company ${companyId} not found`);

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError(`Plan ${planId} not found`);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'annual' ? 12 : 1));

    const subscription = await prisma.subscription.create({
      data: {
        companyId,
        planId,
        billingCycle,
        status,
        currentPeriodEnd: periodEnd,
      },
      include: { company: true, plan: true },
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 6. PLATFORM ADMIN USERS (CRUD)
// ============================================================================

/**
 * GET /platform/admin-users & GET /api/platform-admin-users
 */
export async function listPlatformAdminUsers(req, res, next) {
  try {
    const admins = await prisma.platformAdminUser.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/admin-users/:id & GET /api/platform-admin-users/:id
 */
export async function getPlatformAdminUserById(req, res, next) {
  try {
    const { id } = req.params;

    const admin = await prisma.platformAdminUser.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        supportAccesses: { include: { company: true } },
      },
    });

    if (!admin) {
      throw new NotFoundError(`Platform admin user with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/admin-users & POST /api/platform-admin-users
 */
export async function createPlatformAdminUser(req, res, next) {
  try {
    const body = req.body || {};
    const email = (body.email || '').trim().toLowerCase();
    const fullName = (body.fullName || body.full_name || '').trim();
    const password = body.password || '';

    validateRequired({ email, fullName, password }, ['email', 'fullName', 'password']);
    validateEmail(email, 'email');

    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    const existing = await prisma.platformAdminUser.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError(`Platform admin user with email ${email} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.platformAdminUser.create({
      data: {
        email,
        fullName,
        passwordHash,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Platform admin user created successfully',
      data: newAdmin,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /platform/admin-users/:id & PATCH /api/platform-admin-users/:id
 */
export async function updatePlatformAdminUser(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.platformAdminUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Platform admin user with ID ${id} not found`);
    }

    // Protect against deactivating the last active admin
    if (body.isActive === false && existing.isActive === true) {
      const activeCount = await prisma.platformAdminUser.count({
        where: { isActive: true },
      });
      if (activeCount <= 1) {
        throw new BadRequestError('Cannot deactivate the last active platform administrator');
      }
    }

    const updateData = {};
    if (body.fullName || body.full_name) updateData.fullName = (body.fullName || body.full_name).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
    if (body.password) {
      if (body.password.length < 8) {
        throw new BadRequestError('Password must be at least 8 characters long');
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const updated = await prisma.platformAdminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Platform admin user updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /platform/admin-users/:id & DELETE /api/platform-admin-users/:id
 */
export async function deletePlatformAdminUser(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.platformAdminUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Platform admin user with ID ${id} not found`);
    }

    const activeCount = await prisma.platformAdminUser.count({
      where: { isActive: true },
    });
    if (activeCount <= 1) {
      throw new BadRequestError('Cannot delete the last active platform administrator');
    }

    await prisma.platformAdminUser.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Platform admin user deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// ROUTE REGISTRATIONS
// ============================================================================

// Public Platform Auth Login


// Protected Platform Routes


// Companies Management


// Plans Management


// Subscriptions Management


// Platform Admin Users Management


// ============================================================================
// 6. PLATFORM SUPPORT ACCESS
// ============================================================================

/**
 * GET /platform/support-access & GET /api/platform/support-access
 */
export async function listPlatformSupportAccesses(req, res, next) {
  try {
    const { companyId, adminUserId } = req.query;

    const where = {
      ...(companyId ? { companyId: String(companyId) } : {}),
      ...(adminUserId ? { adminUserId: String(adminUserId) } : {}),
    };

    const accesses = await prisma.platformSupportAccess.findMany({
      where,
      include: {
        company: { select: { id: true, legalName: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: accesses,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/support-access/:id & GET /api/platform/support-access/:id
 */
export async function getPlatformSupportAccessById(req, res, next) {
  try {
    const { id } = req.params;

    const access = await prisma.platformSupportAccess.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, legalName: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!access) {
      throw new NotFoundError(`Platform support access with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: access,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/support-access & POST /api/platform/support-access
 */
export async function createPlatformSupportAccess(req, res, next) {
  try {
    const body = req.body || {};
    const companyId = body.companyId || body.company_id;
    const reason = (body.reason || '').trim();
    const durationHours = Number(body.durationHours || body.duration_hours || 4);

    validateRequired({ companyId, reason }, ['companyId', 'reason']);

    const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
    if (!company) {
      throw new NotFoundError(`Target company ${companyId} not found`);
    }

    const expiresAt = new Date(Date.now() + Math.max(1, durationHours) * 60 * 60 * 1000);

    const access = await prisma.platformSupportAccess.create({
      data: {
        companyId: String(companyId),
        adminUserId: req.platformAdmin.id,
        reason,
        expiresAt,
        actionLog: [
          {
            action: 'GRANTED',
            adminId: req.platformAdmin.id,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      include: {
        company: { select: { id: true, legalName: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Support access granted successfully',
      data: access,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /platform/support-access/:id & DELETE /api/platform/support-access/:id
 */
export async function revokePlatformSupportAccess(req, res, next) {
  try {
    const { id } = req.params;

    const access = await prisma.platformSupportAccess.findUnique({ where: { id } });
    if (!access) {
      throw new NotFoundError(`Platform support access with ID ${id} not found`);
    }

    await prisma.platformSupportAccess.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Support access revoked successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Support Access Routes



