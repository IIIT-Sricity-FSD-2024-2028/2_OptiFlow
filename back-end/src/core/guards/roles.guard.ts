import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard
 * ──────────
 * Enforces role-based access control at the route level.
 *
 * It checks the incoming request against roles declared with @Roles().
 * The guard supports two identity surfaces so that both the browser
 * frontend (which sends slugs like "superuser") and our TenantMiddleware
 * (which resolves canonical labels like "Company Owner") work seamlessly:
 *
 *   1. req.user.roleLabel  – canonical label resolved from the DB
 *                            e.g. "Company Owner", "Access Governance"
 *   2. req.user.role       – slug sent by the client via x-user-role header
 *                            e.g. "superuser", "hr_manager"
 *   3. x-user-role header  – raw header value (fallback for tooling / Swagger)
 *
 * A match on ANY of the three surfaces grants access.
 *
 * Behaviour matrix:
 *   • No @Roles() on route      → allow (public endpoint)
 *   • No user context at all    → 401 Unauthorized
 *   • User present, no match    → 403 Forbidden
 *   • Any surface matches       → allow (returns true)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Merge metadata from both the handler method AND the controller class
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() declared → public route
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<any>();

    // Must have at least a header or a resolved user context
    const headerRole = (req.headers?.['x-user-role'] as string) ?? '';
    const userRole = req.user?.role ?? '';
    const userRoleLabel = req.user?.roleLabel ?? '';

    if (!headerRole && !userRole && !userRoleLabel) {
      throw new UnauthorizedException(
        'Authorization required: no role context found. ' +
          'Provide an x-user-role header or authenticate via /auth/login.',
      );
    }

    // Case-insensitive multi-surface check
    const normalise = (s: string) => s.toLowerCase().trim();
    const normalised = requiredRoles.map(normalise);

    const allowed =
      (userRoleLabel && normalised.includes(normalise(userRoleLabel))) ||
      (userRole && normalised.includes(normalise(userRole))) ||
      (headerRole && normalised.includes(normalise(headerRole)));

    if (!allowed) {
      const presented = [userRoleLabel, userRole, headerRole]
        .filter(Boolean)
        .join(' / ');
      throw new ForbiddenException(
        `Access denied: your role "${presented}" is not authorised for this endpoint. ` +
          `Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

// Re-export decorator for controllers that import from this path
export { Roles, ROLES_KEY } from './roles.decorator';
