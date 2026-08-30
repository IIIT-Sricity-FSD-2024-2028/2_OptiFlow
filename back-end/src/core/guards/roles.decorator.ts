import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

/**
 * @Roles decorator
 * ────────────────
 * Attach this to any controller method (or the whole controller class) to
 * declare which role slugs are allowed to call that endpoint.
 *
 * Usage:
 *   @Roles('superuser', 'hr_manager')
 *   @Get()
 *   findAll() { ... }
 *
 * The value is stored in request metadata under the key 'roles' and is
 * read back by RolesGuard via NestJS Reflector.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiHeader({
      name: 'x-user-role',
      description: `**Role-Based Access Control**\nAllowed roles: \`${roles.join('`, `')}\``,
      required: true,
    }),
  );
};
