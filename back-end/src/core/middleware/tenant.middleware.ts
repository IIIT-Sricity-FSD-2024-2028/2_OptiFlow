import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RequestUser
 * ───────────
 * Attached to every request by TenantMiddleware after resolving the user
 * from the DB.
 *
 * role      - The slug sent in x-user-role header (e.g. "superuser").
 *             Kept for legacy guard/header checks.
 * roleLabel - The canonical system role label stored in Role.label
 *             (e.g. "Company Owner", "Access Governance", "Process Admin").
 *             This is what @Roles() in controllers should match against.
 */
export interface RequestUser {
  id: string;
  companyId: string;
  role: string;
  roleLabel: string;
  email: string;
  fullName: string;
  scopeType?: string;
  scopeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Bypass for public auth endpoints
    if (
      req.originalUrl &&
      (req.originalUrl.includes('/companies/register') ||
        req.originalUrl.includes('/auth/login') ||
        req.originalUrl.includes('/auth/public-plans') ||
        req.originalUrl.includes('/auth/register-company'))
    ) {
      return next();
    }

    // Bypass for platform admin routes or requests
    const isPlatformRoute =
      req.originalUrl &&
      (req.originalUrl.includes('/platform') ||
        req.originalUrl.includes('/plans') ||
        req.originalUrl.includes('/subscriptions') ||
        req.originalUrl.includes('/platform-support-access') ||
        req.originalUrl.includes('/platform-admin-users') ||
        (req.originalUrl.includes('/companies') &&
          !req.originalUrl.includes('/companies/register')));
    const hasPlatformHeader =
      req.headers['x-platform-admin-id'] ||
      req.headers['x-user-role'] === 'platform_admin';

    if (isPlatformRoute || hasPlatformHeader) {
      req.user = {
        id:
          (req.headers['x-platform-admin-id'] as string) ||
          'platform-admin-system',
        companyId: 'all',
        role: 'platform_admin',
        roleLabel: 'Platform Admin',
        email: 'admin@system.com',
        fullName: 'Platform Admin',
      };
      return next();
    }

    const rawUserId = req.headers['x-user-id'] || req.headers['x-user-email'];
    const rawRole = (req.headers['x-user-role'] as string) || 'guest';
    const headerCompanyId =
      (req.headers['x-company-id'] as string) || undefined;

    let user: any = null;

    if (rawUserId) {
      const identifier = Array.isArray(rawUserId)
        ? rawUserId[0]
        : String(rawUserId).trim();
      user = await this.prisma.user.findFirst({
        where: { OR: [{ id: identifier }, { email: identifier }] },
        include: {
          roleAssignments: {
            include: { role: true },
            orderBy: { grantedAt: 'desc' },
            take: 5,
          },
        },
      });
    }

    // Fallback: resolve by company context
    if (!user && headerCompanyId) {
      user = await this.prisma.user.findFirst({
        where: { companyId: headerCompanyId },
        include: {
          roleAssignments: { include: { role: true }, take: 5 },
        },
      });
    }

    // Last resort: first seeded user in the DB
    if (!user) {
      user = await this.prisma.user.findFirst({
        include: {
          roleAssignments: { include: { role: true }, take: 5 },
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException(
        'Tenant authentication failed: No valid user or company found in system.',
      );
    }

    // ─── Resolve canonical role label from RoleAssignment ───────────────
    // Priority order mirrors the AuthService login logic so both paths
    // produce the same label for the same user.
    let resolvedRoleLabel = 'Team Member';

    if (user.roleAssignments && user.roleAssignments.length > 0) {
      const assignments: any[] = user.roleAssignments;

      const find = (pred: (l: string) => boolean) =>
        assignments.find((ra) => ra.role && pred(ra.role.label.toLowerCase()));

      const ownerRa = find(
        (l) =>
          l.includes('owner') ||
          l.includes('ceo') ||
          l.includes('cto') ||
          l.includes('coo') ||
          l.includes('superuser'),
      );
      const branchManagerRa = find((l) => l.includes('branch manager'));
      const hrRa = find((l) => l.includes('governance') || l.includes('hr'));
      const processRa = find((l) => l.includes('process'));
      const complianceRa = find((l) => l.includes('compliance'));
      const pmRa = find(
        (l) =>
          l.includes('project') ||
          (l.includes('pm') && !l.includes('compliance')),
      );
      const tlRa = find((l) => l.includes('lead') || l.includes(' tl'));

      const matched =
        ownerRa ||
        branchManagerRa ||
        hrRa ||
        processRa ||
        complianceRa ||
        pmRa ||
        tlRa ||
        assignments[0];

      if (matched?.role?.label) {
        resolvedRoleLabel = matched.role.label;
      }

      const matchedAssignment = matched;

      // ─── Effective slug (from header, or derived from label) ────────────
      const effectiveRole =
        rawRole !== 'guest' && rawRole !== ''
          ? rawRole.toLowerCase()
          : 'team_member';

      req.user = {
        id: user.id,
        companyId: user.companyId,
        role: effectiveRole,
        roleLabel: resolvedRoleLabel,
        email: user.email,
        fullName: user.fullName,
        scopeType: matchedAssignment?.scopeType,
        scopeId: matchedAssignment?.scopeId,
      };
    } else {
      const effectiveRole =
        rawRole !== 'guest' && rawRole !== ''
          ? rawRole.toLowerCase()
          : 'team_member';

      req.user = {
        id: user.id,
        companyId: user.companyId,
        role: effectiveRole,
        roleLabel: resolvedRoleLabel,
        email: user.email,
        fullName: user.fullName,
      };
    }

    // Sync headers for decorators / legacy controllers
    req.headers['x-company-id'] = user.companyId;
    req.headers['x-user-id'] = user.id;

    next();
  }
}
