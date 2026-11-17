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
import {
  buildTaskListWhere,
  buildSubtaskListWhere,
  buildProjectListWhere,
  getAssignedProjectIds,
  isBranchManager,
  isCompanyOwner,
} from '../utils/tenantScope.js';
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

// D-S7: allowed file types (extension and declared MIME type must agree) and the 25 MB limit.
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  csv: ['text/csv'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

/**
 * Validates name / MIME type / size of an attachment. Returns the cleaned values.
 */
export function validateAttachmentFile({ fileName, fileType, fileSizeBytes }) {
  const ext = path.extname(String(fileName || '')).replace('.', '').toLowerCase();
  const allowedMimes = ALLOWED_FILE_TYPES[ext];
  if (!allowedMimes) {
    throw new BadRequestError(
      `File type ".${ext || '?'}" is not allowed. Allowed: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`
    );
  }
  const declared = String(fileType || '').trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream' && !allowedMimes.includes(declared)) {
    throw new BadRequestError(`File type "${fileType}" does not match the .${ext} extension`);
  }
  const size = Number(fileSizeBytes);
  if (!Number.isFinite(size) || size < 0) {
    throw new BadRequestError('fileSizeBytes must be a number of bytes >= 0');
  }
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new BadRequestError('File is larger than the 25 MB limit');
  }
  return { fileType: allowedMimes[0], fileSizeBytes: Math.floor(size) };
}

// ---- who may touch which record -------------------------------------------
const hasAnyRole = (user, roles) => hasRole(user?.role, roles);
const isFullAccess = (user) => isCompanyOwner(user) || hasAnyRole(user, [ROLES.SYSTEM_ADMIN]);
const isPM = (user) => hasAnyRole(user, [ROLES.PROJECT_MANAGER]);
const isProcessAdmin = (user) => hasAnyRole(user, [ROLES.PROCESS_ADMIN]);
const isCompliance = (user) => hasAnyRole(user, [ROLES.COMPLIANCE_OFFICER]);
const isTeamLead = (user) => hasAnyRole(user, [ROLES.TEAM_LEAD]);
// Roles whose task / project reach is defined by a scope (the task list falls back to the whole
// company for any other role, which must not open attachments).
const hasWorkScope = (user) => isPM(user) || isBranchManager(user) || isTeamLead(user) || hasAnyRole(user, [ROLES.TEAM_MEMBER]);

// Process work is run by Owner, System Admin, Process Admin and Project Managers.
const canRunProcesses = (user) => isFullAccess(user) || isProcessAdmin(user) || isPM(user);

const deny = (what, mode) =>
  new ForbiddenError(`You do not have permission to ${mode === 'read' ? 'view files on' : 'attach files to'} this ${what}`);

/**
 * Validates that the target entity exists, belongs to the caller's company, and that the
 * caller may read it (mode 'read') or attach files to it (mode 'write').
 * Returns the entity.
 */
