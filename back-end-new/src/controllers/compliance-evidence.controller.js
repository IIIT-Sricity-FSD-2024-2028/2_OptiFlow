const uploadDir = path.join(process.cwd(), 'uploads');
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const ALLOWED_VIOLATION_STATUSES = ['Open', 'Under_Review', 'Resolved', 'Ignored'];
const ALLOWED_EVIDENCE_STATUSES = ['Pending', 'Under_Review', 'Approved', 'Rejected'];


import { env } from '../config/env.js';

export async function listEvidence(req, res, next) {
  try {
    const evidenceList = await prisma.complianceEvidence.findMany({
      where: { companyId: req.user.companyId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
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
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
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
    const fileUrl = body.fileUrl || body.file_url || '';
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
      include: { user: true, violation: true },
    });

    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        
        evidenceId: newEvidence.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { title, status: 'Pending' },
      });
    } catch (auditErr) {
      console.warn('[AuditLog] Notice: Audit logging for evidence create:', auditErr.message);
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

    const updateData = {};
    if (body.status) {
      validateEnum(body.status, ALLOWED_EVIDENCE_STATUSES, 'status');
      updateData.status = body.status;
      updateData.reviewedById = req.user.id;
      updateData.reviewedAt = new Date();
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.complianceEvidence.update({
      where: { id },
      data: updateData,
    });

    // Auto-resolve violation if evidence is Approved and violation exists
    if (body.status === 'Approved' && existing.violationId) {
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
      data: updated,
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

    const evidence = await prisma.complianceEvidence.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!evidence) {
      // Remove uploaded file if evidence doesn't exist
      try {
        fs.unlinkSync(file.path);
      } catch (_) {}
      throw new NotFoundError(`Compliance evidence with ID ${id} not found`);
    }

    const fileUrl = `/uploads/${file.filename}`;

    // Create Attachment record
    let attachment = null;
    try {
      attachment = await prisma.attachment.create({
        data: {
          companyId: req.user.companyId,
          
          entityId: evidence.id,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSizeBytes: file.size,
          uploadedById: req.user.id,
        },
      });
    } catch (attErr) {
      console.warn('[Attachment] Could not persist attachment record:', attErr.message);
    }

    const updatedEvidence = await prisma.complianceEvidence.update({
      where: { id },
      data: { fileUrl },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
        violation: { include: { rule: true } },
      },
    });

    await createComplianceAuditLog({
      companyId: req.user.companyId,
      
      evidenceId: id,
      action: AUDIT_ACTIONS.UPDATE,
      performedById: req.user.id,
      newValue: { fileUrl, originalName: file.originalname, sizeBytes: file.size },
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        fileUrl,
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

    const filename = path.basename(evidence.fileUrl);
    const safeFilePath = path.join(uploadDir, filename);

    // Verify resolved path stays strictly within uploadDir
    if (!safeFilePath.startsWith(uploadDir)) {
      throw new ForbiddenError('Access to the requested file path is restricted');
    }

    if (!fs.existsSync(safeFilePath)) {
      throw new NotFoundError('Physical evidence file not found on disk');
    }

    res.sendFile(safeFilePath);
  } catch (err) {
    next(err);
  }
}

