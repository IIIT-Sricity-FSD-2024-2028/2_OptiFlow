import { prisma } from '../config/prisma.js';
import { ForbiddenError } from './errors.js';

/**
 * Verify whether an active, unrevoked, unexpired platform support grant exists
 * for the specified platform administrator and target company.
 */
export async function verifySupportAccessGrant(adminUserId, companyId) {
  if (!adminUserId || !companyId) return false;

  const now = new Date();
  const grant = await prisma.platformSupportAccess.findFirst({
    where: {
      adminUserId: String(adminUserId),
      companyId: String(companyId),
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });

  return Boolean(grant);
}

/**
 * Middleware to enforce active support access grant when a platform administrator
 * interacts with a tenant-scoped resource.
 */
export async function enforceTenantSupportAccess(req, res, next) {
  try {
    if (!req.user?.isPlatform) {
      return next(); // Regular tenant users are governed by their tenant role/permissions
    }

    const targetCompanyId = req.headers['x-target-company'] || req.params.companyId || req.body?.companyId || req.query?.companyId;

    if (!targetCompanyId) {
      throw new ForbiddenError('Target company context is required for platform support access');
    }

    const hasGrant = await verifySupportAccessGrant(req.user.id, targetCompanyId);

    if (!hasGrant) {
      throw new ForbiddenError(
        `Access denied: No active or valid support access grant found for tenant company ${targetCompanyId}`
      );
    }

    req.supportAccessVerified = true;
    next();
  } catch (err) {
    next(err);
  }
}
