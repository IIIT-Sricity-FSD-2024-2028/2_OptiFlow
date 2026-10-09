import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError, AppError } from '../utils/errors.js';
import { normalizeRole, toCanonicalRole, ROLES, ROLE_SLUGS } from '../utils/roles.js';

/**
 * Resolves canonical role label and slug from a user's role assignments
 */
export function resolveUserRole(user) {
  let roleLabel = 'Team Member';
  let roleSlug = 'team_member';
  let matchedAssignment = null;

  if (user?.roleAssignments && user.roleAssignments.length > 0) {
    const assignments = user.roleAssignments;

    const findByPattern = (predicate) =>
      assignments.find((ra) => ra.role && predicate((ra.role.label || '').toLowerCase()));

    const ownerRa = findByPattern(
      (l) =>
        l.includes('owner') ||
        l.includes('ceo') ||
        l.includes('cto') ||
        l.includes('coo') ||
        l.includes('superuser')
    );
    const systemAdminRa = findByPattern((l) => l.includes('system admin') || l.includes('system_admin'));
    const branchManagerRa = findByPattern((l) => l.includes('branch manager'));
    const hrRa = findByPattern((l) => l.includes('governance') || l.includes('hr'));
    const processRa = findByPattern((l) => l.includes('process'));
    const complianceRa = findByPattern((l) => l.includes('compliance'));
    const pmRa = findByPattern((l) => l.includes('project') || (l.includes('pm') && !l.includes('compliance')));
    const tlRa = findByPattern((l) => l.includes('lead') || l.includes(' tl'));

    matchedAssignment =
      systemAdminRa ||
      ownerRa ||
      branchManagerRa ||
      hrRa ||
      processRa ||
      complianceRa ||
      pmRa ||
      tlRa ||
      assignments[0];

    if (matchedAssignment?.role?.label) {
      roleLabel = matchedAssignment.role.label;
    }
  }

  const norm = normalizeRole(roleLabel);
  if (ROLE_SLUGS[norm]) {
    if (norm === 'access_governance') { roleSlug = 'hr_manager'; } else if (norm === 'pm') { roleSlug = 'project_manager'; } else if (norm === 'team_lead') { roleSlug = 'team_leader'; } else { roleSlug = norm; }
  } else if (norm.includes('owner') || norm.includes('ceo')) {
    roleSlug = 'company_owner';
  } else if (norm.includes('branch_manager')) {
    roleSlug = 'branch_manager';
  } else if (norm.includes('governance') || norm.includes('hr')) {
    roleSlug = 'hr_manager';
  } else if (norm.includes('process')) {
    roleSlug = 'process_admin';
  } else if (norm.includes('compliance')) {
    roleSlug = 'compliance_officer';
  } else if (norm.includes('project') || norm.includes('pm')) {
    roleSlug = 'project_manager';
  } else if (norm.includes('lead') || norm.includes('leader')) {
    roleSlug = 'team_leader';
  } else if (norm.includes('system_admin')) {
    roleSlug = 'system_admin';
  } else {
    roleSlug = 'team_member';
  }

  return { roleLabel, roleSlug, matchedAssignment };
}

/**
 * Authentication Middleware
 * Enforces JWT Bearer Token validation and loads verified database user identity.
 * Strictly ignores client-supplied x-* spoofing headers.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required: Bearer token is missing');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication required: Bearer token is empty');
    }

    if (!env.JWT_SECRET) {
      throw new AppError('JWT authentication failed: JWT_SECRET is not configured', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Authentication failed: Token has expired');
      }
      throw new UnauthorizedError('Authentication failed: Invalid token signature or format');
    }

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication failed: Token contains no subject identity');
    }

    // --- PLATFORM ADMIN CHECK ---
    if (decoded.type === 'platform_admin' || decoded.role === 'platform_admin') {
      const adminUser = await prisma.platformAdminUser.findUnique({
        where: { id: String(userId) },
      });

      if (!adminUser) {
        throw new UnauthorizedError('Authentication failed: Platform administrator account no longer exists');
      }

      if (!adminUser.isActive) {
        throw new UnauthorizedError('Authentication failed: Platform administrator account is deactivated');
      }

      req.user = {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: 'platform_admin',
        roleLabel: 'Platform Admin',
        isPlatform: true,
      };

      return next();
    }
    // ----------------------------

    // Reload active tenant user from database
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      include: {
        company: {
          include: { subscriptions: true }
        },
        roleAssignments: {
          include: { role: true },
          orderBy: { grantedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Authentication failed: User account no longer exists');
    }

    if (user.status && user.status !== 'Active') {
      throw new UnauthorizedError(`Authentication failed: User account is ${user.status.toLowerCase()}`);
    }

    if (user.deletedAt) {
      throw new UnauthorizedError('Authentication failed: User account has been deactivated');
    }

    if (user.company && user.company.status && user.company.status !== 'Active') {
      throw new UnauthorizedError('Authentication failed: Tenant company account is inactive or suspended');
    }

    // TRIAL & SUBSCRIPTION CHECK ENFORCEMENT
    const activeSub = user.company?.subscriptions?.[0];
    if (activeSub) {
      if (activeSub.status === 'Trialing' && new Date() > new Date(activeSub.currentPeriodEnd)) {
        throw new UnauthorizedError('PAYMENT_REQUIRED: Your 14-day free trial has expired. Please upgrade your plan.');
      }
      if (activeSub.status === 'PastDue' || activeSub.status === 'Cancelled') {
        throw new UnauthorizedError('PAYMENT_REQUIRED: Your subscription is past due or cancelled.');
      }
    }

    const { roleLabel, roleSlug, matchedAssignment } = resolveUserRole(user);

    // Attach strictly derived authenticated user object
    req.user = {
      id: user.id,
      companyId: user.companyId,
      companyName: user.company?.legalName || '',
      email: user.email,
      fullName: user.fullName,
      jobTitle: user.jobTitle || null,
      role: roleSlug,
      roleLabel,
      scopeType: matchedAssignment?.scopeType || null,
      scopeId: matchedAssignment?.scopeId || null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
