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
  ConflictError,
} from "../utils/errors.js";
import { validateRequired, validateEnum } from "../utils/validation.js";
import { ROLES, normalizeRole } from "../utils/roles.js";
import { createComplianceAuditLog, AUDIT_ACTIONS } from "../utils/audit.js";
import { calculateSlaDueDate } from "../services/compliance.service.js";

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

const VIOLATION_LIST_INCLUDE = {
  rule: {
    include: {
      category: {
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
  },
  reportedBy: { select: { id: true, fullName: true, email: true } },
  resolvedBy: { select: { id: true, fullName: true, email: true } },
  evidence: true,
};

const CONTACT_USER_SELECT = { id: true, fullName: true, email: true };

function isTeamLeadMembership(member) {
  return /team.?lead|^lead$/i.test(member?.role || "");
}

function findTeamLeadFromMembers(members) {
  const lead = (members || []).find(isTeamLeadMembership);
  return lead?.user || null;
}

function addNotificationTarget(list, seenIds, user, roleLabel) {
  if (!user?.id || seenIds.has(user.id)) return;
  seenIds.add(user.id);
  list.push({
    id: user.id,
    fullName: user.fullName || null,
    email: user.email || null,
    roleLabel,
  });
}

/** Adds entityName, entityOwner, teamLead and notificationTargets to violations. */
export async function hydrateViolations(violations) {
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

    const [projects, tasks, users] = await Promise.all([
      projectIds.size
        ? prisma.project.findMany({
            where: { id: { in: Array.from(projectIds) } },
            select: {
              id: true,
              name: true,
              createdById: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  teamMembers: {
                    select: { role: true, user: { select: CONTACT_USER_SELECT } },
                  },
                },
              },
            },
          })
        : [],
      taskIds.size
        ? prisma.task.findMany({
            where: { id: { in: Array.from(taskIds) } },
            select: {
              id: true,
              title: true,
              assignedTo: {
                select: {
                  ...CONTACT_USER_SELECT,
                  manager: { select: CONTACT_USER_SELECT },
                },
              },
              createdBy: { select: CONTACT_USER_SELECT },
              project: {
                select: {
                  id: true,
                  name: true,
                  createdById: true,
                  team: {
                    select: {
                      id: true,
                      name: true,
                      teamMembers: {
                        select: { role: true, user: { select: CONTACT_USER_SELECT } },
                      },
                    },
                  },
                },
              },
            },
          })
        : [],
      userIds.size
        ? prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: {
              ...CONTACT_USER_SELECT,
              manager: { select: CONTACT_USER_SELECT },
              teamMembers: {
                select: {
                  team: {
                    select: {
                      id: true,
                      teamMembers: {
                        select: { role: true, user: { select: CONTACT_USER_SELECT } },
                      },
                    },
                  },
                },
              },
            },
          })
        : [],
    ]);

    const projectCreatorIds = new Set();
    for (const p of projects) {
      if (p.createdById) projectCreatorIds.add(p.createdById);
    }
    for (const t of tasks) {
      if (t.project?.createdById) projectCreatorIds.add(t.project.createdById);
    }
    const projectCreators = projectCreatorIds.size
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(projectCreatorIds) } },
          select: CONTACT_USER_SELECT,
        })
      : [];
    const creatorMap = new Map(projectCreators.map((u) => [u.id, u]));

    const projectMap = new Map(
      projects.map((p) => {
        const teamLead = findTeamLeadFromMembers(p.team?.teamMembers);
        const projectManager = p.createdById ? creatorMap.get(p.createdById) || null : null;
        const targets = [];
        const seen = new Set();
        addNotificationTarget(targets, seen, teamLead, "Team Leader");
        addNotificationTarget(targets, seen, projectManager, "Project Manager");
        return [
          p.id,
          {
            name: p.name,
            teamLead,
            owner: teamLead || projectManager || null,
            notificationTargets: targets,
          },
        ];
      }),
    );

    const taskMap = new Map(
      tasks.map((t) => {
        const projectTeamLead = findTeamLeadFromMembers(t.project?.team?.teamMembers);
        const teamLead = projectTeamLead || t.assignedTo?.manager || null;
        const projectCreator = t.project?.createdById ? creatorMap.get(t.project.createdById) || null : null;
        const projectManager = projectCreator || t.createdBy || null;
        const owner = t.assignedTo || t.createdBy || teamLead || null;
        const targets = [];
        const seen = new Set();
        addNotificationTarget(targets, seen, teamLead, "Team Leader");
        addNotificationTarget(targets, seen, t.assignedTo, "Task Assignee");
        addNotificationTarget(targets, seen, projectManager, "Project Manager");
        return [
          t.id,
          {
            title: t.title,
            teamLead,
            owner,
            notificationTargets: targets,
          },
        ];
      }),
    );

    const userMap = new Map(
      users.map((u) => {
        const teamLead =
          u.teamMembers
            ?.map((tm) => findTeamLeadFromMembers(tm.team?.teamMembers))
            .find((lead) => lead && lead.id !== u.id) ||
          u.manager ||
          null;
        const owner = { id: u.id, fullName: u.fullName, email: u.email };
        const targets = [];
        const seen = new Set();
        addNotificationTarget(targets, seen, teamLead, "Team Leader");
        addNotificationTarget(targets, seen, owner, "User");
        return [
          u.id,
          {
            name: u.fullName || u.email,
            teamLead,
            owner,
            notificationTargets: targets,
          },
        ];
      }),
    );

    return violations.map((v) => {
      let entityName = `${v.entityType || "General"} #${(v.entityId || "N/A").substring(0, 8)}`;
      let entityOwner = null;
      let teamLead = null;
      let notificationTargets = [];

      if (v.entityType === "Project" && projectMap.has(v.entityId)) {
        const meta = projectMap.get(v.entityId);
        entityName = meta.name;
        entityOwner = meta.owner;
        teamLead = meta.teamLead;
        notificationTargets = meta.notificationTargets;
      } else if (v.entityType === "Task" && taskMap.has(v.entityId)) {
        const meta = taskMap.get(v.entityId);
        entityName = meta.title;
        entityOwner = meta.owner;
        teamLead = meta.teamLead;
        notificationTargets = meta.notificationTargets;
      } else if (v.entityType === "User" && userMap.has(v.entityId)) {
        const meta = userMap.get(v.entityId);
        entityName = meta.name;
        entityOwner = meta.owner;
        teamLead = meta.teamLead;
        notificationTargets = meta.notificationTargets;
      }

      const assignedOfficer = v.assignedOfficer || v.rule?.category?.owner || null;

      // SLA computation
      const detectedAt = v.detectedAt ? new Date(v.detectedAt) : new Date();
      let dueDate = v.dueDate ? new Date(v.dueDate) : null;
      if (!dueDate) {
        dueDate = calculateSlaDueDate(v.severity || "Medium", detectedAt);
      }

      const now = new Date();
      let slaStatus = "On_Track";
      let slaRemainingLabel = "";

      if (v.status === "Resolved") {
        const resolvedAt = v.resolvedAt ? new Date(v.resolvedAt) : now;
        if (resolvedAt <= dueDate) {
          slaStatus = "Met";
          slaRemainingLabel = "SLA Met";
        } else {
          slaStatus = "Resolved_Late";
          slaRemainingLabel = "Resolved Past SLA";
        }
      } else {
        const diffMs = dueDate.getTime() - now.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
          slaStatus = "Breached";
          const overdueHours = Math.abs(diffHours);
          slaRemainingLabel = overdueHours < 24 ? `${overdueHours}h overdue` : `${Math.abs(diffDays)}d overdue`;
        } else if (diffHours <= 24) {
          slaStatus = "At_Risk";
          slaRemainingLabel = `${Math.max(1, diffHours)}h left`;
        } else {
          slaStatus = "On_Track";
          slaRemainingLabel = `${diffDays}d left`;
        }
      }

      return {
        ...v,
        entityName,
        entityOwner,
        teamLead,
        notificationTargets,
        assignedOfficer,
        dueDate: dueDate.toISOString(),
        slaStatus,
        slaRemainingLabel,
      };
    });
}

