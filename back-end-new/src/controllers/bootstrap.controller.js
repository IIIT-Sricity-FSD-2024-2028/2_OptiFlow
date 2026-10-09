import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function getBootstrapState(req, res, next) {
  try {
    const companyId = req.user.companyId;

    const [user, branches, teams, roles, unreadNotificationsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          company: true,
          roleAssignments: { include: { role: true } },
        },
      }),
      prisma.branch.findMany({
        where: { companyId },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.team.findMany({
        where: { branch: { companyId } },
        select: { id: true, name: true, branchId: true },
        orderBy: { name: 'asc' },
      }),
      prisma.role.findMany({
        where: { companyId },
        select: { id: true, label: true, isSystem: true },
        orderBy: { label: 'asc' },
      }),
      prisma.notification.count({
        where: { userId: req.user.id, readAt: null },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        currentUser: req.user,
        userProfile: user,
        company: user?.company || null,
        branches,
        teams,
        roles,
        unreadNotificationsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

