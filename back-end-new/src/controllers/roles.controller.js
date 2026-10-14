import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listRoles(req, res, next) {
  try {
    const roles = await prisma.role.findMany({
      where: { companyId: req.user.companyId },
      include: {
        roleTemplate: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { label: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;

    const role = await prisma.role.findFirst({
      where: {
        OR: [{ id }, { label: id }],
        companyId: req.user.companyId,
      },
      include: {
        roleTemplate: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }

    res.status(200).json({
      success: true,
      data: role,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomRole(req, res, next) {
  try {
    const { label, description, permissionSlugs = [] } = req.body;
    validateRequired({ label }, ['label']);

    const existing = await prisma.role.findFirst({
      where: { companyId: req.user.companyId, label: label.trim() },
    });
    if (existing) {
      throw new BadRequestError(`Role with label "${label.trim()}" already exists`);
    }

    let permissionsToConnect = [];
    if (Array.isArray(permissionSlugs) && permissionSlugs.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { slug: { in: permissionSlugs } },
      });
      permissionsToConnect = perms.map((p) => ({ permissionId: p.id }));
    }

    const newRole = await prisma.role.create({
      data: {
        companyId: req.user.companyId,
        label: label.trim(),
        name: label.trim().toLowerCase().replace(/\s+/g, '_'),
        description: description?.trim() || null,
        isSystem: false,
        permissions: {
          create: permissionsToConnect,
        },
      },
      include: {
        roleTemplate: true,
        permissions: {
          include: { permission: true },
        },
      },
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        roleId: newRole.id,
        newValue: { label: newRole.label, permissionsCount: permissionsToConnect.length },
      });
    } catch (e) {
      console.warn('[Audit] Role create log failed:', e.message);
    }

    res.status(201).json({
      success: true,
      data: newRole,
      message: `Role "${newRole.label}" created successfully`,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateRolePermissions(req, res, next) {
  try {
    const { id } = req.params;
    const { permissionSlugs = [] } = req.body;

    const role = await prisma.role.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
      include: { permissions: { include: { permission: true } } },
    });

    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }

    const matchedPerms = await prisma.permission.findMany({
      where: { slug: { in: permissionSlugs } },
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      }),
      prisma.rolePermission.createMany({
        data: matchedPerms.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    const updatedRole = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        roleTemplate: true,
        permissions: {
          include: { permission: true },
        },
      },
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.PERMISSION_CHANGE,
        performedById: req.user.id,
        roleId: role.id,
        newValue: { permissionSlugs },
      });
    } catch (e) {
      console.warn('[Audit] Permission update log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      data: updatedRole,
      message: `Permissions updated for role "${role.label}"`,
    });
  } catch (err) {
    next(err);
  }
}

