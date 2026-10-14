import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError, ForbiddenError, AppError } from '../utils/errors.js';

/**
 * Extracts the JWT from cookies (httpOnly) or Authorization Bearer header.
 */
function extractToken(req) {
  // 1. Try reading from httpOnly cookie first
  if (req.cookies && req.cookies.token) {
    return req.cookies.token.trim();
  }

  // Fallback: parse raw Cookie header if cookie-parser middleware is not used
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('token=')) {
        const val = cookie.substring(6).trim();
        if (val) return decodeURIComponent(val);
      }
    }
  }

  // 2. Fallback to Authorization: Bearer <token> for backward compatibility
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Authenticates Platform Administrators.
 * Ensures the token belongs specifically to a platform admin identity,
 * validates against passwordChangedAt, and loads active PlatformAdminUser from database.
 * Explicitly rejects regular tenant tokens.
 */
export async function authenticatePlatformAdmin(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('Platform authentication required: token is missing from cookie or Authorization header');
    }

    if (!env.JWT_SECRET) {
      throw new AppError('JWT authentication failed: JWT_SECRET is not configured', 500);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Platform authentication failed: Token has expired');
      }
      throw new UnauthorizedError('Platform authentication failed: Invalid token signature');
    }

    // Verify platform token flag or role
    if (decoded.role !== 'platform_admin' && decoded.type !== 'platform_admin') {
      throw new ForbiddenError('Access forbidden: Tenant user tokens cannot access platform administration');
    }

    const adminId = decoded.sub || decoded.adminUserId || decoded.id;
    if (!adminId) {
      throw new UnauthorizedError('Platform authentication failed: Missing subject claim');
    }

    const adminUser = await prisma.platformAdminUser.findUnique({
      where: { id: String(adminId) },
    });

    if (!adminUser) {
      throw new UnauthorizedError('Platform authentication failed: Platform admin user does not exist');
    }

    if (!adminUser.isActive) {
      throw new UnauthorizedError('Platform authentication failed: Platform admin account is deactivated');
    }

    // Reject tokens issued prior to password change
    if (adminUser.passwordChangedAt) {
      const tokenIatMs = (decoded.iat || 0) * 1000;
      // Allow 1 second tolerance for clock skew during token issuance
      if (tokenIatMs < adminUser.passwordChangedAt.getTime() - 1000) {
        throw new UnauthorizedError('Platform session expired due to password change. Please log in again.');
      }
    }

    req.platformAdmin = {
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
      role: 'platform_admin',
    };

    next();
  } catch (error) {
    next(error);
  }
}