/**
 * Read scope (X2): a Team Member only sees violations they reported, or that concern a task
 * assigned to them or evidence they submitted. Other roles keep company-wide access.
 */
async function buildViolationReadWhere(req) {
  const where = { companyId: req.user.companyId };
  const role = normalizeRole(req.user?.role);
  if (role === 'team_member' || role === 'member') {
    const myTasks = await prisma.task.findMany({
      where: { companyId: req.user.companyId, assignedToId: req.user.id },
      select: { id: true },
    });
    where.OR = [
      { reportedById: req.user.id },
      { entityType: 'Task', entityId: { in: myTasks.map((t) => t.id) } },
      { evidence: { some: { userId: req.user.id } } },
    ];
  }

  // PRE-M1-02: Query parameter filters (taskId, ruleId, entityId, entityType, status, severity)
  const { taskId, task_id, ruleId, rule_id, entityId, entity_id, entityType, entity_type, status, severity } = req.query || {};
  const filterTaskId = taskId || task_id;
  const filterRuleId = ruleId || rule_id;
  const filterEntityId = entityId || entity_id;
  const filterEntityType = entityType || entity_type;

  if (filterRuleId) where.ruleId = String(filterRuleId);
  if (status) where.status = String(status);
  if (severity) where.severity = String(severity);

  if (filterTaskId) {
    where.entityType = 'Task';
    where.entityId = String(filterTaskId);
  } else if (filterEntityId) {
    where.entityId = String(filterEntityId);
    if (filterEntityType) where.entityType = String(filterEntityType);
  }

  return where;
}

