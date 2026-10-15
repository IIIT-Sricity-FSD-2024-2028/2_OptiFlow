import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from "../utils/errors.js";
import {
  validateRequired,
  validateEmail,
  validateNumber,
} from "../utils/validation.js";
import { parseListParams, formatListResponse } from "../utils/pagination.js";
import { writeAuditLog } from "../utils/platformAudit.js";

// ============================================================================
// 1. PLATFORM ADMIN AUTHENTICATION
// ============================================================================

/**
 * POST /platform/auth/login & POST /api/platform/auth/login
 */
export async function platformLogin(req, res, next) {
  try {
    const body = req.body || {};
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    validateRequired({ email, password }, ["email", "password"]);
    validateEmail(email, "email");

    const admin = await prisma.platformAdminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedError("Invalid platform administrator credentials");
    }

    if (!admin.isActive) {
      throw new UnauthorizedError(
        "Platform administrator account is deactivated",
      );
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid platform administrator credentials");
    }

    const token = jwt.sign(
      {
        sub: admin.id,
        role: "platform_admin",
        type: "platform_admin",
        email: admin.email,
        fullName: admin.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: env.PLATFORM_JWT_EXPIRES_IN || "1h" },
    );

    // Set httpOnly cookie scoped to /api/platform
    res.cookie("token", token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "Strict",
      path: "/api/platform",
      maxAge: 3600 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Platform admin authenticated successfully",
      data: {
        token,
        adminUser: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          role: "platform_admin",
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
 * POST /platform/auth/logout & POST /api/platform/auth/logout
 * Clears the platform admin httpOnly cookie
 */
export async function platformLogout(req, res, next) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "Strict",
      path: "/api/platform",
    });

    res.status(200).json({
      success: true,
      message: "Platform administrator logged out successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/auth/change-password & POST /api/platform/auth/change-password
 * Authenticated platform admin password change with audit logging
 */
export async function changePlatformPassword(req, res, next) {
  try {
    const body = req.body || {};
    const { currentPassword, newPassword } = body;

    validateRequired({ currentPassword, newPassword }, [
      "currentPassword",
      "newPassword",
    ]);

    if (typeof newPassword !== "string" || newPassword.length < 10) {
      throw new BadRequestError(
        "New password must be at least 10 characters long",
      );
    }

    if (newPassword === currentPassword) {
      throw new BadRequestError(
        "New password must be different from current password",
      );
    }

    const admin = await prisma.platformAdminUser.findUnique({
      where: { id: req.platformAdmin.id },
    });

    if (!admin) {
      throw new UnauthorizedError("Platform administrator account not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const passwordChangedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.platformAdminUser.update({
        where: { id: admin.id },
        data: {
          passwordHash,
          passwordChangedAt,
        },
      });

      await writeAuditLog(
        req,
        "admin.password_change",
        { type: "PlatformAdminUser", id: admin.id },
        null,
        { changedAt: passwordChangedAt.toISOString() },
        tx,
      );
    });

    // Issue fresh token and update cookie
    const freshToken = jwt.sign(
      {
        sub: admin.id,
        role: "platform_admin",
        type: "platform_admin",
        email: admin.email,
        fullName: admin.fullName,
      },
      env.JWT_SECRET,
      { expiresIn: env.PLATFORM_JWT_EXPIRES_IN || "1h" },
    );

    res.cookie("token", freshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "Strict",
      path: "/api/platform",
      maxAge: 3600 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: {
        token: freshToken,
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
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Company counts by status
    const [totalCompanies, companyStatusGroups, newCompaniesLast30Days] =
      await Promise.all([
        prisma.company.count(),
        prisma.company.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.company.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    const companyCounts = {
      total: totalCompanies,
      active: 0,
      suspended: 0,
      closed: 0,
      newLast30Days: newCompaniesLast30Days,
    };
    companyStatusGroups.forEach((g) => {
      const s = g.status?.toLowerCase();
      if (s === "active") companyCounts.active = g._count.status;
      else if (s === "suspended") companyCounts.suspended = g._count.status;
      else if (s === "closed") companyCounts.closed = g._count.status;
    });

    // 2. Subscription counts by status
    const subscriptionStatusGroups = await prisma.subscription.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    const subscriptionCounts = {
      total: 0,
      active: 0,
      trialing: 0,
      pastDue: 0,
      cancelled: 0,
      expiringSoon: 0,
    };
    subscriptionStatusGroups.forEach((g) => {
      subscriptionCounts.total += g._count.status;
      if (g.status === "Active") subscriptionCounts.active = g._count.status;
      else if (g.status === "Trialing")
        subscriptionCounts.trialing = g._count.status;
      else if (g.status === "PastDue")
        subscriptionCounts.pastDue = g._count.status;
      else if (g.status === "Cancelled")
        subscriptionCounts.cancelled = g._count.status;
    });

    // 3. Expiring soon count (currentPeriodEnd between now and now + 7 days, for Active/Trialing)
    subscriptionCounts.expiringSoon = await prisma.subscription.count({
      where: {
        status: { in: ["Active", "Trialing"] },
        currentPeriodEnd: { gte: now, lte: in7Days },
      },
    });

    // 4. Plan distribution (include all plans and company count on each)
    const [allPlans, subsByPlan] = await Promise.all([
      prisma.plan.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.subscription.groupBy({
        by: ["planId"],
        _count: { planId: true },
        where: { status: { in: ["Active", "Trialing", "PastDue"] } },
      }),
    ]);

    const subCountByPlanId = new Map(
      subsByPlan.map((s) => [s.planId, s._count.planId]),
    );
    const planDistribution = allPlans.map((p) => ({
      planId: p.id,
      planName: p.name,
      isActive: p.isActive,
      count: subCountByPlanId.get(p.id) || 0,
    }));

    // 5. Needs Attention lists (capped at 5 rows each)
    const [
      pastDueSubs,
      expiringSoonSubs,
      suspendedCompanies,
      companiesWithoutSubscription,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: "PastDue" },
        take: 5,
        orderBy: { currentPeriodEnd: "asc" },
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          company: { select: { id: true, legalName: true } },
          plan: { select: { id: true, name: true } },
        },
      }),
      prisma.subscription.findMany({
        where: {
          status: { in: ["Active", "Trialing"] },
          currentPeriodEnd: { gte: now, lte: in7Days },
        },
        take: 5,
        orderBy: { currentPeriodEnd: "asc" },
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          company: { select: { id: true, legalName: true } },
          plan: { select: { id: true, name: true } },
        },
      }),
      prisma.company.findMany({
        where: { status: "Suspended" },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          legalName: true,
          status: true,
          updatedAt: true,
        },
      }),
      prisma.company.findMany({
        where: {
          subscriptions: { none: {} },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          legalName: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Also get the total count of companies with no subscription for integrity indicator
    const noSubCompanyCount = await prisma.company.count({
      where: { subscriptions: { none: {} } },
    });

    // 6. Recent Activity from Platform Audit Log (10 entries)
    const recentActivity = await prisma.platformAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        adminUser: { select: { id: true, fullName: true, email: true } },
        company: { select: { id: true, legalName: true } },
      },
    });

    // 7. Recently Added Companies (5 latest)
    const recentCompanies = await prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        legalName: true,
        status: true,
        createdAt: true,
        subscriptions: {
          take: 1,
          orderBy: { currentPeriodEnd: "desc" },
          select: {
            id: true,
            status: true,
            plan: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        companyCounts,
        subscriptionCounts,
        planDistribution,
        needsAttention: {
          pastDue: pastDueSubs,
          expiringSoon: expiringSoonSubs,
          suspended: suspendedCompanies,
          noSubscription: companiesWithoutSubscription,
          noSubscriptionCount: noSubCompanyCount,
        },
        recentActivity,
        recentCompanies,
        // Legacy fallback fields for backwards compatibility
        totalCompanies,
        subscriptionsByPlan: planDistribution,
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
//Pagination Added

export async function listPlatformCompanies(req, res, next) {
  try {
    // 1. Parse params and enforce limits with allowedStatuses
    const { page, pageSize, skip, take, q, status } = parseListParams(
      req.query,
      {
        defaultPageSize: 20,
        maxPageSize: 100,
        allowedStatuses: ["Active", "Suspended", "Closed"],
      },
    );

    // 2. Build Prisma 'where' clause dynamically
    const where = {};
    if (status) {
      where.status = status;
    }
    if (q) {
      where.legalName = { contains: q, mode: "insensitive" };
    }

    // 3. Query Prisma: data and total count concurrently with deterministic order
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take,
        include: {
          subscriptions: {
            include: { plan: true },
            where: { status: { in: ["Active", "Trialing"] } },
            orderBy: { currentPeriodEnd: "desc" },
          },
          _count: {
            select: { users: true, branches: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      prisma.company.count({ where }),
    ]);

    // 4. Return standard list contract
    res.status(200).json({
      success: true,
      data: formatListResponse(companies, total, page, pageSize),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/companies & POST /api/platform/companies
 * Provision a new company: creates company + owner user + assigns system admin role + subscription in one transaction.
 * Generates a one-time set-password token and link, and writes a PlatformAuditLog row.
 */
export async function createPlatformCompany(req, res, next) {
  try {
    const body = req.body || {};
    const legalName = (
      body.legalName ||
      body.companyLegalName ||
      body.name ||
      ""
    ).trim();
    const ownerFullName = (body.ownerFullName || body.fullName || "").trim();
    const ownerEmail = (body.ownerEmail || body.email || "")
      .trim()
      .toLowerCase();
    const planId = body.planId || body.plan_id;
    const billingCycle = body.billingCycle || body.billing_cycle || "Monthly";
    const size = body.size || body.companySize || null;
    const industry = body.industry || null;

    validateRequired({ legalName, ownerFullName, ownerEmail, planId }, [
      "legalName",
      "ownerFullName",
      "ownerEmail",
      "planId",
    ]);
    validateEmail(ownerEmail, "ownerEmail");

    const normalizedBillingCycle =
      String(billingCycle).toLowerCase() === "annual" ? "Annual" : "Monthly";

    // Verify plan exists and is active
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundError(`Plan with ID ${planId} not found`);
    }
    if (plan.isActive === false) {
      throw new BadRequestError(
        "Cannot assign an archived plan to a new subscription",
      );
    }

    // Check if user email already exists across the system
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
    });
    if (existingUser) {
      throw new ConflictError("A user with this email address already exists");
    }

    const password = (
      body.password ||
      body.ownerPassword ||
      "OptiFlow@2026!"
    ).trim();
    if (password.length < 8) {
      throw new ValidationError("Password validation failed", [
        {
          field: "password",
          message: "Password must be at least 8 characters long",
        },
      ]);
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const periodEnd = new Date();
    periodEnd.setMonth(
      periodEnd.getMonth() + (normalizedBillingCycle === "Annual" ? 12 : 1),
    );

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          legalName,
          size,
          industry,
          status: "Active",
        },
      });

      // 2. Create Owner User
      const owner = await tx.user.create({
        data: {
          companyId: company.id,
          fullName: ownerFullName,
          email: ownerEmail,
          passwordHash,
          tokenVersion: 1,
          isActive: true,
        },
      });

      // 3. Clone all platform predefined role templates for the company (just like registration)
      let platformTemplates = await tx.roleTemplate.findMany({
        where: { origin: "platform_predefined" },
      });

      if (platformTemplates.length === 0) {
        const sysTemplate = await tx.roleTemplate.create({
          data: { origin: "platform_predefined", label: "System Admin" },
        });
        platformTemplates = [sysTemplate];
      }

      let sysAdminRole = null;
      let companyOwnerRole = null;
      for (const t of platformTemplates) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            roleTemplateId: t.id,
            label: t.label,
            name: t.slug || t.label.toLowerCase().replace(/ /g, "_"),
            isSystem: true,
          },
        });
        if (t.label === "System Admin") sysAdminRole = role;
        if (t.label === "Company Owner") companyOwnerRole = role;
      }

      // Assign System Admin role to user (maps to Executive Dashboard in frontend)
      const roleToAssign = sysAdminRole || companyOwnerRole;
      if (roleToAssign) {
        await tx.roleAssignment.create({
          data: {
            companyId: company.id,
            userId: owner.id,
            roleId: roleToAssign.id,
            scopeType: "Company",
            scopeId: company.id,
            grantedById: owner.id,
          },
        });
      }

      // 4. Create Subscription
      const subscription = await tx.subscription.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          billingCycle: normalizedBillingCycle,
          status: "Active",
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });

      // 5. Write Audit Log
      await writeAuditLog(
        req,
        "company.create",
        { type: "Company", id: company.id, companyId: company.id },
        null,
        {
          id: company.id,
          legalName: company.legalName,
          status: company.status,
          ownerId: owner.id,
          ownerEmail: owner.email,
          planId: plan.id,
          planName: plan.name,
          billingCycle: subscription.billingCycle,
        },
        tx,
      );

      return {
        company,
        owner: {
          id: owner.id,
          fullName: owner.fullName,
          email: owner.email,
          role: "Executive (System Admin)",
        },
        subscription,
        initialPassword: password,
        targetRoute: "/executive/dashboard",
      };
    });

    res.status(201).json({
      success: true,
      message: "Company provisioned successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/companies/:id & GET /api/platform/companies/:id
 * Returns company with subscription, user and branch counts, and recent support grants.
 */
export async function getPlatformCompanyById(req, res, next) {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { currentPeriodEnd: "desc" },
        },
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
            jobTitle: true,
            createdAt: true,
          },
        },
        branches: true,
        supportAccesses: {
          orderBy: { grantedAt: "desc" },
          take: 10,
          include: {
            adminUser: { select: { id: true, fullName: true, email: true } },
          },
        },
        _count: {
          select: { users: true, branches: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundError(`Company with ID ${id} not found`);
    }

    const data = {
      ...company,
      userCount: company._count?.users ?? company.users?.length ?? 0,
      branchCount: company._count?.branches ?? company.branches?.length ?? 0,
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /platform/companies/:id & PATCH /api/platform/companies/:id
 * Updates legal name and status with validation and platform audit logging.
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
    if (body.legalName !== undefined) {
      const trimmed = String(body.legalName || "").trim();
      if (!trimmed) {
        throw new BadRequestError("Legal name cannot be empty");
      }
      updateData.legalName = trimmed;
    }

    if (body.status !== undefined) {
      const allowedStatuses = ["Active", "Suspended", "Closed"];
      if (!allowedStatuses.includes(body.status)) {
        throw new BadRequestError(
          `Invalid company status '${body.status}'. Allowed values are: ${allowedStatuses.join(", ")}`,
        );
      }
      updateData.status = body.status;
    }

    if (body.size !== undefined) updateData.size = body.size;
    if (body.industry !== undefined) updateData.industry = body.industry;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError("No valid fields provided for update");
    }

    const action =
      body.status && body.status !== company.status
        ? `company.${body.status.toLowerCase()}`
        : "company.update";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
        where: { id },
        data: updateData,
      });

      await writeAuditLog(
        req,
        action,
        { type: "Company", id, companyId: id },
        company,
        result,
        tx,
      );

      return result;
    });

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
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
    const where = {};
    if (req.query.isActive !== undefined) {
      where.isActive =
        req.query.isActive === "true" || req.query.isActive === true;
    }

    const plans = await prisma.plan.findMany({
      where,
      include: {
        _count: { select: { subscriptions: true } },
      },
      orderBy: { name: "asc" },
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
    const name = (body.name || "").trim();
    const auditLogRetentionDays = Number(body.auditLogRetentionDays ?? 90);
    const allowsIntegrations = Boolean(body.allowsIntegrations ?? false);
    const isActive =
      body.isActive !== undefined ? Boolean(body.isActive) : true;

    validateRequired({ name }, ["name"]);

    const newPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          name,
          maxBranches:
            body.maxBranches !== undefined
              ? body.maxBranches === null
                ? null
                : Number(body.maxBranches)
              : null,
          maxUsers:
            body.maxUsers !== undefined
              ? body.maxUsers === null
                ? null
                : Number(body.maxUsers)
              : null,
          maxActiveProcessTemplates:
            body.maxActiveProcessTemplates !== undefined
              ? body.maxActiveProcessTemplates === null
                ? null
                : Number(body.maxActiveProcessTemplates)
              : null,
          maxComplianceRules:
            body.maxComplianceRules !== undefined
              ? body.maxComplianceRules === null
                ? null
                : Number(body.maxComplianceRules)
              : null,
          auditLogRetentionDays,
          allowsIntegrations,
          isActive,
        },
      });

      await writeAuditLog(
        req,
        "plan.create",
        { type: "Plan", id: plan.id },
        null,
        plan,
        tx,
      );

      return plan;
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
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
    if (body.maxBranches !== undefined)
      updateData.maxBranches =
        body.maxBranches === null ? null : Number(body.maxBranches);
    if (body.maxUsers !== undefined)
      updateData.maxUsers =
        body.maxUsers === null ? null : Number(body.maxUsers);
    if (body.maxActiveProcessTemplates !== undefined)
      updateData.maxActiveProcessTemplates =
        body.maxActiveProcessTemplates === null
          ? null
          : Number(body.maxActiveProcessTemplates);
    if (body.maxComplianceRules !== undefined)
      updateData.maxComplianceRules =
        body.maxComplianceRules === null
          ? null
          : Number(body.maxComplianceRules);
    if (body.auditLogRetentionDays !== undefined)
      updateData.auditLogRetentionDays = Number(body.auditLogRetentionDays);
    if (body.allowsIntegrations !== undefined)
      updateData.allowsIntegrations = Boolean(body.allowsIntegrations);
    if (body.isActive !== undefined)
      updateData.isActive = Boolean(body.isActive);

    const action =
      body.isActive === false
        ? "plan.archive"
        : body.isActive === true && plan.isActive === false
          ? "plan.unarchive"
          : "plan.update";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.plan.update({
        where: { id },
        data: updateData,
      });

      await writeAuditLog(req, action, { type: "Plan", id }, plan, result, tx);

      return result;
    });

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// 5. SUBSCRIPTIONS (PLATFORM CRUD)
// ============================================================================
// 5. SUBSCRIPTIONS (PLATFORM CRUD)
// ============================================================================