async function verifyEntityAndAuthorization(normType, entityId, user, mode = 'write') {
  const companyId = user.companyId;

  if (normType === 'Task') {
    const task = await prisma.task.findFirst({
      where: { id: entityId, companyId, deletedAt: null },
      select: { id: true, createdById: true },
    });
    if (!task) throw new NotFoundError(`Task ${entityId} not found`);
    if (isFullAccess(user) || (mode === 'read' && isCompliance(user))) return task;
    if (!hasWorkScope(user)) throw deny('task', mode);
    const assignedProjectIds = await getAssignedProjectIds(prisma, user);
    const scope = buildTaskListWhere({ companyId, user, assignedProjectIds });
    const allowed = await prisma.task.findFirst({
      where: { id: entityId, OR: [{ AND: [scope] }, { createdById: user.id }] },
      select: { id: true },
    });
    if (!allowed) throw deny('task', mode);
    return task;
  }

  if (normType === 'Subtask') {
    const subtask = await prisma.subtask.findFirst({
      where: { id: entityId, companyId, deletedAt: null },
      select: { id: true, createdById: true },
    });
    if (!subtask) throw new NotFoundError(`Subtask ${entityId} not found`);
    if (isFullAccess(user) || (mode === 'read' && isCompliance(user))) return subtask;
    if (!hasWorkScope(user)) throw deny('subtask', mode);
    const assignedProjectIds = await getAssignedProjectIds(prisma, user);
    const scope = buildSubtaskListWhere({ companyId, user, assignedProjectIds });
    const allowed = await prisma.subtask.findFirst({
      where: { id: entityId, OR: [{ AND: [scope] }, { createdById: user.id }] },
      select: { id: true },
    });
    if (!allowed) throw deny('subtask', mode);
    return subtask;
  }

  if (normType === 'ComplianceEvidence') {
    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id: entityId, companyId },
    });
    if (!evidence) throw new NotFoundError(`ComplianceEvidence ${entityId} not found`);
    if (evidence.userId === user.id) return evidence;
    // Only the submitter adds files; reviewers (D-S4) and admins may view them.
    const reviewer = isFullAccess(user) || isCompliance(user) || isPM(user) || isTeamLead(user) || isBranchManager(user);
    if (mode === 'read' && reviewer) return evidence;
    throw deny('evidence record', mode);
  }

  if (normType === 'ProcessInstance') {
    const instance = await prisma.processInstance.findFirst({
      where: { id: entityId, companyId },
      include: { steps: { select: { assignedToId: true, actionedById: true } } },
    });
    if (!instance) throw new NotFoundError(`ProcessInstance ${entityId} not found`);
    if (canRunProcesses(user)) return instance;
    const isInitiator = instance.initiatedById === user.id;
    const isParticipant = instance.steps?.some(
      (st) => st.assignedToId === user.id || st.actionedById === user.id
    );
    if (!isInitiator && !isParticipant) throw deny('process instance', mode);
    return instance;
  }

  if (normType === 'ProcessInstanceStep') {
    const step = await prisma.processInstanceStep.findFirst({
      where: { id: entityId, processInstance: { companyId } },
    });
    if (!step) throw new NotFoundError(`ProcessInstanceStep ${entityId} not found`);
    if (canRunProcesses(user)) return step;
    if (step.assignedToId !== user.id && step.actionedById !== user.id) throw deny('process step', mode);
    return step;
  }

  if (normType === 'Project') {
    const project = await prisma.project.findFirst({
      where: { id: entityId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundError(`Project ${entityId} not found`);
    if (isFullAccess(user)) return project;
    if (!hasWorkScope(user)) throw deny('project', mode);
    const assignedProjectIds = await getAssignedProjectIds(prisma, user);
    const scope = buildProjectListWhere({ companyId, user, assignedProjectIds });
    const inScope = await prisma.project.findFirst({ where: { AND: [scope, { id: entityId }] }, select: { id: true } });
    if (!inScope) throw deny('project', mode);
    // Members and Team Leads can see a project's files but only managers add to the project itself.
    if (mode === 'write' && !isPM(user) && !isBranchManager(user)) throw deny('project', mode);
    return project;
  }

  throw new BadRequestError(`Unsupported entity type: ${normType}`);
}

/**
 * GET /attachments & GET /api/attachments
 * Lists attachments the caller may see, optionally filtered by entityType and entityId.
 * With an entityId the caller must be able to read that entity; without one, non-admins
 * see only the files they uploaded.
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

    if (entityId && normType) {
      await verifyEntityAndAuthorization(normType, String(entityId), req.user, 'read');
    } else if (!isFullAccess(req.user)) {
      where.uploadedById = req.user.id;
    }

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
 * Retrieves a single attachment the caller is allowed to see.
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

    if (attachment.uploadedById !== req.user.id && !isFullAccess(req.user)) {
      // Same rule as listing: you need read access to the record the file hangs on.
      // A missing record or a refusal both answer 404 so ids cannot be probed.
      try {
        await verifyEntityAndAuthorization(attachment.entityType, attachment.entityId, req.user, 'read');
      } catch {
        throw new NotFoundError(`Attachment ${id} not found`);
      }
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
    const rawFileType = body.fileType || body.mimeType || '';
    const rawFileSize = body.fileSizeBytes ?? body.sizeBytes ?? 0;

    validateRequired({ entityType: rawEntityType, entityId, fileName }, ['entityType', 'entityId', 'fileName']);

    const normType = normalizeEntityType(rawEntityType);
    if (!normType) {
      throw new BadRequestError(
        `Invalid entityType "${rawEntityType}". Allowed types: ${ALLOWED_ENTITY_TYPES.join(', ')}`
      );
    }

    // D-S7: type allow-list and 25 MB limit.
    const { fileType, fileSizeBytes } = validateAttachmentFile({
      fileName,
      fileType: rawFileType,
      fileSizeBytes: rawFileSize,
    });

    // Verify entity existence, tenant ownership, and caller authorization
    await verifyEntityAndAuthorization(normType, String(entityId), req.user, 'write');

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
        fileType,
        fileSizeBytes,
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
 * Only the uploader, Owner / System Admin or a manager of the record may delete attachments.
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

    // The uploader, Owner / System Admin, or a manager who can add files to that record.
    if (attachment.uploadedById !== req.user.id && !isFullAccess(req.user)) {
      const manager = isPM(req.user) || isBranchManager(req.user) || isProcessAdmin(req.user);
      if (!manager) {
        throw new ForbiddenError('You can only delete your own attachments');
      }
      try {
        await verifyEntityAndAuthorization(attachment.entityType, attachment.entityId, req.user, 'write');
      } catch {
        throw new ForbiddenError('You can only delete attachments on records you manage');
      }
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
