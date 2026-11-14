import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { authenticate, resolveUserRole, assertTenantAccess } from '../middleware/authenticate.js';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  AppError,
  withCode,
} from '../utils/errors.js';
import {
  validateRequired,
  validateEmail,
  validateEnum,
} from '../utils/validation.js';
import { sendPasswordChangedEmail } from '../services/email.service.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


// Consumer mailbox providers that cannot register a company (SEC-M2-12). Provider families
// (yahoo.co.in, hotmail.fr, outlook.in, live.com ...) are matched by prefix below.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'msn.com',
  'ymail.com', 'rocketmail.com', 'protonmail.com', 'proton.me', 'pm.me', 'tutanota.com',
  'tuta.io', 'fastmail.com', 'hey.com', 'zoho.com', 'zohomail.com', 'yandex.com', 'yandex.ru',
  'mail.com', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'inbox.com', 'mail.ru', 'qq.com',
  '163.com', '126.com', 'sina.com', 'rediffmail.com', 'mailinator.com', 'guerrillamail.com',
  '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com',
]);
const FREE_EMAIL_FAMILIES = /^(yahoo|hotmail|outlook|live)\./;

function isFreeEmailDomain(domain) {
  if (!domain) return false;
  return FREE_EMAIL_DOMAINS.has(domain) || FREE_EMAIL_FAMILIES.test(domain);
}

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
 * Company (tenant) users only. Verifies email/password credentials, signs JWT, records audit log, and returns user identity.
 */