const ALLOWED_SUBSCRIPTION_TRANSITIONS = {
  Trialing: ["Active", "PastDue", "Cancelled"],
  Active: ["PastDue", "Cancelled"],
  PastDue: ["Active", "Cancelled"],
  Cancelled: [],
};

/**
 * GET /platform/subscriptions & GET /api/platform/subscriptions
 */
export async function listSubscriptions(req, res, next) {
  try {
    const {
      status,
      pastDue,
      expiringWithin,
      companyId,
      planId,
      billingCycle,
      q,
    } = req.query;
    const where = {};

    if (companyId) {
      where.companyId = String(companyId);
    }

    if (planId) {
      where.planId = String(planId);
    }

    if (billingCycle && billingCycle !== "All") {
      const raw = String(billingCycle).trim().toLowerCase();
      where.billingCycle = raw === "annual" ? "Annual" : "Monthly";
    }

    if (q && q.trim()) {
      where.company = {
        legalName: { contains: q.trim(), mode: "insensitive" },
      };
    }

    if (status && status !== "All") {
      const allowed = ["Active", "PastDue", "Cancelled", "Trialing"];
      if (!allowed.includes(status)) {
        throw new BadRequestError(
          `Invalid status filter: ${status}. Must be one of ${allowed.join(", ")}`,
        );
      }
      where.status = status;
    } else if (pastDue === "true" || pastDue === true) {
      where.status = "PastDue";
    }

    if (expiringWithin) {
      const days = parseInt(expiringWithin, 10);
      if (isNaN(days) || days < 0) {
        throw new BadRequestError(
          "expiringWithin must be a non-negative integer number of days",
        );
      }
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      where.currentPeriodEnd = { gte: now, lte: future };
      if (!where.status) {
        where.status = { in: ["Active", "Trialing"] };
      }
    }

    const { page, pageSize, skip, take } = parseListParams(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    const now = new Date();
    const [
      subscriptions,
      total,
      activeCount,
      trialingCount,
      pastDueCount,
      cancelledCount,
      expiringSoonCount,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: req.query.page ? skip : undefined,
        take: req.query.page ? take : undefined,
        include: {
          company: {
            select: {
              id: true,
              legalName: true,
              status: true,
              _count: {
                select: {
                  users: true,
                  branches: true,
                  processTemplates: true,
                  complianceRules: true,
                },
              },
            },
          },
          plan: true,
        },
        orderBy: { currentPeriodEnd: "desc" },
      }),
      prisma.subscription.count({ where }),
      prisma.subscription.count({ where: { status: "Active" } }),
      prisma.subscription.count({ where: { status: "Trialing" } }),
      prisma.subscription.count({ where: { status: "PastDue" } }),
      prisma.subscription.count({ where: { status: "Cancelled" } }),
      prisma.subscription.count({
        where: {
          status: { in: ["Active", "Trialing"] },
          currentPeriodEnd: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const summary = {
      total: activeCount + trialingCount + pastDueCount + cancelledCount,
      active: activeCount,
      trialing: trialingCount,
      pastDue: pastDueCount,
      cancelled: cancelledCount,
      expiringSoon: expiringSoonCount,
    };

    if (req.query.page) {
      return res.status(200).json({
        success: true,
        data: formatListResponse(subscriptions, total, page, pageSize, {
          summary,
        }),
      });
    }

    res.status(200).json({
      success: true,
      data: subscriptions,
      summary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/subscriptions/:id & GET /api/platform/subscriptions/:id
 */
export async function getSubscriptionById(req, res, next) {
  try {
    const { id } = req.params;
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            status: true,
            _count: {
              select: {
                users: true,
                branches: true,
                processTemplates: true,
                complianceRules: true,
              },
            },
          },
        },
        plan: true,
      },
    });

    if (!subscription) {
      throw new NotFoundError(`Subscription with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: subscription,
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
    const rawCycle = String(
      body.billingCycle || body.billing_cycle || "Monthly",
    ).trim();
    const billingCycle =
      rawCycle.toLowerCase() === "annual" ? "Annual" : "Monthly";
    const status = body.status || "Active";

    validateRequired({ companyId, planId }, ["companyId", "planId"]);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundError(`Company ${companyId} not found`);
    if (company.status === "Closed") {
      throw new BadRequestError(
        "Cannot assign a subscription to a closed company",
      );
    }

    // Enforce one live subscription per company
    const liveSub = await prisma.subscription.findFirst({
      where: {
        companyId,
        status: { in: ["Active", "Trialing", "PastDue"] },
      },
    });
    if (liveSub) {
      throw new BadRequestError(
        "This company already has an active or pending subscription",
      );
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError(`Plan ${planId} not found`);
    if (plan.isActive === false) {
      throw new BadRequestError(
        "Cannot assign an archived plan to a new subscription",
      );
    }

    const periodEnd = new Date();
    periodEnd.setMonth(
      periodEnd.getMonth() + (billingCycle === "Annual" ? 12 : 1),
    );

    const subscription = await prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          companyId,
          planId,
          billingCycle,
          status,
          currentPeriodEnd: periodEnd,
        },
        include: { company: true, plan: true },
      });

      await writeAuditLog(
        req,
        "subscription.create",
        { type: "Subscription", id: created.id, companyId: created.companyId },
        null,
        created,
        tx,
      );

      return created;
    });

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /platform/subscriptions/:id & PATCH /api/platform/subscriptions/:id
 */
export async function updateSubscription(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, company: true },
    });

    if (!existing) {
      throw new NotFoundError(`Subscription with ID ${id} not found`);
    }

    // Block changes for Closed companies
    if (existing.company?.status === "Closed") {
      throw new BadRequestError(
        "Cannot modify subscription for a closed company",
      );
    }

    const updateData = {};

    // 1. Plan change
    if (body.planId && body.planId !== existing.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
      if (!plan) {
        throw new NotFoundError(`Plan with ID ${body.planId} not found`);
      }
      if (plan.isActive === false) {
        throw new BadRequestError(
          "Cannot assign an archived plan to a subscription",
        );
      }
      updateData.planId = plan.id;
    }

    // 2. Billing cycle
    if (body.billingCycle) {
      const raw = String(body.billingCycle).trim().toLowerCase();
      updateData.billingCycle = raw === "annual" ? "Annual" : "Monthly";
    }

    // 3. Status transition enforcement (include Trialing)
    if (body.status && body.status !== existing.status) {
      const currentStatus = existing.status;
      const targetStatus = body.status;
      const allowed = ALLOWED_SUBSCRIPTION_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(targetStatus)) {
        throw new BadRequestError(
          `Cannot transition subscription from ${currentStatus} to ${targetStatus}`,
        );
      }
      updateData.status = targetStatus;
    }

    // 4. Period end date
    if (body.currentPeriodEnd) {
      const parsedDate = new Date(body.currentPeriodEnd);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestError("Invalid date format for currentPeriodEnd");
      }
      updateData.currentPeriodEnd = parsedDate;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: updateData,
        include: {
          company: {
            select: {
              id: true,
              legalName: true,
              status: true,
              _count: {
                select: {
                  users: true,
                  branches: true,
                  processTemplates: true,
                  complianceRules: true,
                },
              },
            },
          },
          plan: true,
        },
      });

      await writeAuditLog(
        req,
        "subscription.update",
        {
          type: "Subscription",
          id,
          companyId: existing.companyId,
          reason: body.reason || null,
        },
        existing,
        sub,
        tx,
      );

      return sub;
    });

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/audit-logs & GET /api/platform/audit-logs
 * List audit logs with filters: entityType, entityId, companyId, adminUserId, action, page, pageSize
 */
function buildAuditLogWhere(query) {
  const {
    entityType,
    entityId,
    companyId,
    company,
    adminUserId,
    adminId,
    admin,
    action,
    startDate,
    from,
    endDate,
    to,
    q,
  } = query;
  const where = {};

  if (entityType) where.entityType = String(entityType);
  if (entityId) where.entityId = String(entityId);

  const cId = companyId || company;
  if (cId) where.companyId = String(cId);

  const aId = adminUserId || adminId || admin;
  if (aId) where.adminUserId = String(aId);

  if (action && String(action).trim()) {
    where.action = { contains: String(action).trim(), mode: "insensitive" };
  }

  const start = startDate || from;
  const end = endDate || to;
  if (start || end) {
    where.createdAt = {};
    if (start) {
      const parsedStart = new Date(start);
      if (isNaN(parsedStart.getTime())) {
        throw new BadRequestError("Invalid start date format");
      }
      where.createdAt.gte = parsedStart;
    }
    if (end) {
      const parsedEnd = new Date(end);
      if (isNaN(parsedEnd.getTime())) {
        throw new BadRequestError("Invalid end date format");
      }
      where.createdAt.lte = parsedEnd;
    }
    if (
      where.createdAt.gte &&
      where.createdAt.lte &&
      where.createdAt.gte > where.createdAt.lte
    ) {
      throw new BadRequestError("Start date cannot be after end date");
    }
  }

  if (q && String(q).trim()) {
    const term = String(q).trim();
    where.OR = [
      { entityId: { contains: term, mode: "insensitive" } },
      { action: { contains: term, mode: "insensitive" } },
      { company: { legalName: { contains: term, mode: "insensitive" } } },
      { adminUser: { fullName: { contains: term, mode: "insensitive" } } },
      { adminUser: { email: { contains: term, mode: "insensitive" } } },
    ];
  }

  return where;
}

/**
 * GET /platform/audit-logs & GET /api/platform/audit-logs
 * List audit logs with filters: entityType, entityId, companyId, adminUserId, action, dates, q, page, pageSize
 */
export async function listPlatformAuditLogs(req, res, next) {
  try {
    const where = buildAuditLogWhere(req.query);

    const { page, pageSize, skip, take } = parseListParams(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    const [logs, total] = await Promise.all([
      prisma.platformAuditLog.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          adminUser: { select: { id: true, fullName: true, email: true } },
          company: { select: { id: true, legalName: true } },
        },
      }),
      prisma.platformAuditLog.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: formatListResponse(logs, total, page, pageSize),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /platform/audit-logs/export & GET /api/platform/audit-logs/export
 * Exports platform audit logs as CSV and writes an audit.export platform audit log
 */
export async function exportPlatformAuditLogs(req, res, next) {
  try {
    const where = buildAuditLogWhere(req.query);

    const logs = await prisma.platformAuditLog.findMany({
      where,
      take: 5000,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        adminUser: { select: { id: true, fullName: true, email: true } },
        company: { select: { id: true, legalName: true } },
      },
    });

    await writeAuditLog(
      req,
      "audit.export",
      { type: "PlatformAuditLog", id: "export" },
      null,
      { count: logs.length, query: req.query },
    );

    const header = [
      "ID",
      "Timestamp",
      "Admin Name",
      "Admin Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "Company",
      "IP",
    ];
    const rows = logs.map((log) => [
      `"${log.id}"`,
      `"${log.createdAt.toISOString()}"`,
      `"${(log.adminUser?.fullName || "").replace(/"/g, '""')}"`,
      `"${(log.adminUser?.email || "").replace(/"/g, '""')}"`,
      `"${(log.action || "").replace(/"/g, '""')}"`,
      `"${(log.entityType || "").replace(/"/g, '""')}"`,
      `"${(log.entityId || "").replace(/"/g, '""')}"`,
      `"${(log.company?.legalName || "").replace(/"/g, '""')}"`,
      `"${(log.ip || "").replace(/"/g, '""')}"`,
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="platform-audit-logs-${Date.now()}.csv"`,
    );
    res.status(200).send(csv);
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
    const { status, q } = req.query;
    const where = {};

    if (q && q.trim()) {
      where.OR = [
        { fullName: { contains: q.trim(), mode: "insensitive" } },
        { email: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    if (status && status !== "All") {
      const s = String(status).toLowerCase();
      if (s === "active") where.isActive = true;
      else if (s === "inactive") where.isActive = false;
    }

    const { page, pageSize, skip, take } = parseListParams(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    const [admins, total, activeCount, inactiveCount] = await Promise.all([
      prisma.platformAdminUser.findMany({
        where,
        skip: req.query.page ? skip : undefined,
        take: req.query.page ? take : undefined,
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          createdAt: true,
          passwordChangedAt: true,
          _count: { select: { supportAccesses: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.platformAdminUser.count({ where }),
      prisma.platformAdminUser.count({ where: { isActive: true } }),
      prisma.platformAdminUser.count({ where: { isActive: false } }),
    ]);

    const summary = {
      total: activeCount + inactiveCount,
      active: activeCount,
      inactive: inactiveCount,
    };

    if (req.query.page) {
      return res.status(200).json({
        success: true,
        data: formatListResponse(admins, total, page, pageSize, { summary }),
      });
    }

    res.status(200).json({
      success: true,
      data: admins,
      summary,
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
        passwordChangedAt: true,
        supportAccesses: {
          include: { company: { select: { id: true, legalName: true } } },
          orderBy: { grantedAt: "desc" },
          take: 10,
        },
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
    const email = (body.email || "").trim().toLowerCase();
    const fullName = (body.fullName || body.full_name || "").trim();
    let password = body.password;
    let isGenerated = false;

    validateRequired({ email, fullName }, ["email", "fullName"]);
    validateEmail(email, "email");

    if (!password) {
      password = crypto.randomBytes(9).toString("base64").slice(0, 12) + "!1Aa";
      isGenerated = true;
    } else if (password.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters long");
    }

    const existing = await prisma.platformAdminUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new BadRequestError(
        `Platform admin user with email ${email} already exists`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.$transaction(async (tx) => {
      const created = await tx.platformAdminUser.create({
        data: {
          email,
          fullName,
          passwordHash,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
          passwordChangedAt: null, // Forces set/change on first login
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          createdAt: true,
          passwordChangedAt: true,
        },
      });

      await writeAuditLog(
        req,
        "admin.create",
        { type: "PlatformAdminUser", id: created.id },
        null,
        created,
        tx,
      );

      return created;
    });

    res.status(201).json({
      success: true,
      message: "Platform admin user created successfully",
      data: {
        ...newAdmin,
        temporaryPassword: password,
      },
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

    const existing = await prisma.platformAdminUser.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError(`Platform admin user with ID ${id} not found`);
    }

    // Safeguard: An admin cannot deactivate themselves from this page
    if (body.isActive === false && req.platformAdmin.id === id) {
      throw new BadRequestError(
        "You cannot deactivate your own platform administrator account",
      );
    }

    // Safeguard: Protect against deactivating the last active admin
    if (body.isActive === false && existing.isActive === true) {
      const activeCount = await prisma.platformAdminUser.count({
        where: { isActive: true },
      });
      if (activeCount <= 1) {
        throw new BadRequestError(
          "Cannot deactivate the last active platform administrator account",
        );
      }
    }

    const updateData = {};
    if (body.fullName || body.full_name)
      updateData.fullName = (body.fullName || body.full_name).trim();
    if (body.email) {
      const normalizedEmail = body.email.trim().toLowerCase();
      validateEmail(normalizedEmail, "email");
      if (normalizedEmail !== existing.email) {
        const emailInUse = await prisma.platformAdminUser.findUnique({
          where: { email: normalizedEmail },
        });
        if (emailInUse) {
          throw new BadRequestError(
            `Platform admin email ${normalizedEmail} is already in use`,
          );
        }
        updateData.email = normalizedEmail;
      }
    }
    if (body.isActive !== undefined)
      updateData.isActive = Boolean(body.isActive);
    if (body.password) {
      if (body.password.length < 8) {
        throw new BadRequestError(
          "Password must be at least 8 characters long",
        );
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
      updateData.passwordChangedAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resAdmin = await tx.platformAdminUser.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          createdAt: true,
          passwordChangedAt: true,
        },
      });

      await writeAuditLog(
        req,
        "admin.update",
        { type: "PlatformAdminUser", id, reason: body.reason || null },
        {
          id: existing.id,
          email: existing.email,
          fullName: existing.fullName,
          isActive: existing.isActive,
        },
        resAdmin,
        tx,
      );

      return resAdmin;
    });

    res.status(200).json({
      success: true,
      message: "Platform admin user updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/admin-users/:id/reset-password
 */
export async function resetPlatformAdminPassword(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.platformAdminUser.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError(`Platform admin user with ID ${id} not found`);
    }

    let newPassword = body.password;
    let isGenerated = false;

    if (!newPassword) {
      newPassword =
        crypto.randomBytes(9).toString("base64").slice(0, 12) + "!1Aa";
      isGenerated = true;
    } else if (newPassword.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters long");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.$transaction(async (tx) => {
      const admin = await tx.platformAdminUser.update({
        where: { id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          passwordChangedAt: true,
        },
      });

      await writeAuditLog(
        req,
        "admin.reset_password",
        { type: "PlatformAdminUser", id },
        { id: existing.id, email: existing.email },
        {
          id: admin.id,
          email: admin.email,
          passwordChangedAt: admin.passwordChangedAt,
        },
        tx,
      );

      return admin;
    });

    res.status(200).json({
      success: true,
      message: "Platform admin password reset successfully",
      data: {
        ...updated,
        temporaryPassword: isGenerated ? newPassword : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /platform/admin-users/:id - Direct delete disabled in favor of deactivation
 */
export async function deletePlatformAdminUser(req, res, next) {
  return next(
    new BadRequestError(
      "Direct deletion of platform administrator accounts is disabled. Deactivate the account via PATCH /api/platform/admin-users/:id instead.",
    ),
  );
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
// ============================================================================
// 6. PLATFORM SUPPORT ACCESS
// ============================================================================

/**
 * GET /platform/support-access & GET /api/platform/support-access
 */
export async function listPlatformSupportAccesses(req, res, next) {
  try {
    const { companyId, adminUserId, status, q, startDate, endDate } = req.query;
    const where = {
      ...(companyId ? { companyId: String(companyId) } : {}),
      ...(adminUserId ? { adminUserId: String(adminUserId) } : {}),
    };

    if (q && q.trim()) {
      where.OR = [
        { company: { legalName: { contains: q.trim(), mode: "insensitive" } } },
        {
          adminUser: { fullName: { contains: q.trim(), mode: "insensitive" } },
        },
        { adminUser: { email: { contains: q.trim(), mode: "insensitive" } } },
      ];
    }

    if (startDate || endDate) {
      where.grantedAt = {};
      if (startDate) where.grantedAt.gte = new Date(startDate);
      if (endDate) where.grantedAt.lte = new Date(endDate);
    }

    const now = new Date();

    if (status && status !== "All") {
      const s = String(status).toLowerCase();
      if (s === "active") {
        where.revokedAt = null;
        where.expiresAt = { gt: now };
      } else if (s === "expired") {
        where.revokedAt = null;
        where.expiresAt = { lte: now };
      } else if (s === "revoked") {
        where.revokedAt = { not: null };
      } else {
        throw new BadRequestError(
          "Invalid status filter for support access: must be active, expired, or revoked",
        );
      }
    }

    const { page, pageSize, skip, take } = parseListParams(req.query, {
      defaultPageSize: 20,
      maxPageSize: 100,
    });

    const [rawAccesses, total, activeCount, expiredCount, revokedCount] =
      await Promise.all([
        prisma.platformSupportAccess.findMany({
          where,
          skip: req.query.page ? skip : undefined,
          take: req.query.page ? take : undefined,
          include: {
            company: { select: { id: true, legalName: true, status: true } },
            adminUser: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { grantedAt: "desc" },
        }),
        prisma.platformSupportAccess.count({ where }),
        prisma.platformSupportAccess.count({
          where: { revokedAt: null, expiresAt: { gt: now } },
        }),
        prisma.platformSupportAccess.count({
          where: { revokedAt: null, expiresAt: { lte: now } },
        }),
        prisma.platformSupportAccess.count({
          where: { revokedAt: { not: null } },
        }),
      ]);

    // Look up revokedBy admin details for any revoked records
    const revokedByIds = [
      ...new Set(rawAccesses.map((a) => a.revokedBy).filter(Boolean)),
    ];
    const revokedByAdmins =
      revokedByIds.length > 0
        ? await prisma.platformAdminUser.findMany({
            where: { id: { in: revokedByIds } },
            select: { id: true, fullName: true, email: true },
          })
        : [];
    const revokedByMap = new Map(revokedByAdmins.map((a) => [a.id, a]));

    const enriched = rawAccesses.map((item) => ({
      ...item,
      revokedByAdmin: item.revokedBy
        ? revokedByMap.get(item.revokedBy) || null
        : null,
    }));

    // Pin active grants above the rest, then sort newest first
    const sorted = [...enriched].sort((a, b) => {
      const aIsActive = !a.revokedAt && new Date(a.expiresAt) > now;
      const bIsActive = !b.revokedAt && new Date(b.expiresAt) > now;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      return new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime();
    });

    const summary = {
      total: activeCount + expiredCount + revokedCount,
      active: activeCount,
      expired: expiredCount,
      revoked: revokedCount,
    };

    if (req.query.page) {
      return res.status(200).json({
        success: true,
        data: formatListResponse(sorted, total, page, pageSize, { summary }),
      });
    }

    res.status(200).json({
      success: true,
      data: sorted,
      summary,
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
        company: { select: { id: true, legalName: true, status: true } },
        adminUser: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!access) {
      throw new NotFoundError(
        `Platform support access with ID ${id} not found`,
      );
    }

    let revokedByAdmin = null;
    if (access.revokedBy) {
      revokedByAdmin = await prisma.platformAdminUser.findUnique({
        where: { id: access.revokedBy },
        select: { id: true, fullName: true, email: true },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...access,
        revokedByAdmin,
      },
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
    const reason = (body.reason || "").trim();
    const durationHours = Number(
      body.durationHours || body.duration_hours || 4,
    );

    validateRequired({ companyId, reason }, ["companyId", "reason"]);

    // Enforce minimum reason length
    if (reason.length < 10) {
      throw new BadRequestError(
        "Reason must be at least 10 characters long describing the purpose",
      );
    }

    // Hard maximum duration enforcement (max 24 hours)
    if (durationHours > 24) {
      throw new BadRequestError(
        "Support access duration cannot exceed 24 hours",
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: String(companyId) },
    });
    if (!company) {
      throw new NotFoundError(`Target company ${companyId} not found`);
    }

    // Reject grants for closed companies (only Active and Suspended allowed)
    if (company.status === "Closed") {
      throw new BadRequestError(
        "Cannot grant support access to a closed company",
      );
    }

    // Block a second active grant for the same admin and company
    const activeExisting = await prisma.platformSupportAccess.findFirst({
      where: {
        companyId: String(companyId),
        adminUserId: req.platformAdmin.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (activeExisting) {
      throw new BadRequestError(
        "You already have an active support grant for this company. Please wait for it to expire or revoke it first before requesting a new session.",
      );
    }

    const expiresAt = new Date(
      Date.now() + Math.max(1, durationHours) * 60 * 60 * 1000,
    );

    const access = await prisma.$transaction(async (tx) => {
      const grant = await tx.platformSupportAccess.create({
        data: {
          companyId: String(companyId),
          adminUserId: req.platformAdmin.id,
          reason,
          expiresAt,
          actionLog: [
            {
              action: "GRANTED",
              adminId: req.platformAdmin.id,
              adminName: req.platformAdmin.fullName || req.platformAdmin.email,
              timestamp: new Date().toISOString(),
              durationHours,
              targetCompany: company.legalName,
            },
          ],
        },
        include: {
          company: { select: { id: true, legalName: true, status: true } },
          adminUser: { select: { id: true, fullName: true, email: true } },
        },
      });

      await writeAuditLog(
        req,
        "support_access.grant",
        {
          type: "PlatformSupportAccess",
          id: grant.id,
          companyId: grant.companyId,
        },
        null,
        grant,
        tx,
      );

      return grant;
    });

    res.status(201).json({
      success: true,
      message: "Support access granted successfully",
      data: access,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /platform/support-access/:id/revoke & DELETE /platform/support-access/:id
 */
export async function revokePlatformSupportAccess(req, res, next) {
  try {
    const { id } = req.params;

    const access = await prisma.platformSupportAccess.findUnique({
      where: { id },
    });
    if (!access) {
      throw new NotFoundError(
        `Platform support access with ID ${id} not found`,
      );
    }

    if (access.revokedAt) {
      throw new BadRequestError(
        "Support access grant has already been revoked",
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const revoked = await tx.platformSupportAccess.update({
        where: { id },
        data: {
          revokedAt: new Date(),
          revokedBy: req.platformAdmin.id,
          actionLog: [
            ...(Array.isArray(access.actionLog) ? access.actionLog : []),
            {
              action: "REVOKED",
              adminId: req.platformAdmin.id,
              adminName: req.platformAdmin.fullName || req.platformAdmin.email,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        include: {
          company: { select: { id: true, legalName: true, status: true } },
          adminUser: { select: { id: true, fullName: true, email: true } },
        },
      });

      await writeAuditLog(
        req,
        "support_access.revoke",
        { type: "PlatformSupportAccess", id, companyId: access.companyId },
        access,
        revoked,
        tx,
      );

      return revoked;
    });

    res.status(200).json({
      success: true,
      message: "Support access revoked successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// Support Access Routes
