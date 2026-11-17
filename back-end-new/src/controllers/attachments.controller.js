import crypto from 'crypto';
import path from 'path';
import { prisma } from '../config/prisma.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { validateRequired } from '../utils/validation.js';
import { ROLES, hasRole } from '../utils/roles.js';
import { createSystemAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export const ALLOWED_ENTITY_TYPES = [
  'Task',
  'Subtask',
  'ComplianceEvidence',
  'ProcessInstance',
  'ProcessInstanceStep',
  'Project',
];

const ENTITY_TYPE_MAP = {
  task: 'Task',
  subtask: 'Subtask',
  complianceevidence: 'ComplianceEvidence',
  compliance_evidence: 'ComplianceEvidence',
  evidence: 'ComplianceEvidence',
  processinstance: 'ProcessInstance',
  process_instance: 'ProcessInstance',
  processinstancestep: 'ProcessInstanceStep',
  process_instance_step: 'ProcessInstanceStep',
  processstep: 'ProcessInstanceStep',
  process_step: 'ProcessInstanceStep',
  project: 'Project',
};

export function normalizeEntityType(rawType) {
  if (!rawType || typeof rawType !== 'string') return null;
  const key = rawType.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ENTITY_TYPE_MAP[key] || ENTITY_TYPE_MAP[key.replace(/_/g, '')] || null;
}

/**
 * Validates that target entity exists, belongs to caller's company,
 * and caller has authorization to attach files to it.
 */
async function verifyEntityAndAuthorization(normType, entityId, user) {
  const isPrivileged = hasRole(user.role, [
    ROLES.COMPANY_OWNER,
    ROLES.SYSTEM_ADMIN,
    ROLES.PROCESS_ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.COMPLIANCE_OFFICER,
    'company_owner',
    'system_admin',
    'process_admin',
    'project_manager',
    'compliance_officer',
  ]);

  if (normType === 'Task') {
    const task = await prisma.task.findFirst({
      where: { id: entityId, companyId: user.companyId, deletedAt: null },
      include: { subtasks: { select: { assignedToId: true } } },
    });
    if (!task) {
      throw new NotFoundError(`Task ${entityId} not found`);
    }
    if (!isPrivileged) {
      const isAssigned = task.assignedToId === user.id;
      const isCreator = task.createdById === user.id;
      const isSubtaskAssigned = task.subtasks?.some((s) => s.assignedToId === user.id);
      if (!isAssigned && !isCreator && !isSubtaskAssigned) {
        throw new ForbiddenError('You do not have permission to attach files to this task');
      }
    }
    return task;
  }

  if (normType === 'Subtask') {
    const subtask = await prisma.subtask.findFirst({
      where: { id: entityId, companyId: user.companyId, deletedAt: null },
    });
    if (!subtask) {
      throw new NotFoundError(`Subtask ${entityId} not found`);
    }
    if (!isPrivileged) {
      const isAssigned = subtask.assignedToId === user.id;
      const isCreator = subtask.createdById === user.id;
      if (!isAssigned && !isCreator) {
        throw new ForbiddenError('You do not have permission to attach files to this subtask');
      }
    }
    return subtask;
  }

  if (normType === 'ComplianceEvidence') {
    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id: entityId, companyId: user.companyId },
    });
    if (!evidence) {
      throw new NotFoundError(`ComplianceEvidence ${entityId} not found`);
    }
    if (!isPrivileged && evidence.userId !== user.id) {
      throw new ForbiddenError('You do not have permission to attach files to this evidence');
    }
    return evidence;
  }

  if (normType === 'ProcessInstance') {
    const instance = await prisma.processInstance.findFirst({
      where: { id: entityId, companyId: user.companyId },
      include: { steps: { select: { assignedToId: true, actionedById: true } } },
    });
    if (!instance) {
      throw new NotFoundError(`ProcessInstance ${entityId} not found`);
    }
    if (!isPrivileged) {
      const isInitiator = instance.initiatedById === user.id;
      const isParticipant = instance.steps?.some(
        (s) => s.assignedToId === user.id || s.actionedById === user.id
      );
      if (!isInitiator && !isParticipant) {
        throw new ForbiddenError('You do not have permission to attach files to this process instance');
      }
    }
    return instance;
  }

  if (normType === 'ProcessInstanceStep') {
    const step = await prisma.processInstanceStep.findFirst({
      where: {
        id: entityId,
        processInstance: { companyId: user.companyId },
      },
    });
    if (!step) {
      throw new NotFoundError(`ProcessInstanceStep ${entityId} not found`);
    }
    if (!isPrivileged && step.assignedToId !== user.id && step.actionedById !== user.id) {
      throw new ForbiddenError('You do not have permission to attach files to this process step');
    }
    return step;
  }

  if (normType === 'Project') {
    const project = await prisma.project.findFirst({
      where: { id: entityId, companyId: user.companyId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundError(`Project ${entityId} not found`);
    }
    if (!isPrivileged) {
      const hasTask = await prisma.task.findFirst({
        where: { projectId: entityId, assignedToId: user.id, companyId: user.companyId, deletedAt: null },
      });
      if (!hasTask) {
        throw new ForbiddenError('You do not have permission to attach files to this project');
      }
    }
    return project;
  }

  throw new BadRequestError(`Unsupported entity type: ${normType}`);
}

/**
 * GET /attachments & GET /api/attachments
 * Lists company-scoped attachments, optionally filtered by entityType and entityId.
 */
export async function listAttachments(req, res, next) {
  try {
    const { entityType, entityId } = req.query;

    const normType = entityType ? normalizeEntityType(entityType) : null;
    if (entityType && !normType) {
      throw new BadRequestError(
        `Invalid entityType "${entityType}". Allowed types: ${ALLOWED_ENTITY_TYPES.join(', ')}`
      );
    }

    const where = {
      companyId: req.user.companyId,
      ...(normType ? { entityType: normType } : {}),
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
 * Generates storageKey on the server, verifies entity exists within company,
 * checks allowed entity types (D-S7), and gates caller authorization.
 */
export async function createAttachment(req, res, next) {
  try {
    const body = req.body || {};
    const rawEntityType = body.entityType || body.resourceType;
    const entityId = body.entityId || body.resourceId;
    const fileName = body.fileName || body.originalName;
    const fileType = body.fileType || body.mimeType || 'application/octet-stream';
    const fileSizeBytes = Number(body.fileSizeBytes || body.sizeBytes || 0);

    validateRequired({ entityType: rawEntityType, entityId, fileName }, ['entityType', 'entityId', 'fileName']);

    const normType = normalizeEntityType(rawEntityType);
    if (!normType) {
      throw new BadRequestError(
        `Invalid entityType "${rawEntityType}". Allowed types: ${ALLOWED_ENTITY_TYPES.join(', ')}`
      );
    }

    // Verify entity existence, tenant ownership, and caller authorization
    await verifyEntityAndAuthorization(normType, String(entityId), req.user);

    // Generate storage key on the server (never trust client-supplied keys)
    const baseName = path.basename(String(fileName).trim());
    const sanitizedFileName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment';
    const serverStorageKey = `attachments/${req.user.companyId}/${normType.toLowerCase()}/${entityId}/${Date.now()}-${crypto.randomUUID()}-${sanitizedFileName}`;

    const attachment = await prisma.attachment.create({
      data: {
        companyId: req.user.companyId,
        entityType: normType,
        entityId: String(entityId),
        fileName: String(fileName),
        fileType: String(fileType),
        fileSizeBytes: Math.max(0, fileSizeBytes),
        storageKey: serverStorageKey,
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
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { fileName, entityType: normType, entityId, storageKey: serverStorageKey },
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
 * Only the uploader or privileged roles may delete attachments.
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
    const isPrivileged = hasRole(req.user.role, [
      ROLES.COMPANY_OWNER,
      ROLES.SYSTEM_ADMIN,
      ROLES.PROCESS_ADMIN,
      ROLES.PROJECT_MANAGER,
      'company_owner',
      'system_admin',
      'process_admin',
      'project_manager',
    ]);

    if (attachment.uploadedById !== req.user.id && !isPrivileged) {
      throw new ForbiddenError('You can only delete your own attachments');
    }

    await prisma.attachment.delete({
      where: { id },
    });

    // Record audit log
    try {
      await createSystemAuditLog({
        companyId: req.user.companyId,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: { fileName: attachment.fileName, entityType: attachment.entityType, entityId: attachment.entityId },
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
