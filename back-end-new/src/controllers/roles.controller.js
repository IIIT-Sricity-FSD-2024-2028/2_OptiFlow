import { prisma } from '../config/prisma.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { isReservedRoleName } from '../utils/roles.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

/** R10: a field that is present must be a string, so malformed bodies get a 400, not a 500. */
function assertStringFields(body, fields) {
  const errors = fields
    .filter((f) => body[f] !== undefined && body[f] !== null && typeof body[f] !== 'string')
    .map((f) => ({ field: f, message: `${f} must be a string` }));
  if (errors.length) throw new ValidationError('Invalid field types', errors);
}

/** R16: permissionSlugs must be an array of known slugs. An empty array clears every permission. */
async function resolvePermissionSlugs(permissionSlugs) {
  if (!Array.isArray(permissionSlugs) || permissionSlugs.some((s) => typeof s !== 'string')) {
    throw new ValidationError('permissionSlugs must be an array of permission slugs', [
      { field: 'permissionSlugs', message: 'permissionSlugs must be an array of strings' },
    ]);
  }
  const perms = permissionSlugs.length
    ? await prisma.permission.findMany({ where: { slug: { in: permissionSlugs } } })
    : [];
  const known = new Set(perms.map((p) => p.slug));
  const unknown = [...new Set(permissionSlugs.filter((s) => !known.has(s)))];
  if (unknown.length) {
    throw new BadRequestError(`Unknown permission slug(s): ${unknown.join(', ')}`);
  }
  return perms;
}

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
    const body = req.body || {};
    assertStringFields(body, ['label', 'description']);
    const { label, description, permissionSlugs = [] } = body;
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

    const permissionsToConnect = (await resolvePermissionSlugs(permissionSlugs)).map((p) => ({ permissionId: p.id }));

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
    assertStringFields(body, ['label', 'description']);

    const role = await prisma.role.findFirst({
      where: { id, companyId: req.user.companyId },
    });
    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }

    const updateData = {};
    if (body.label !== undefined) {
      if (body.label === null) {
        throw new ValidationError('Invalid field types', [{ field: 'label', message: 'label cannot be null' }]);
      }
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


export async function updateRolePermissions(req, res, next) {
  try {
    const { id } = req.params;
    // R16: a missing or misspelled permissionSlugs used to default to [] and wipe every permission.
    const { permissionSlugs } = req.body || {};

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

    // Protection against Baseline Role Disarmament (MAL-02)
    if (role.isSystem) {
      throw new ForbiddenError(
        `System baseline role "${role.label}" is immutable and its capabilities cannot be modified`
      );
    }

    const matchedPerms = await resolvePermissionSlugs(permissionSlugs);

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

/**
 * DELETE /roles/:id & DELETE /api/roles/:id
 * Deletes a custom role (NORM-01). System baseline roles cannot be deleted.
 */
export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;

    const role = await prisma.role.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
    });

    if (!role) {
      throw new NotFoundError(`Role "${id}" not found in this company`);
    }

    if (role.isSystem) {
      throw new ForbiddenError(
        `System baseline role "${role.label}" cannot be deleted`
      );
    }

    // Only active assignments block deletion. Revoked rows (soft revoke, D-S9) are history:
    // they are copied into the SystemAuditLog and then removed with the role below.
    const assignedCount = await prisma.roleAssignment.count({
      where: { roleId: role.id, revokedAt: null },
    });

    if (assignedCount > 0) {
      throw new ConflictError(
        `Cannot delete role "${role.label}" because it is currently assigned to ${assignedCount} user(s). Please reassign users first.`
      );
    }

    // Safely delete in transaction, nullifying any foreign key references in SystemAuditLog
    await prisma.$transaction(async (tx) => {
      await tx.systemAuditLog.updateMany({
        where: { roleId: role.id },
        data: { roleId: null },
      });

      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      // Re-check inside the transaction: an assignment made since the check above must block
      // the delete with 409, not fail on the foreign key with a 500.
      const activeNow = await tx.roleAssignment.count({ where: { roleId: role.id, revokedAt: null } });
      if (activeNow > 0) {
        throw new ConflictError(`Cannot delete role "${role.label}" because it was just assigned. Please reassign users first.`);
      }

      // The revoked rows must go (the FK has no cascade), so their history is copied into the
      // audit log first, in the same transaction: if that write fails, nothing is deleted (D-S9).
      const history = await tx.roleAssignment.findMany({
        where: { roleId: role.id, revokedAt: { not: null } },
        select: { userId: true, scopeType: true, scopeId: true, grantedById: true, grantedAt: true, revokedAt: true },
        orderBy: { grantedAt: 'asc' },
      });
      if (history.length) {
        await tx.systemAuditLog.create({
          data: {
            companyId: req.user.companyId,
            action: AUDIT_ACTIONS.DELETE,
            performedById: req.user.id,
            oldValue: {
              deletedRoleLabel: role.label,
              deletedRoleId: role.id,
              revokedAssignments: history.map((h) => ({
                ...h,
                grantedAt: h.grantedAt.toISOString(),
                revokedAt: h.revokedAt.toISOString(),
              })),
            },
          },
        });
        await tx.roleAssignment.deleteMany({
          where: { roleId: role.id, revokedAt: { not: null } },
        });
      }

      await tx.role.delete({
        where: { id: role.id },
      });
    });

    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        newValue: { deletedRoleLabel: role.label },
      });
    } catch (e) {
      console.warn('[Audit] Role delete log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Custom role "${role.label}" deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
}


