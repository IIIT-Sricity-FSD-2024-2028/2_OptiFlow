import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { prisma } from "../config/prisma.js";
import { requireRoles } from "../middleware/authorize.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ValidationError,
} from "../utils/errors.js";
import { validateRequired, validateEnum } from "../utils/validation.js";
import { ROLES, normalizeRole } from "../utils/roles.js";
import { createComplianceAuditLog, AUDIT_ACTIONS } from "../utils/audit.js";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_SEVERITIES = ["Low", "Medium", "High", "Critical"];
const ALLOWED_VIOLATION_STATUSES = [
  "Open",
  "Under_Review",
  "Resolved",
  "Ignored",
];
const ALLOWED_EVIDENCE_STATUSES = [
  "Pending",
  "Under_Review",
  "Approved",
  "Rejected",
];

export async function listComplianceViolations(req, res, next) {
  try {
    const violations = await prisma.complianceViolation.findMany({
      where: { companyId: req.user.companyId },
      include: {
        rule: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        evidence: true,
      },
      orderBy: { detectedAt: "desc" },
    });
    // O(N) Single-pass ID extraction
    const projectIds = new Set();
    const taskIds = new Set();
    const userIds = new Set();

    for (const v of violations) {
      if (v.entityId) {
        if (v.entityType === "Project") projectIds.add(v.entityId);
        if (v.entityType === "Task") taskIds.add(v.entityId);
        if (v.entityType === "User") userIds.add(v.entityId);
      }
    }

    const projects = await prisma.project.findMany({ where: { id: { in: Array.from(projectIds) } }, select: { id: true, name: true } });
    const tasks = await prisma.task.findMany({ where: { id: { in: Array.from(taskIds) } }, select: { id: true, title: true } });
    const users = await prisma.user.findMany({ where: { id: { in: Array.from(userIds) } }, select: { id: true, fullName: true, email: true } });

    // O(N) Single-pass mapping
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const taskMap = new Map(tasks.map(t => [t.id, t.title]));
    const userMap = new Map(users.map(u => [u.id, u.fullName || u.email]));

    const hydratedViolations = violations.map((v) => {
      if (v.entityType === "Project" && projectMap.has(v.entityId)) return { ...v, entityName: projectMap.get(v.entityId) };
      if (v.entityType === "Task" && taskMap.has(v.entityId)) return { ...v, entityName: taskMap.get(v.entityId) };
      if (v.entityType === "User" && userMap.has(v.entityId)) return { ...v, entityName: userMap.get(v.entityId) };
      
      // Fallback
      return {
        ...v,
        entityName: `${v.entityType || "General"} #${(v.entityId || "N/A").substring(0, 8)}`,
      };
    });

    res.status(200).json({
      success: true,
      data: hydratedViolations,
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplianceViolationById(req, res, next) {
  try {
    const { id } = req.params;

    const violation = await prisma.complianceViolation.findFirst({
      where: { id, companyId: req.user.companyId },
      include: {
        rule: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        evidence: true,
      },
    });

    if (!violation) {
      throw new NotFoundError(`Compliance violation with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: violation,
    });
  } catch (err) {
    next(err);
  }
}

export async function createComplianceViolation(req, res, next) {
  try {
    const body = req.body || {};
    const ruleId = body.ruleId || body.rule_id;
    const entityType = (body.entityType || body.entity_type || "").trim();
    const entityId = (body.entityId || body.entity_id || "").trim();
    const severity = body.severity || "Medium";
    const dueDate = body.dueDate || body.due_date || null;

    validateRequired({ ruleId, entityType, entityId }, [
      "ruleId",
      "entityType",
      "entityId",
    ]);
    validateEnum(severity, ALLOWED_SEVERITIES, "severity");

    const rule = await prisma.complianceRule.findFirst({
      where: {
        id: ruleId,
        OR: [{ companyId: null }, { companyId: req.user.companyId }],
      },
    });

    if (!rule) {
      throw new NotFoundError(`Compliance rule with ID ${ruleId} not found`);
    }

    const newViolation = await prisma.complianceViolation.create({
      data: {
        companyId: req.user.companyId,
        ruleId,
        entityType,
        entityId,
        severity,
        status: "Open",
        reportedById: req.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { rule: true },
    });

    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        
        violationId: newViolation.id,
        action: AUDIT_ACTIONS.CREATE,
        performedById: req.user.id,
        newValue: { ruleId, entityType, entityId, severity },
      });
    } catch (auditErr) {
      console.warn(
        "[AuditLog] Notice: Audit logging for violation create:",
        auditErr.message,
      );
    }

    res.status(201).json({
      success: true,
      message: "Compliance violation created successfully",
      data: newViolation,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateComplianceViolation(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.complianceViolation.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance violation with ID ${id} not found`);
    }

    const updateData = {};
    if (body.status) {
      validateEnum(body.status, ALLOWED_VIOLATION_STATUSES, "status");
      updateData.status = body.status;
      if (body.status === "Resolved") {
        updateData.resolvedById = req.user.id;
        updateData.resolvedAt = new Date();
      }
    }
    if (
      body.resolutionRemarks !== undefined ||
      body.resolution_remarks !== undefined
    ) {
      updateData.resolutionRemarks =
        body.resolutionRemarks || body.resolution_remarks;
    }
    if (body.severity) {
      validateEnum(body.severity, ALLOWED_SEVERITIES, "severity");
      updateData.severity = body.severity;
    }

    const updated = await prisma.complianceViolation.update({
      where: { id },
      data: updateData,
      include: { rule: true },
    });

    try {
      await createComplianceAuditLog({
        companyId: req.user.companyId,
        
        violationId: id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        performedById: req.user.id,
        oldValue: { status: existing.status },
        newValue: updateData,
      });
    } catch (auditErr) {
      console.warn(
        "[AuditLog] Notice: Audit logging for violation update:",
        auditErr.message,
      );
    }

    res.status(200).json({
      success: true,
      message: "Compliance violation updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteComplianceViolation(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.complianceViolation.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance violation with ID ${id} not found`);
    }

    await prisma.complianceViolation.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Compliance violation deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}
