import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { hasRole } from '../utils/roles.js';

/**
 * Middleware to enforce role-based access control
 * Accepts canonical role names or role slugs.
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required: no authenticated user found'));
    }

    const userRole = req.user.roleLabel || req.user.role;
    if (!hasRole(userRole, allowedRoles)) {
      return next(
        new ForbiddenError(
          `Access denied: your role "${req.user.roleLabel || req.user.role}" is not authorized for this endpoint. Required: [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}
