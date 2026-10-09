import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listPermissions(req, res, next) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { slug: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (err) {
    next(err);
  }
}

