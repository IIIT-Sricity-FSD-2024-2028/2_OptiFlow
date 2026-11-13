import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError, ForbiddenError, AppError, PaymentRequiredError, withCode } from '../utils/errors.js';
import { getCompanyAuthState, getCompanyEntitlement } from '../utils/companyAuthCache.js';
import { resolveUserRole } from '../utils/roles.js';

export { resolveUserRole };

/**
 * Checks that a tenant user and their company may hold a session right now.
 * Shared by login and by the per-request middleware so both apply the same rules.
 * Throws an AppError; returns { companyState, entitlement } on success.
 */
export async function assertTenantAccess(user) {
  if (!user.isActive || user.deactivatedAt) {
    throw withCode(new UnauthorizedError('User account has been deactivated'), 'USER_DEACTIVATED');
  }

  const companyState = await getCompanyAuthState(user.companyId);
  if (!companyState) {
    throw withCode(new UnauthorizedError('Company account no longer exists'), 'COMPANY_NOT_FOUND');
  }
  if (companyState.status !== 'Active') {
    throw withCode(
      new UnauthorizedError(`Company account is ${String(companyState.status).toLowerCase()}`),
      companyState.status === 'Suspended' ? 'COMPANY_SUSPENDED' : 'COMPANY_CLOSED',
    );
  }

  const entitlement = getCompanyEntitlement(companyState);
  if (!entitlement.allowed) {
    throw new PaymentRequiredError(entitlement.message, entitlement.code);
  }

  return { companyState, entitlement };
}

/** Routes a user who must change their password may still call. */
const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
  '/auth/me',
  '/api/auth/me',
  '/auth/change-password',
  '/api/auth/change-password',
]);

/**
 * Authentication Middleware
 * Enforces JWT Bearer Token validation and loads verified database user identity.
 * Strictly ignores client-supplied x-* spoofing headers.
 *
 * On every request it re-checks (company status and subscription through a short cache):
 *  - token purpose (set-password tokens are not sessions)
 *  - user is active and token's tokenVersion matches (forced invalidation)
 *  - company is Active and its subscription allows access
 *  - first-login password change has been completed
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    // The token is accepted only in the Authorization header. A token in the URL would end up in
    // browser history, server and proxy logs and Referer headers (SEC-M2-09). Pages that open protected
    // files fetch them with the header instead (react_frontend/src/shared/utils/evidenceFile.js).
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7).trim() : null;

    if (!token) {
      throw new UnauthorizedError('Authentication required: Bearer token is missing');
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

    // Purpose-bound tokens (e.g. one-time set-password links) are never session tokens.
    if (decoded.purpose) {
      throw new UnauthorizedError('Authentication failed: This token cannot be used as a session');
    }

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication failed: Token contains no subject identity');
    }

    // Platform admin tokens are not accepted on tenant routes. Platform admins authenticate on
    // /api/platform/* with their httpOnly cookie. Tenant access by platform staff goes through
    // support-access grants, which are feature-flagged until that flow is finished.
    if (decoded.type === 'platform_admin' || decoded.role === 'platform_admin') {
      if (!env.FEATURE_PLATFORM_SUPPORT_ACCESS) {
        throw new ForbiddenError('Platform administrator tokens cannot access tenant routes');
      }

      const adminUser = await prisma.platformAdminUser.findUnique({
        where: { id: String(userId) },
      });

      if (!adminUser || !adminUser.isActive) {
        throw new UnauthorizedError('Authentication failed: Platform administrator account is not active');
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

    // Reload tenant user from database
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          include: { role: { include: { roleTemplate: { select: { slug: true } } } } },
          orderBy: { grantedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Authentication failed: User account no longer exists');
    }

    // tokenVersion is bumped on password change/set, deactivation and forced sign-out.
    if (decoded.tokenVersion === undefined || decoded.tokenVersion !== user.tokenVersion) {
      throw withCode(
        new UnauthorizedError('Authentication failed: Session has been revoked. Please sign in again.'),
        'SESSION_REVOKED',
      );
    }

    const { companyState, entitlement } = await assertTenantAccess(user);

    const mustChangePassword = user.passwordChangedAt === null;
    const path = (req.originalUrl || req.url || '').split('?')[0];
    if (mustChangePassword && !PASSWORD_CHANGE_ALLOWED_PATHS.has(path)) {
      throw withCode(
        new ForbiddenError('You must set a new password before continuing'),
        'PASSWORD_CHANGE_REQUIRED',
      );
    }

    const { roleLabel, roleSlug, matchedAssignment } = resolveUserRole(user);

    // Attach strictly derived authenticated user object
    req.user = {
      id: user.id,
      companyId: user.companyId,
      companyName: companyState.legalName || '',
      email: user.email,
      fullName: user.fullName,
      jobTitle: user.jobTitle || null,
      managerUserId: user.managerUserId || null,
      role: roleSlug,
      roleLabel,
      scopeType: matchedAssignment?.scopeType || null,
      scopeId: matchedAssignment?.scopeId || null,
      mustChangePassword,
      subscriptionStatus: entitlement.effectiveStatus,
      ...(entitlement.graceEndsAt ? { subscriptionGraceEndsAt: entitlement.graceEndsAt } : {}),
    };

    if (entitlement.effectiveStatus === 'PastDue') {
      res.setHeader('X-Subscription-Warning', `past_due; grace_ends=${entitlement.graceEndsAt}`);
    }

    next();
  } catch (error) {
    next(error);
  }
}
