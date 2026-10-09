import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError, ForbiddenError, AppError } from '../utils/errors.js';

/**
 * Authenticates Platform Administrators.
 * Ensures the token belongs specifically to a platform admin identity
 * and loads active PlatformAdminUser from database.
 * Explicitly rejects regular tenant tokens.
 */
export async function authenticatePlatformAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Platform authentication required: Bearer token is missing');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Platform authentication required: Bearer token is empty');
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
