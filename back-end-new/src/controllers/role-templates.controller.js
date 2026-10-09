import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listRoleTemplates(req, res, next) {
  try {
    const templates = await prisma.roleTemplate.findMany({
      include: {
        defaultPermissions: {
          include: { permission: true },
        },
      },
      orderBy: { label: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (err) {
    next(err);
  }
}

