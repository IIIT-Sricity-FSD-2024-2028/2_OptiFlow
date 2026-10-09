import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { authenticate, resolveUserRole } from '../middleware/authenticate.js';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  AppError,
} from '../utils/errors.js';
import {
  validateRequired,
  validateEmail,
  validateEnum,
} from '../utils/validation.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


/**
 * Resolves static UI route redirect from role slug
 */
function resolveTargetRoute(roleSlug) {
  switch (roleSlug) {
    case 'system_admin':
      return '/executive/dashboard';
    case 'company_owner':
    case 'branch_manager':
      return '/executive/dashboard';
    case 'hr_manager':
    case 'access_governance':
      return '/hr/dashboard';
    case 'process_admin':
      return '/process-admin/dashboard';
    case 'compliance_officer':
      return '/compliance/dashboard';
    case 'project_manager':
      return '/pm/dashboard';
    case 'team_leader':
    case 'team_lead':
      return '/team-lead/dashboard';
    default:
      return '/member/dashboard';
  }
}

/**
 * POST /auth/login & POST /api/auth/login
 * Verifies email/password credentials, signs JWT, records audit log, and returns user identity.
 */
export async function handleLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};

    validateRequired({ email, password }, ['email', 'password']);
    validateEmail(email);

    if (typeof password !== 'string' || password.trim() === '') {
      throw new UnauthorizedError('Invalid email or password');
    }

    // --- PLATFORM ADMIN CHECK (Unified Login) ---
    // We check the PlatformAdminUser table first. If the email exists here,
    // they are a super-admin logging into the platform dashboard.
    const platformAdmin = await prisma.platformAdminUser.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (platformAdmin) {
      if (!platformAdmin.isActive) {
        throw new UnauthorizedError('Platform administrator account is deactivated');
      }

      const isMatch = await bcrypt.compare(password, platformAdmin.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = jwt.sign(
        {
          sub: platformAdmin.id,
          role: 'platform_admin',
          type: 'platform_admin',
          email: platformAdmin.email,
          fullName: platformAdmin.fullName,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN || '8h' }
      );

      return res.status(200).json({
        success: true,
        message: 'Platform admin authenticated successfully',
        data: {
          success: true,
          token,
          targetRoute: '/platform/dashboard',
          role: 'platform_admin',
          roleSlug: 'platform_admin',
          roleLabel: 'Platform Admin',
          user: {
            id: platformAdmin.id,
            fullName: platformAdmin.fullName,
            email: platformAdmin.email,
            role: 'platform_admin',
            roleLabel: 'Platform Admin',
            assignedRole: 'Platform Admin',
            targetRoute: '/platform/dashboard'
          },
        },
      });
    }
    // --------------------------------------------

    // If not a platform admin, proceed with standard tenant user login
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      include: {
        company: true,
        roleAssignments: {
          include: { role: true },
          orderBy: { grantedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let isMatch = false;
    try {
      if (user.passwordHash) {
        isMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } catch (_) {
      isMatch = false;
    }

    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status && user.status !== 'Active') {
      throw new UnauthorizedError('User account is inactive or suspended');
    }

    if (user.deletedAt) {
      throw new UnauthorizedError('User account has been deactivated');
    }

    if (user.company && user.company.status && user.company.status !== 'Active') {
      throw new UnauthorizedError('Company account is inactive or suspended');
    }

    const { roleLabel, roleSlug, matchedAssignment } = resolveUserRole(user);
    const targetRoute = resolveTargetRoute(roleSlug);

    let branchName = null;
    if (matchedAssignment?.scopeId && user.companyId) {
      const branch = await prisma.branch.findFirst({
        where: { id: matchedAssignment.scopeId, companyId: user.companyId },
        select: { name: true },
      });
      branchName = branch?.name || null;
    }

    if (!env.JWT_SECRET) {
      throw new AppError('JWT authentication failed: JWT_SECRET is not configured', 500);
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        companyId: user.companyId,
        role: roleSlug,
        roleLabel,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Audit login operation
    try {
      await createSystemAuditLog({companyId: user.companyId,
        targetUserId: user.id,
        action: AUDIT_ACTIONS.LOGIN,
        performedById: user.id,
        ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || null,
        newValue: { message: `${user.fullName} logged in successfully as ${roleLabel}` },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during login:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        success: true,
        token,
        targetRoute,
        role: roleSlug,
        roleSlug,
        roleLabel,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          jobTitle: user.jobTitle || null,
          companyId: user.companyId,
          companyName: user.company?.legalName || '',
          role: roleSlug,
          roleLabel,
          assignedRole: roleLabel,
          roleId: matchedAssignment?.roleId || matchedAssignment?.role?.id || null,
          targetRoute,
          scopeType: matchedAssignment?.scopeType || null,
          scopeId: matchedAssignment?.scopeId || null,
          branchName,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/register-company & POST /companies/register
 * Registers a new tenant company, owner account, assigns System Admin role, and returns JWT.
 */
export async function handleRegisterCompany(req, res, next) {
  try {
    const body = req.body || {};
    const companyLegalName = (body.companyLegalName || body.companyName || body.legalName || '').trim();
    const ownerFullName = (body.ownerFullName || body.fullName || body.name || '').trim();
    const ownerEmail = (body.ownerEmail || body.email || '').trim();
    const password = body.password || '';
    const planId = body.planId || null;
    const billingCycle = body.billingCycle || 'MONTHLY';

    validateRequired(
      { companyLegalName, ownerFullName, ownerEmail, password },
      ['companyLegalName', 'ownerFullName', 'ownerEmail', 'password']
    );
    validateEmail(ownerEmail, 'ownerEmail');

    // --- SECURITY IMPLEMENTATION 1: Business Email Validation ---
    // Block common free email providers to ensure B2B legitimacy.
    const freeEmailProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    const emailDomain = ownerEmail.split('@')[1]?.toLowerCase();
    
    if (freeEmailProviders.includes(emailDomain)) {
      throw new AppError('Registration restricted to corporate emails. Please use your work email address.', 400);
    }
    // -------------------------------------------------------------

    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('Password validation failed', [
        { field: 'password', message: 'Password must be at least 8 characters long' },
      ]);
    }

    validateEnum(billingCycle, ['MONTHLY', 'YEARLY', 'Monthly', 'Annual'], 'billingCycle');

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: ownerEmail, mode: 'insensitive' } },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          legalName: companyLegalName,
          size: body.companySize || null,
          industry: body.industry || null,
          status: 'Active',
        },
      });

      // 2. Create User
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          fullName: ownerFullName,
          email: ownerEmail.toLowerCase(),
          passwordHash,
        },
      });

      // 3. Create Subscription
      let effectivePlanId = planId;
      if (!effectivePlanId) {
        const defaultPlan = await tx.plan.findFirst({ select: { id: true } });
        if (defaultPlan) {
          effectivePlanId = defaultPlan.id;
        }
      }

      if (effectivePlanId) {
        // ALWAYS put new signups on a 14-day free trial.
        // We calculate 14 days in milliseconds: 14 days * 24 hrs * 60 mins * 60 secs * 1000 ms
        const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
        
        await tx.subscription.create({
          data: {
            companyId: company.id,
            planId: effectivePlanId,
            billingCycle: 'Monthly', // Default to monthly after trial
            status: 'Trialing', // Activate the trial status!
            currentPeriodEnd: new Date(Date.now() + trialDurationMs), // Expires in exactly 14 days
          },
        });
      }

      // 4. Ensure platform role templates exist
      let platformTemplates = await tx.roleTemplate.findMany({
        where: { origin: 'platform_predefined' },
      });

      if (platformTemplates.length === 0) {
        const sysTemplate = await tx.roleTemplate.create({
          data: { origin: 'platform_predefined', label: 'System Admin' },
        });
        platformTemplates = [sysTemplate];
      }

      // 5. Clone roles for company
      let sysAdminRole = null;
      for (const t of platformTemplates) {
        const role = await tx.role.create({
          data: {
            companyId: company.id,
            roleTemplateId: t.id,
            label: t.label,
            name: t.slug || t.label.toLowerCase().replace(/ /g, '_'),
            isSystem: true,
          },
        });
        if (t.label === 'System Admin') {
          sysAdminRole = role;
        }
      }

      // 6. Assign System Admin role to user
      if (sysAdminRole) {
        await tx.roleAssignment.create({
          data: {
            companyId: company.id,
            userId: user.id,
            roleId: sysAdminRole.id,
            scopeType: 'Company',
            scopeId: company.id,
            grantedById: user.id,
          },
        });
      }

      return { user, company, sysAdminRole };
    });

    if (!env.JWT_SECRET) {
      throw new AppError('JWT authentication failed: JWT_SECRET is not configured', 500);
    }

    const token = jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        companyId: result.company.id,
        role: 'system_admin',
        roleLabel: 'System Admin',
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    // Audit company registration
    try {
      await createSystemAuditLog({companyId: result.company.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: result.user.id,
        newValue: { message: `Company registered: ${result.company.legalName}` },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during registration:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: {
        success: true,
        token,
        targetRoute: 'admin-console/admin-dashboard.html',
        role: 'system_admin',
        roleSlug: 'system_admin',
        roleLabel: 'System Admin',
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          companyId: result.company.id,
          companyName: result.company.legalName,
          role: 'system_admin',
          roleLabel: 'System Admin',
          assignedRole: 'System Admin',
          roleId: result.sysAdminRole?.id || null,
          targetRoute: 'admin-console/admin-dashboard.html',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me & GET /api/auth/me
 * Returns authenticated user identity loaded from database.
 */
export function handleGetMe(req, res) {
  res.status(200).json({
    success: true,
    data: {
      ...(req.user || {}),
      user: req.user,
    },
  });
}

/**
 * GET /auth/public-plans & GET /api/auth/public-plans
 * Returns public subscription plans for registration.
 */
export async function handleGetPublicPlans(req, res, next) {
  try {
    const plans = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        maxBranches: true,
        maxUsers: true,
        allowsIntegrations: true,
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (err) {
    next(err);
  }
}


