import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';
import { uploadToStorage, getStorageSignedUrl, deleteFromStorage } from '../services/storage.service.js';
import { env } from '../config/env.js';

const uploadDir = path.join(process.cwd(), 'uploads');

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.csv', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const ALLOWED_VIOLATION_STATUSES = ['Open', 'Under_Review', 'Resolved', 'Ignored'];
const ALLOWED_EVIDENCE_STATUSES = ['Pending', 'Under_Review', 'Approved', 'Rejected'];

/**
 * Validates file extension and MIME type against the allow-list (SEC-M1-02).
 */
function validateUploadedFile(file) {
  if (!file) return;
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestError(`File extension '${ext}' is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(`File MIME type '${file.mimetype}' is not permitted.`);
  }
}

/**
 * Fire-and-forget notification helper for compliance & review events.
 */
function notify(companyId, userId, title, message, type = 'Review') {
  if (!companyId || !userId) return;
  prisma.notification
    .create({ data: { companyId, userId, title, message, type } })
    .catch((err) => console.warn('[Notification] Notice:', err.message));
}

/** Include shared by list, get, create, update and upload so every response has the same shape. */
const EVIDENCE_LIST_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true } },
  task: { select: { id: true, title: true } },
  violation: { include: { rule: true } },
  reviewedBy: { select: { id: true, fullName: true, email: true } },
};

export async function listEvidence(req, res, next) {
  try {
    const role = normalizeRole(req.user?.role);
    const where = { companyId: req.user.companyId };

    // Role-based scope enforcement
    if (role === 'team_member' || role === 'member') {
      where.userId = req.user.id;
    } else if (role === 'team_lead' || role === 'team_leader' || role === 'lead') {
      // TL sees evidence submitted by themselves, their direct reports, or under tasks in their team's projects
      where.OR = [
        { userId: req.user.id },
        { user: { managerUserId: req.user.id } },
        { task: { project: { team: { teamMembers: { some: { userId: req.user.id } } } } } },
      ];
    } else if (role === 'project_manager' || role === 'pm') {
      // PM sees evidence under their managed projects or submitted by them
      where.OR = [
        { userId: req.user.id },
        { task: { project: { createdById: req.user.id } } },
      ];
    }

    // PRE-M1-02: Support query param filters (taskId, violationId, status)
    const { taskId, task_id, violationId, violation_id, status } = req.query || {};
    const filterTaskId = taskId || task_id;
    const filterViolationId = violationId || violation_id;

    if (filterTaskId) where.taskId = String(filterTaskId);
    if (filterViolationId) where.violationId = String(filterViolationId);
    if (status) where.status = String(status);

    const evidenceList = await prisma.complianceEvidence.findMany({
      where,
      include: EVIDENCE_LIST_INCLUDE,
      orderBy: { submittedAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: evidenceList,
    });
  } catch (err) {
    next(err);
  }
}

export async function getEvidenceById(req, res, next) {
  try {
    const { id } = req.params;

    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
      include: EVIDENCE_LIST_INCLUDE,
    });

    if (!evidence) {
      throw new NotFoundError(`Compliance evidence with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: evidence,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEvidence(req, res, next) {
  try {
    const body = req.body || {};
    const title = (body.title || '').trim();
    const taskId = body.taskId || body.task_id || null;
    const violationId = body.violationId || body.violation_id || null;
    const evidenceType = body.evidenceType || body.evidence_type || 'Document';
    let fileUrl = body.fileUrl || body.file_url || '';
    const notes = body.notes || '';

    validateRequired({ title }, ['title']);

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, companyId: req.user.companyId },
      });
      if (!task) throw new NotFoundError(`Task ${taskId} not found in this company`);
    }

    if (violationId) {
      const violation = await prisma.complianceViolation.findFirst({
        where: { id: violationId, companyId: req.user.companyId },
      });
      if (!violation) throw new NotFoundError(`Violation ${violationId} not found in this company`);
    }

    // SEC-M1-08: If file is attached in multipart request, process and upload atomically
    let storageDetails = null;
    if (req.file) {
      validateUploadedFile(req.file);
      const safeOriginalName = (req.file.originalname || 'artifact.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${req.user.companyId}/evidence/${Date.now()}-${safeOriginalName}`;
      const uploadResult = await uploadToStorage({
        buffer: req.file.buffer,
        filePath: storagePath,
        mimetype: req.file.mimetype,
      });
      fileUrl = uploadResult.fileUrl;
      storageDetails = {
        safeOriginalName,
        storagePath,
        storageType: uploadResult.storageType,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };
    }

    const newEvidence = await prisma.complianceEvidence.create({
      data: {
        companyId: req.user.companyId,
        userId: req.user.id,
        taskId: taskId ? String(taskId) : null,
        violationId: violationId ? String(violationId) : null,
        title,
        evidenceType,
        fileUrl,
        notes,
        status: 'Pending',
      },
      include: EVIDENCE_LIST_INCLUDE,
    });

    if (storageDetails) {
      try {
        await prisma.attachment.create({
          data: {
            companyId: req.user.companyId,
            entityType: 'ComplianceEvidence',
            entityId: newEvidence.id,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSizeBytes: req.file.size,
            storageKey: storageDetails.storagePath || fileUrl,
            uploadedById: req.user.id,
          },
        });
      } catch (attErr) {
        console.warn('[Attachment] Could not persist attachment record:', attErr.message);
      }
    }

    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        evidenceId: newEvidence.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: {
          title,
          taskId,
          violationId,
          evidenceType,
          status: 'Pending',
          fileUrl,
          hasAttachedFile: !!storageDetails,
        },
      });
    } catch (auditErr) {
      console.warn('[Compliance Evidence] Failed to create audit log for createEvidence:', auditErr.message);
    }

    // Notify the assigned Team Lead or Task Creator that new evidence has been submitted
    if (newEvidence.taskId) {
      try {
        const task = await prisma.task.findUnique({
          where: { id: newEvidence.taskId },
          select: { id: true, title: true, assignedToId: true, createdById: true },
        });
        if (task) {
          const recipientId = (task.assignedToId && task.assignedToId !== req.user.id)
            ? task.assignedToId
            : (task.createdById !== req.user.id ? task.createdById : null);
          if (recipientId) {
            notify(
              req.user.companyId,
              recipientId,
              'New Evidence Submitted',
              `Evidence "${newEvidence.title}" was submitted by ${req.user.fullName || req.user.email} for review.`,
              'Review'
            );
          }
        }
      } catch (notifErr) {
        console.warn('[Notification] Notice: Failed to send evidence submission notification:', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Evidence submitted successfully',
      data: newEvidence,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEvidence(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance evidence with ID ${id} not found`);
    }

    const role = normalizeRole(req.user?.role);
    const isMember = role === 'team_member' || role === 'member';

    if (isMember) {
      if (existing.userId !== req.user.id) {
        throw new ForbiddenError('You can only edit your own evidence submissions');
      }
      if (existing.status !== 'Pending') {
        throw new ForbiddenError('Reviewed or approved evidence cannot be modified');
      }
      if (body.status !== undefined && body.status !== existing.status) {
        throw new ForbiddenError('Team members cannot review or change evidence status');
      }
    }

    const updateData = {};
    if (body.title) updateData.title = String(body.title).trim();
    if (body.evidenceType) updateData.evidenceType = body.evidenceType;
    if (body.fileUrl) updateData.fileUrl = body.fileUrl;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) {
      validateEnum(body.status, ALLOWED_EVIDENCE_STATUSES, 'status');
      updateData.status = body.status;
      updateData.reviewedById = req.user.id;
      updateData.reviewedAt = new Date();
    }

    const updated = await prisma.complianceEvidence.update({
      where: { id },
      data: updateData,
    });

    // Auto-resolve violation if evidence is Approved and violation exists
    if (body.status === 'Approved') {
      if (existing.violationId) {
        await prisma.complianceViolation.update({
          where: { id: existing.violationId },
          data: {
            status: 'Resolved',
            resolvedById: req.user.id,
            resolvedAt: new Date(),
            resolutionRemarks: `Auto-resolved via approved evidence "${existing.title}"`,
          },
        });

        try {
          await createComplianceAuditLog({
            companyId: req.user.companyId,
            violationId: existing.violationId,
            action: AUDIT_ACTIONS.STATUS_CHANGE,
            performedById: req.user.id,
            oldValue: { status: 'OPEN' },
            newValue: { status: 'RESOLVED', resolutionRemarks: `Auto-resolved via approved evidence "${existing.title}"` },
          });
        } catch (auditErr) {
          console.warn('[AuditLog] Notice: Audit logging for violation auto-resolve failed:', auditErr.message);
        }
      } else if (existing.taskId) {
        // Auto-resolve ONLY open violations for this task that are EVIDENCE_REQUIRED
        // (Do NOT indiscriminately resolve unrelated violations like Overdue, Missing Assignee, etc.)
        const taskViolations = await prisma.complianceViolation.findMany({
          where: {
            companyId: req.user.companyId,
            entityType: 'Task',
            entityId: existing.taskId,
            status: 'Open',
          },
          include: {
            rule: {
              include: {
                category: true,
              },
            },
          },
        });

        for (const tv of taskViolations) {
          const ruleRequirement = tv.rule?.criteria?.requirement;
          const isEvidenceRule = ruleRequirement?.type === 'EVIDENCE_REQUIRED';

          // Check if category or type matches if specified by the rule
          let matchesRequirement = isEvidenceRule;
          if (isEvidenceRule) {
            const reqCategory = ruleRequirement?.evidenceCategory || ruleRequirement?.category;
            const reqType = ruleRequirement?.evidenceType || ruleRequirement?.type_name;

            if (reqCategory) {
              const ruleCatName = tv.rule?.category?.name || '';
              matchesRequirement = ruleCatName.toLowerCase() === String(reqCategory).toLowerCase() || tv.rule?.categoryId === reqCategory;
            }
            if (matchesRequirement && reqType) {
              matchesRequirement = String(existing.evidenceType || '').toLowerCase() === String(reqType).toLowerCase();
            }
          }

          if (matchesRequirement) {
            await prisma.complianceViolation.update({
              where: { id: tv.id },
              data: {
                status: 'Resolved',
                resolvedById: req.user.id,
                resolvedAt: new Date(),
                resolutionRemarks: `Auto-resolved via approved evidence "${existing.title}"`,
              },
            });

            try {
              await createComplianceAuditLog({
                companyId: req.user.companyId,
                violationId: tv.id,
                action: AUDIT_ACTIONS.STATUS_CHANGE,
                performedById: req.user.id,
                oldValue: { status: 'OPEN' },
                newValue: { status: 'RESOLVED', resolutionRemarks: `Auto-resolved via approved evidence "${existing.title}"` },
              });
            } catch (auditErr) {
              console.warn('[AuditLog] Notice: Audit logging for task violation auto-resolve failed:', auditErr.message);
            }
          }
        }

        // Also auto-resolve any open Compliance Blocker escalations for this task
        try {
          await prisma.escalation.updateMany({
            where: {
              taskId: existing.taskId,
              companyId: req.user.companyId,
              status: 'Open',
              blockerType: 'Compliance Blocker'
            },
            data: {
              status: 'Resolved',
              resolvedAt: new Date(),
              description: `Auto-resolved: Evidence "${existing.title}" was approved.`
            }
          });
        } catch (escErr) {
          console.warn('[Escalation] Notice: Auto-resolving compliance escalation:', escErr.message);
        }

        // Also auto-complete any In_Review subtasks for this task submitted by this user
        try {
          const inReviewSubtasks = await prisma.subtask.findMany({
            where: {
              taskId: existing.taskId,
              assignedToId: existing.userId,
              status: 'In_Review',
            },
          });
          if (inReviewSubtasks.length > 0) {
            await prisma.subtask.updateMany({
              where: {
                id: { in: inReviewSubtasks.map((s) => s.id) },
              },
              data: {
                status: 'Completed',
              },
            });
            for (const st of inReviewSubtasks) {
              notify(
                req.user.companyId,
                existing.userId,
                'Subtask approved',
                `Your subtask "${st.title}" was approved.`,
                'Task'
              );
            }
          }
        } catch (stErr) {
          console.warn('[Subtask] Notice: Auto-completing subtask for approved evidence:', stErr.message);
        }
      }
    }

    // Notify submitter of evidence review decision
    if (body.status === 'Approved' && existing.userId && existing.userId !== req.user.id) {
      notify(
        req.user.companyId,
        existing.userId,
        'Evidence Approved',
        `Your evidence "${existing.title}" was approved by ${req.user.fullName || 'Team Lead'}.`,
        'Review'
      );
    } else if (body.status === 'Rejected' && existing.userId && existing.userId !== req.user.id) {
      notify(
        req.user.companyId,
        existing.userId,
        'Evidence Returned for Revision',
        `Your evidence "${existing.title}" was returned for revision.${body.notes ? ` Feedback: ${body.notes}` : ''}`,
        'Review'
      );
    }

    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        
        evidenceId: id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        performedById: req.user.id,
        oldValue: { status: existing.status },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit logging for evidence update:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Evidence updated successfully',
      data: await prisma.complianceEvidence.findUnique({ where: { id }, include: EVIDENCE_LIST_INCLUDE }),
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvidence(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance evidence with ID ${id} not found`);
    }

    const role = normalizeRole(req.user?.role || req.user?.roleLabel);
    const isMember = role === 'team_member' || role === 'member';
    const isPrivilegedCompliance = [
      'company_owner',
      'system_admin',
      'compliance_officer',
    ].includes(role);

    // SEC-M1-07: Forbid deleting Approved evidence except for Company Owner or Compliance Officer
    if (isMember) {
      if (existing.userId !== req.user.id) {
        throw new ForbiddenError('You can only delete your own evidence submissions');
      }
      if (existing.status !== 'Pending') {
        throw new ForbiddenError('Reviewed or approved evidence cannot be deleted');
      }
    } else if (!isPrivilegedCompliance) {
      if (existing.status === 'Approved') {
        throw new ForbiddenError('Approved evidence cannot be deleted. Contact a Compliance Officer or Company Owner.');
      }
    }

    // SEC-M1-07: Record audit log before deleting evidence
    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        evidenceId: id,
        action: AUDIT_ACTIONS.DELETE,
        performedById: req.user.id,
        oldValue: {
          title: existing.title,
          status: existing.status,
          fileUrl: existing.fileUrl,
          taskId: existing.taskId,
          violationId: existing.violationId,
        },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit logging for evidence delete:', auditErr.message);
    }

    if (existing.fileUrl) {
      await deleteFromStorage(existing.fileUrl);
    }

    await prisma.complianceEvidence.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadEvidenceFile(req, res, next) {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file attached. Include a "file" field in the multipart/form-data body.');
    }

    // SEC-M1-02: Enforce extension and MIME type allow-list
    validateUploadedFile(file);

    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!evidence) {
      throw new NotFoundError(`Compliance evidence with ID ${id} not found`);
    }

    // SEC-M1-03: Evidence can only be uploaded/replaced while in Pending status
    if (evidence.status !== 'Pending') {
      throw new BadRequestError(
        `Cannot upload or replace file for evidence with status '${evidence.status}'. Only 'Pending' evidence can be modified.`
      );
    }

    // SEC-M1-03: Only the submitter or an administrator can upload/replace files
    const userRole = normalizeRole(req.user?.role || req.user?.roleLabel || '');
    const isOwnerOrAdmin = [ROLES.COMPANY_OWNER, ROLES.SYSTEM_ADMIN, 'company_owner', 'system_admin'].includes(userRole);
    if (!isOwnerOrAdmin && evidence.userId !== req.user.id) {
      throw new ForbiddenError('Only the submitter or an administrator can upload evidence files for this record');
    }

    // Clean safe filename
    const safeOriginalName = (file.originalname || 'artifact.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${req.user.companyId}/${evidence.id}/${Date.now()}-${safeOriginalName}`;

    // Upload to Supabase Cloud Storage (or fallback to local disk)
    const { storageType, fileUrl } = await uploadToStorage({
      buffer: file.buffer,
      filePath: storagePath,
      mimetype: file.mimetype,
    });

    // Create Attachment record
    let attachment = null;
    try {
      attachment = await prisma.attachment.create({
        data: {
          companyId: req.user.companyId,
          entityType: 'ComplianceEvidence',
          entityId: evidence.id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSizeBytes: file.size,
          storageKey: storagePath || fileUrl,
          uploadedById: req.user.id,
        },
      });
    } catch (attErr) {
      console.warn('[Attachment] Could not persist attachment record:', attErr.message);
    }

    const updatedEvidence = await prisma.complianceEvidence.update({
      where: { id },
      data: { fileUrl },
      include: EVIDENCE_LIST_INCLUDE,
    });

    await createComplianceAuditLog({
      companyId: req.user.companyId,
      evidenceId: id,
      action: AUDIT_ACTIONS.UPDATE,
      performedById: req.user.id,
      newValue: { fileUrl, originalName: file.originalname, sizeBytes: file.size, storageType },
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: safeOriginalName,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileUrl,
        storageType,
        evidence: updatedEvidence,
        attachment,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function streamEvidenceFile(req, res, next) {
  try {
    const { id } = req.params;

    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!evidence || !evidence.fileUrl) {
      throw new NotFoundError(`Evidence file for ID ${id} not found`);
    }

    // SEC-M1-02: Security headers preventing XSS and content type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 1. If stored in Supabase Cloud Storage, generate a signed URL and redirect
    if (evidence.fileUrl.startsWith('supabase://')) {
      const signedUrl = await getStorageSignedUrl(evidence.fileUrl, 3600);
      if (signedUrl) {
        return res.redirect(signedUrl);
      }
    }

    // 2. Fallback for legacy files stored locally on disk
    const filename = path.basename(evidence.fileUrl);
    const safeFilePath = path.join(uploadDir, filename);

    // Verify resolved path stays strictly within uploadDir
    if (!safeFilePath.startsWith(uploadDir)) {
      throw new ForbiddenError('Access to the requested file path is restricted');
    }

    if (!fs.existsSync(safeFilePath)) {
      throw new NotFoundError('Physical evidence file not found on disk');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(safeFilePath);
  } catch (err) {
    next(err);
  }
}