export async function handleLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};

    validateRequired({ email, password }, ['email', 'password']);
    validateEmail(email);

    if (typeof password !== 'string' || password.trim() === '') {
      throw new UnauthorizedError('Invalid email or password');
    }

    // SEC-M2-13: this endpoint authenticates company users only. Platform administrators sign in at
    // POST /platform/auth/login, which issues a shorter-lived platform token. Looking them up here
    // too meant a platform account could shadow a company user with the same email and received the
    // longer tenant token lifetime.
    // Emails are globally unique (case-insensitive index users_email_lower_key). If older data still
    // holds the same address in two companies we refuse to guess which tenant the person means.
    const matches = await prisma.user.findMany({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      take: 2,
      select: { id: true },
    });
    if (matches.length > 1) {
      throw withCode(
        new ConflictError('This email address is linked to more than one account. Please contact support.'),
        'ACCOUNT_AMBIGUOUS',
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      include: {
        company: true,
        roleAssignments: {
          where: { revokedAt: null },
          include: { role: { include: { roleTemplate: { select: { slug: true } } } } },
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

    // Same checks the auth middleware runs on every request (deactivated user, company
    // Active, subscription allows access), so login and later requests cannot disagree.
    await assertTenantAccess(user);

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
        tokenVersion: user.tokenVersion,
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

    // Fetch team memberships if applicable
    let userTeamMembers = [];
    try {
      userTeamMembers = await prisma.teamMember.findMany({
        where: { userId: user.id },
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
      });
    } catch (tmErr) {
      console.warn('[Auth] Notice: Could not fetch team memberships:', tmErr.message);
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
          teams: (user.teamMembers || []).map((tm) => ({
            teamId: tm.team?.id,
            teamName: tm.team?.name,
            role: tm.role || 'Member',
            branchId: tm.team?.branch?.id,
            branchName: tm.team?.branch?.name,
          })),
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
    // Block free / consumer mailbox providers to ensure B2B legitimacy.
    const emailDomain = ownerEmail.split('@')[1]?.toLowerCase();

    if (isFreeEmailDomain(emailDomain)) {
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

    // A platform administrator's email must not be reusable as a company owner (no shadowing).
    const platformAdminWithEmail = await prisma.platformAdminUser.findUnique({
      where: { email: ownerEmail.toLowerCase() },
      select: { id: true },
    });
    if (platformAdminWithEmail) {
      throw new ConflictError('A user with this email address already exists');
    }

    // The plan must exist and be active. Without a requested plan the first active plan is used.
    let chosenPlan = null;
    if (planId) {
      chosenPlan = await prisma.plan.findFirst({
        where: { id: String(planId), isActive: true },
        select: { id: true },
      });
      if (!chosenPlan) {
        throw new ValidationError('Plan validation failed', [
          { field: 'planId', message: 'The selected plan does not exist or is no longer available' },
        ]);
      }
    } else {
      chosenPlan = await prisma.plan.findFirst({
        where: { isActive: true },
        orderBy: [{ maxUsers: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
        select: { id: true },
      });
      if (!chosenPlan) {
        throw new AppError('Registration is temporarily unavailable: no subscription plan is open for sign-up.', 503);
      }
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

      // 3. Create Subscription (the plan was validated above)
      const effectivePlanId = chosenPlan.id;

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

      // 4a. Seed Default Headquarters Branch
      await tx.branch.create({
        data: {
          companyId: company.id,
          name: 'Headquarters',
          code: 'HQ',
        },
      });

      // 4b. Ensure platform role templates exist
      let platformTemplates = await tx.roleTemplate.findMany({
        where: { origin: 'platform_predefined' },
        include: { defaultPermissions: true },
      });

      if (platformTemplates.length === 0) {
        const DEFAULT_TEMPLATES = [
          { label: 'Company Owner', slug: 'company_owner' },
          { label: 'System Admin', slug: 'system_admin' },
          { label: 'Access Governance', slug: 'access_governance' },
          { label: 'Branch Manager', slug: 'branch_manager' },
          { label: 'Process Admin', slug: 'process_admin' },
          { label: 'Project Manager', slug: 'project_manager' },
          { label: 'Compliance Officer', slug: 'compliance_officer' },
          { label: 'Team Lead', slug: 'team_lead' },
          { label: 'Team Member', slug: 'team_member' },
        ];
        platformTemplates = await Promise.all(
          DEFAULT_TEMPLATES.map(async (dt) => {
            const tmpl = await tx.roleTemplate.create({
              data: { origin: 'platform_predefined', label: dt.label, slug: dt.slug },
            });
            return { ...tmpl, defaultPermissions: [] };
          })
        );
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
            permissions: t.defaultPermissions?.length > 0 ? {
              create: t.defaultPermissions.map((dp) => ({
                permissionId: dp.permissionId,
              })),
            } : undefined,
          },
        });
        if (t.slug === 'system_admin') {
          sysAdminRole = role;
        }
      }

      // 6. Assign System Admin role to user. Without that role the owner would silently fall back
      // to Team Member and the company would have no administrator, so fail and roll everything back.
      if (!sysAdminRole) {
        throw new AppError(
          'Registration is temporarily unavailable: the System Admin role template is not configured.',
          500,
        );
      }
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
        tokenVersion: result.user.tokenVersion,
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
      where: { isActive: true },
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

/**
 * POST /auth/set-password & POST /api/auth/set-password
 * Redeems a one-time set-password token to initialize first-owner credentials.
 */
export async function handleSetPassword(req, res, next) {
  try {
    const body = req.body || {};
    const token = body.token;
    const password = body.password;

    validateRequired({ token, password }, ['token', 'password']);

    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('Password validation failed', [
        { field: 'password', message: 'Password must be at least 8 characters long' },
      ]);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired set-password token');
    }

    if (decoded.purpose !== 'set_password') {
      throw new UnauthorizedError('Invalid token purpose');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.companyId !== decoded.companyId) {
      throw new NotFoundError('User not found');
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new BadRequestError('This set-password link has already been used or has expired');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        isActive: true,
        passwordChangedAt: new Date(),
      },
    });

    sendPasswordChangedEmail({ to: user.email, fullName: user.fullName });

    res.status(200).json({
      success: true,
      message: 'Password set successfully. You can now log in.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/change-password (authenticated)
 * Verifies the current password, stores the new one, marks the password as set (lifting the
 * first-login gate), revokes older sessions and returns a fresh token for this session.
 */
export async function handleChangePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    validateRequired({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ValidationError('Password validation failed', [
        { field: 'newPassword', message: 'Password must be at least 8 characters long' },
      ]);
    }
    if (newPassword === currentPassword) {
      throw new ValidationError('Password validation failed', [
        { field: 'newPassword', message: 'New password must be different from the current password' },
      ]);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new NotFoundError('User not found');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Current password is incorrect');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        tokenVersion: { increment: 1 },
        passwordChangedAt: new Date(),
      },
    });

    sendPasswordChangedEmail({ to: user.email, fullName: user.fullName });

    const token = jwt.sign(
      {
        sub: updated.id,
        email: updated.email,
        companyId: updated.companyId,
        role: req.user.role,
        roleLabel: req.user.roleLabel,
        tokenVersion: updated.tokenVersion,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      data: { token },
    });
  } catch (err) {
    next(err);
  }
}
