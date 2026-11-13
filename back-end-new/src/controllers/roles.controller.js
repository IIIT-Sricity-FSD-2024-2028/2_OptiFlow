import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole, isReservedRoleName } from '../utils/roles.js';
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
    if (isReservedRoleName(label)) {
      throw new BadRequestError(`"${label.trim()}" is reserved for a built-in role. Choose a different name.`);
    }

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

const ROLE_RESPONSE_INCLUDE = {
  roleTemplate: true,
  permissions: { include: { permission: true } },
};

/**
 * PATCH /roles/:id & PATCH /api/roles/:id
 * Updates a role's label and description. System roles keep their label (they are referenced by name).
 */
export async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const role = await prisma.role.findFirst({
      where: { id, companyId: req.user.companyId },
    });
    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }

    const updateData = {};
    if (body.label !== undefined) {
      const label = String(body.label).trim();
      validateRequired({ label }, ['label']);
      if (role.isSystem && label !== role.label) {
        throw new ForbiddenError('The label of a system role cannot be changed');
      }
      if (label !== role.label) {
        if (isReservedRoleName(label)) {
          throw new BadRequestError(`"${label}" is reserved for a built-in role. Choose a different name.`);
        }
        const clash = await prisma.role.findFirst({
          where: { companyId: req.user.companyId, label, NOT: { id } },
        });
        if (clash) throw new BadRequestError(`Role with label "${label}" already exists`);
        updateData.label = label;
        updateData.name = label.toLowerCase().replace(/\s+/g, '_');
      }
    }
    if (body.description !== undefined) {
      updateData.description = body.description ? String(body.description).trim() : null;
    }
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No updatable fields provided (label, description)');
    }

    const updated = await prisma.role.update({
      where: { id },
      data: updateData,
      include: ROLE_RESPONSE_INCLUDE,
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.UPDATE,
        performedById: req.user.id,
        roleId: id,
        oldValue: { label: role.label, description: role.description },
        newValue: updateData,
      });
    } catch (e) {
      console.warn('[Audit] Role update log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Role "${updated.label}" updated successfully`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /roles/:id & DELETE /api/roles/:id
 * Deletes a custom role. System roles and roles that still have assignments cannot be deleted.
 */
export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;

    const role = await prisma.role.findFirst({
      where: { id, companyId: req.user.companyId },
      include: { _count: { select: { roleAssignments: true } } },
    });
    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }
    if (role.isSystem) {
      throw new ForbiddenError('System roles cannot be deleted');
    }
    if (role._count.roleAssignments > 0) {
      throw new BadRequestError(
        `Role "${role.label}" is still assigned to ${role._count.roleAssignments} user(s). Revoke those assignments first.`
      );
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.role.delete({ where: { id } }),
    ]);

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { label: role.label },
      });
    } catch (e) {
      console.warn('[Audit] Role delete log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Role "${role.label}" deleted successfully`,
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

