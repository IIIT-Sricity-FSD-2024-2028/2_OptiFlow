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
 * Reads the custom `x-user-role` HTTP request header and checks its value
 * against the list of roles declared via the @Roles() decorator on the
 * target handler or controller class.
 *
 * Behaviour:
 *   • No @Roles() on the route  →  allow (public endpoint).
 *   • `x-user-role` header missing  →  throw UnauthorizedException (401).
 *   • Header present but role not in allowed list  →  throw ForbiddenException (403).
 *   • Role matches  →  allow (returns true).
 *
 * Binding (global):
 *   In main.ts:
 *     import { Reflector } from '@nestjs/core';
 *     import { RolesGuard } from './core/guards/roles.guard';
 *     ...
 *     app.useGlobalGuards(new RolesGuard(new Reflector()));
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Merge metadata from both the handler method AND the controller class
    // so @Roles() on the class applies to all its routes automatically.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() declared → public route, allow unconditionally.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { headers: Record<string, string> }>();
    const userRole = request.headers['x-user-role'];

    // Header completely absent → 401 Unauthorized
    if (!userRole) {
      throw new UnauthorizedException(
        'Authorization required: please include the x-user-role header in your request.',
      );
    }

    // Header present but role not permitted → 403 Forbidden
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access denied: role "${userRole}" is not authorised for this endpoint. ` +
        `Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}