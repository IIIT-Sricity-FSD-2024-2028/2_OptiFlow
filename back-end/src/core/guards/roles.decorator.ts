import { SetMetadata } from '@nestjs/common';

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
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
