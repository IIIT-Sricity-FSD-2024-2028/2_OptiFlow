import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';


/**
 * GET /attachments & GET /api/attachments
 * Lists company-scoped attachments, optionally filtered by entityType and entityId.
 */
export async function listAttachments(req, res, next) {
  try {
    const { entityType, entityId } = req.query;

    const where = {
      companyId: req.user.companyId,
      ...(entityType ? { entityType: String(entityType) } : {}),
      ...(entityId ? { entityId: String(entityId) } : {}),
    };

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /attachments/:id & GET /api/attachments/:id
 * Retrieves a single attachment by ID within caller's company.
 */
export async function getAttachmentById(req, res, next) {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findFirst({
      where: { id, companyId: req.user.companyId },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundError(`Attachment ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: attachment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /attachments & POST /api/attachments
 * Registers an attachment record.
 */
export async function createAttachment(req, res, next) {
  try {
    const body = req.body || {};
    const entityType = body.entityType || body.resourceType;
    const entityId = body.entityId || body.resourceId;
    const fileName = body.fileName || body.originalName;
    const fileType = body.fileType || body.mimeType || 'application/octet-stream';
    const fileSizeBytes = Number(body.fileSizeBytes || body.sizeBytes || 0);

    validateRequired({ entityType, entityId, fileName }, ['entityType', 'entityId', 'fileName']);

    const attachment = await prisma.attachment.create({
      data: {
        companyId: req.user.companyId,
        entityType: String(entityType),
        entityId: String(entityId),
        fileName: String(fileName),
        fileType: String(fileType),
        fileSizeBytes: Math.max(0, fileSizeBytes),
        uploadedById: req.user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { fileName, entityType, entityId },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during attachment creation:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Attachment created successfully',
      data: attachment,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /attachments/:id & DELETE /api/attachments/:id
 * Deletes an attachment record within caller's company.
 */
export async function deleteAttachment(req, res, next) {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!attachment) {
      throw new NotFoundError(`Attachment ${id} not found`);
    }

    // Only creator or privileged roles can delete attachment
    const isPrivileged = ['company_owner', 'system_admin', 'superuser'].includes(req.user.role);
    if (attachment.uploadedById !== req.user.id && !isPrivileged) {
      throw new ForbiddenError('You can only delete your own attachments');
    }

    await prisma.attachment.delete({
      where: { id },
    });

    // Record audit log
    try {
      await createSystemAuditLog({companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { fileName: attachment.fileName },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit record logging during attachment deletion:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}