export async function listComplianceViolations(req, res, next) {
  try {
    const violations = await prisma.complianceViolation.findMany({
      where: await buildViolationReadWhere(req),
      include: VIOLATION_LIST_INCLUDE,
      orderBy: { detectedAt: "desc" },
    });
    const hydratedViolations = await hydrateViolations(violations);

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
      where: { AND: [{ id }, await buildViolationReadWhere(req)] },
      include: VIOLATION_LIST_INCLUDE,
    });

    if (!violation) {
      throw new NotFoundError(`Compliance violation with ID ${id} not found`);
    }

    const hydrated = (await hydrateViolations([violation]))[0];

    res.status(200).json({
      success: true,
      data: hydrated,
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

    const duplicate = await prisma.complianceViolation.findFirst({
      where: { ruleId, entityType, entityId, status: { in: ["Open", "Under_Review"] } },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictError("An active violation already exists for this rule and record");
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
        dueDate: dueDate ? new Date(dueDate) : calculateSlaDueDate(severity),
      },
      include: VIOLATION_LIST_INCLUDE,
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
      data: (await hydrateViolations([newViolation]))[0],
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
      include: VIOLATION_LIST_INCLUDE,
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

    const hydrated = (await hydrateViolations([updated]))[0];

    if (body.notifyOwner || body.notifyTeamLead || (Array.isArray(body.notifyUserIds) && body.notifyUserIds.length > 0)) {
      const candidateIds = resolveViolationTargetUserIds(hydrated, {
        targetUserIds: body.notifyUserIds,
        targetUserId: body.notifyUserId,
        targetRole: body.notifyTeamLead ? "team_lead" : "owner",
      });
      if (candidateIds.length > 0) {
        const noticeText =
          (typeof body.notifyMessage === "string" && body.notifyMessage.trim()) ||
          updateData.resolutionRemarks ||
          `Compliance update for "${hydrated.entityName}" (${hydrated.rule?.name || "Policy"}).`;
        await dispatchViolationNotifications({
          companyId: req.user.companyId,
          sender: req.user,
          violation: hydrated,
          title: `Compliance Notice: ${hydrated.rule?.name || hydrated.entityName}`,
          message: noticeText,
          targetUserIds: candidateIds,
        }).catch((err) => {
          console.warn("[Notification] Compliance resolve notification failed:", err.message);
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Compliance violation updated successfully",
      data: hydrated,
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

function resolveViolationTargetUserIds(hydratedViolation, options = {}) {
  const { targetUserIds, targetUserId, targetRole } = options;
  if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    return Array.from(new Set(targetUserIds.filter(Boolean).map(String)));
  }
  if (targetUserId) {
    return [String(targetUserId)];
  }
  const roleKey = typeof targetRole === "string" ? targetRole.trim().toLowerCase() : "";
  if (roleKey === "team_lead") {
    return hydratedViolation.teamLead?.id
      ? [hydratedViolation.teamLead.id]
      : hydratedViolation.entityOwner?.id
        ? [hydratedViolation.entityOwner.id]
        : [];
  }
  if (roleKey === "both") {
    return Array.from(
      new Set(
        [hydratedViolation.teamLead?.id, hydratedViolation.entityOwner?.id].filter(Boolean),
      ),
    );
  }
  if (roleKey === "all") {
    return (hydratedViolation.notificationTargets || []).map((t) => t.id).filter(Boolean);
  }
  if (hydratedViolation.entityType === "Project") {
    const primary = hydratedViolation.teamLead?.id || hydratedViolation.entityOwner?.id;
    return primary ? [primary] : [];
  }
  const primary = hydratedViolation.entityOwner?.id || hydratedViolation.teamLead?.id;
  return primary ? [primary] : [];
}

async function dispatchViolationNotifications({
  companyId,
  sender,
  violation,
  title,
  message,
  targetUserIds,
}) {
  const uniqueIds = Array.from(new Set((targetUserIds || []).filter(Boolean).map(String)));
  if (uniqueIds.length === 0) return { notifications: [], recipients: [] };

  const recipients = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, companyId, isActive: true },
    select: CONTACT_USER_SELECT,
  });

  if (recipients.length === 0) return { notifications: [], recipients: [] };

  const notifications = await Promise.all(
    recipients.map((recipient) =>
      prisma.notification.create({
        data: {
          companyId,
          userId: recipient.id,
          title,
          message,
          type: "Compliance",
        },
      }),
    ),
  );

  try {
    await createComplianceAuditLog({
      companyId,
      violationId: violation.id,
      ruleId: violation.ruleId || null,
      action: AUDIT_ACTIONS.UPDATE,
      performedById: sender?.id || null,
      newValue: {
        notificationSent: true,
        recipients: recipients.map((r) => r.email || r.id),
        title,
        message,
      },
    });
  } catch (auditErr) {
    console.warn("[AuditLog] Notice: Audit logging for violation notification:", auditErr.message);
  }

  return { notifications, recipients };
}

/**
 * POST /api/compliance-violations/:id/notify-owner
 * Dispatches an urgent remediation notification to the Team Leader and/or owner of the violating entity.
 */
export async function notifyViolationOwner(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const violation = await prisma.complianceViolation.findFirst({
      where: { id, companyId: req.user.companyId },
      include: VIOLATION_LIST_INCLUDE,
    });
    if (!violation) {
      throw new NotFoundError(`Compliance violation with ID ${id} not found`);
    }

    const [hydrated] = await hydrateViolations([violation]);
    const candidateIds = resolveViolationTargetUserIds(hydrated, {
      targetUserIds: body.targetUserIds,
      targetUserId: body.targetUserId,
      targetRole: body.targetRole,
    });

    if (candidateIds.length === 0) {
      throw new BadRequestError("No owner or team leader found for this violating entity to notify");
    }

    const title = body.title?.trim() || `Compliance Remediation: ${hydrated.rule?.name || "Action Required"}`;
    const message =
      body.message?.trim() ||
      `Compliance Officer ${req.user.fullName || req.user.email} requested remediation for policy "${hydrated.rule?.name}". Please complete the required deliverable.`;

    const { notifications, recipients } = await dispatchViolationNotifications({
      companyId: req.user.companyId,
      sender: req.user,
      violation: hydrated,
      title,
      message,
      targetUserIds: candidateIds,
    });

    if (recipients.length === 0) {
      throw new BadRequestError("No active recipient found in this company for the selected target");
    }

    const recipientSummary = recipients.map((r) => r.fullName || r.email).join(", ");
    res.status(200).json({
      success: true,
      message: `Remediation notice dispatched to ${recipientSummary}`,
      data: notifications,
      recipients,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Checks all active violations past their SLA dueDate and creates auto-escalations for Critical/High violations.
 */
export async function checkAndEscalateViolationSlas(companyId) {
  const now = new Date();
  const openViolations = await prisma.complianceViolation.findMany({
    where: {
      companyId,
      status: { in: ['Open', 'Under_Review'] },
      dueDate: { lt: now },
      severity: { in: ['Critical', 'High'] },
      entityType: 'Task',
    },
    include: {
      rule: true,
    },
  });

  let escalatedCount = 0;
  for (const v of openViolations) {
    const existingEsc = await prisma.escalation.findFirst({
      where: {
        taskId: v.entityId,
        companyId,
        status: 'Open',
        title: { contains: 'SLA Breached' },
      },
    });

    if (!existingEsc) {
      const task = await prisma.task.findUnique({
        where: { id: v.entityId },
        select: { id: true, title: true, projectId: true, assignedToId: true, createdById: true },
      });

      if (task) {
        try {
          await prisma.escalation.create({
            data: {
              companyId,
              taskId: task.id,
              projectId: task.projectId || null,
              reportedById: v.reportedById || task.createdById || task.assignedToId || null,
              title: `SLA Breached: Critical Compliance Violation (${v.rule?.name || 'Policy'})`,
              description: `Violation ${v.id} on task "${task.title}" breached its ${v.severity} SLA deadline on ${v.dueDate ? new Date(v.dueDate).toISOString() : 'now'}. Immediate remediation or waiver required.`,
              blockerType: 'Compliance Blocker',
              priority: 'Critical',
              status: 'Open',
            },
          });

          const targetUserId = task.assignedToId || task.createdById;
          if (targetUserId) {
            await prisma.notification.create({
              data: {
                companyId,
                userId: targetUserId,
                title: 'SLA Breached: Compliance Violation',
                message: `A ${v.severity} compliance violation on task "${task.title}" has breached its SLA deadline.`,
                type: 'Compliance',
              },
            }).catch(() => {});
          }

          escalatedCount++;
        } catch (escErr) {
          console.warn('[Escalation] Could not auto-create SLA escalation:', escErr.message);
        }
      }
    }
  }

  return escalatedCount;
}

/**
 * POST /api/compliance-violations/check-slas
 * Triggers SLA checking and escalations on demand.
 */
export async function checkViolationSlasHandler(req, res, next) {
  try {
    const escalatedCount = await checkAndEscalateViolationSlas(req.user.companyId);
    res.status(200).json({
      success: true,
      message: `SLA check completed. ${escalatedCount} violation(s) escalated.`,
      escalatedCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance-violations/export/csv
 * Exports compliance violations to an audit-ready CSV file.
 */
export async function exportComplianceViolationsCsv(req, res, next) {
  try {
    const where = await buildViolationReadWhere(req);
    const { status, severity, entityType } = req.query || {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (entityType) where.entityType = entityType;

    const rawList = await prisma.complianceViolation.findMany({
      where,
      include: VIOLATION_LIST_INCLUDE,
      orderBy: { detectedAt: 'desc' },
    });

    const hydrated = await hydrateViolations(rawList);

    const headers = [
      'Violation ID',
      'Rule Name',
      'Rule Type',
      'Category',
      'Severity',
      'Status',
      'SLA Status',
      'SLA Time Remaining',
      'Due Date',
      'Entity Type',
      'Entity Name',
      'Entity Owner',
      'Assigned Officer',
      'Detected At',
      'Resolved At',
      'Resolved By',
      'Resolution Remarks',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const rows = hydrated.map((v) => [
      escapeCsv(v.id),
      escapeCsv(v.rule?.name || 'N/A'),
      escapeCsv(v.rule?.ruleType || 'N/A'),
      escapeCsv(v.rule?.category?.name || 'General'),
      escapeCsv(v.severity),
      escapeCsv(v.status),
      escapeCsv(v.slaStatus || 'N/A'),
      escapeCsv(v.slaRemainingLabel || 'N/A'),
      escapeCsv(v.dueDate || 'N/A'),
      escapeCsv(v.entityType),
      escapeCsv(v.entityName || 'N/A'),
      escapeCsv(v.entityOwner ? (v.entityOwner.fullName || v.entityOwner.email) : 'Unassigned'),
      escapeCsv(v.assignedOfficer ? (v.assignedOfficer.fullName || v.assignedOfficer.email) : 'Global Compliance Team'),
      escapeCsv(v.detectedAt ? new Date(v.detectedAt).toISOString() : ''),
      escapeCsv(v.resolvedAt ? new Date(v.resolvedAt).toISOString() : ''),
      escapeCsv(v.resolvedBy ? (v.resolvedBy.fullName || v.resolvedBy.email) : ''),
      escapeCsv(v.resolutionRemarks || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const filename = `compliance-violations-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

