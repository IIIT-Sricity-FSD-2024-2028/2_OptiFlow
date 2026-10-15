import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listAuditLogs(req, res, next) {
  try {
    const type = (req.auditType || req.query?.type || '').toLowerCase();

    // 1. SYSTEM AUDIT LOGS (Users, Roles, Teams, Branches, Security Context)
    if (type === 'system') {
      const logs = await prisma.systemAuditLog.findMany({
        where: {
          companyId: req.user.companyId,
        },
        include: {
          performedBy: { select: { id: true, fullName: true, email: true } },
          targetUser: { select: { id: true, fullName: true, email: true } },
          role: { select: { id: true, name: true, label: true } },
          team: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { performedAt: 'desc' },
        take: 200,
      });

      const hydratedLogs = logs.map((log) => {
        let entityType = 'System';
        let entityId = null;
        let entityName = 'System Resource';

        if (log.targetUserId) {
          entityType = 'User';
          entityId = log.targetUserId;
          entityName = log.targetUser?.fullName || `User #${log.targetUserId.substring(0, 8)}`;
        } else if (log.roleId) {
          entityType = 'Role';
          entityId = log.roleId;
          entityName = log.role?.label || log.role?.name || `Role #${log.roleId.substring(0, 8)}`;
        } else if (log.teamId) {
          entityType = 'Team';
          entityId = log.teamId;
          entityName = log.team?.name || `Team #${log.teamId.substring(0, 8)}`;
        } else if (log.branchId) {
          entityType = 'Branch';
          entityId = log.branchId;
          entityName = log.branch?.name || `Branch #${log.branchId.substring(0, 8)}`;
        }

        return {
          ...log,
          entityType,
          entityId,
          entityName,
        };
      });

      return res.status(200).json({
        success: true,
        data: hydratedLogs,
      });
    }

    // 2. PROCESS AUDIT LOGS (Workflow Blueprints, Instances, Projects, Tasks)
    if (type === 'process') {
      const logs = await prisma.processAuditLog.findMany({
        where: {
          companyId: req.user.companyId,
        },
        include: {
          performedBy: { select: { id: true, fullName: true, email: true } },
          project: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { performedAt: 'desc' },
        take: 200,
      });

      const hydratedLogs = logs.map((log) => {
        let entityType = 'Process';
        let entityId = null;
        let entityName = 'Process Workflow';

        if (log.taskId) {
          entityType = 'Task';
          entityId = log.taskId;
          entityName = log.task?.title || `Task #${log.taskId.substring(0, 8)}`;
        } else if (log.projectId) {
          entityType = 'Project';
          entityId = log.projectId;
          entityName = log.project?.name || `Project #${log.projectId.substring(0, 8)}`;
        } else if (log.templateId) {
          entityType = 'ProcessTemplate';
          entityId = log.templateId;
          entityName = log.template?.name || `Template #${log.templateId.substring(0, 8)}`;
        }

        return {
          ...log,
          entityType,
          entityId,
          entityName,
        };
      });

      return res.status(200).json({
        success: true,
        data: hydratedLogs,
      });
    }

    // 3. UNIFIED ENTERPRISE AUDIT TRAIL (All 3 streams merged for Executives)
    if (type === 'all') {
      const [sysLogs, procLogs, compLogs] = await Promise.all([
        prisma.systemAuditLog.findMany({
          where: { companyId: req.user.companyId },
          include: {
            performedBy: { select: { id: true, fullName: true, email: true } },
            targetUser: { select: { id: true, fullName: true, email: true } },
            role: { select: { id: true, name: true, label: true } },
            team: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true, code: true } },
          },
          orderBy: { performedAt: 'desc' },
          take: 100,
        }),
        prisma.processAuditLog.findMany({
          where: { companyId: req.user.companyId },
          include: {
            performedBy: { select: { id: true, fullName: true, email: true } },
            project: { select: { id: true, name: true } },
            task: { select: { id: true, title: true } },
            template: { select: { id: true, name: true } },
          },
          orderBy: { performedAt: 'desc' },
          take: 100,
        }),
        prisma.complianceAuditLog.findMany({
          where: { companyId: req.user.companyId },
          include: {
            performedBy: { select: { id: true, fullName: true, email: true } },
            rule: { select: { name: true } },
            violation: { select: { rule: { select: { name: true } } } },
            evidence: { select: { title: true } },
          },
          orderBy: { performedAt: 'desc' },
          take: 100,
        }),
      ]);

      const hydratedSys = sysLogs.map((log) => {
        let entityType = 'System';
        let entityId = null;
        let entityName = 'System Resource';
        if (log.targetUserId) {
          entityType = 'User';
          entityId = log.targetUserId;
          entityName = log.targetUser?.fullName || `User #${log.targetUserId.substring(0, 8)}`;
        } else if (log.roleId) {
          entityType = 'Role';
          entityId = log.roleId;
          entityName = log.role?.label || log.role?.name || `Role #${log.roleId.substring(0, 8)}`;
        } else if (log.teamId) {
          entityType = 'Team';
          entityId = log.teamId;
          entityName = log.team?.name || `Team #${log.teamId.substring(0, 8)}`;
        } else if (log.branchId) {
          entityType = 'Branch';
          entityId = log.branchId;
          entityName = log.branch?.name || `Branch #${log.branchId.substring(0, 8)}`;
        }
        return { ...log, entityType, entityId, entityName, stream: 'system' };
      });

      const hydratedProc = procLogs.map((log) => {
        let entityType = 'Process';
        let entityId = null;
        let entityName = 'Process Workflow';
        if (log.taskId) {
          entityType = 'Task';
          entityId = log.taskId;
          entityName = log.task?.title || `Task #${log.taskId.substring(0, 8)}`;
        } else if (log.projectId) {
          entityType = 'Project';
          entityId = log.projectId;
          entityName = log.project?.name || `Project #${log.projectId.substring(0, 8)}`;
        } else if (log.templateId) {
          entityType = 'ProcessTemplate';
          entityId = log.templateId;
          entityName = log.template?.name || `Template #${log.templateId.substring(0, 8)}`;
        }
        return { ...log, entityType, entityId, entityName, stream: 'process' };
      });

      const hydratedComp = compLogs.map((log) => {
        let entityType = 'Compliance';
        let entityId = null;
        let entityName = 'Compliance Record';
        if (log.ruleId) {
          entityType = 'ComplianceRule';
          entityId = log.ruleId;
          entityName = log.rule?.name || `Rule #${log.ruleId.substring(0, 8)}`;
        } else if (log.violationId) {
          entityType = 'ComplianceViolation';
          entityId = log.violationId;
          entityName = log.violation?.rule?.name ? `Violation: ${log.violation.rule.name}` : `Violation #${log.violationId.substring(0, 8)}`;
        } else if (log.evidenceId) {
          entityType = 'ComplianceEvidence';
          entityId = log.evidenceId;
          entityName = log.evidence?.title || `Evidence #${log.evidenceId.substring(0, 8)}`;
        }
        return { ...log, entityType, entityId, entityName, stream: 'compliance' };
      });

      const merged = [...hydratedSys, ...hydratedProc, ...hydratedComp].sort(
        (a, b) => new Date(b.performedAt) - new Date(a.performedAt)
      );

      return res.status(200).json({
        success: true,
        data: merged,
      });
    }

    // 4. COMPLIANCE AUDIT LOGS (Rules, Violations, Evidence) - Default
    const logs = await prisma.complianceAuditLog.findMany({
      where: {
        companyId: req.user.companyId,
      },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
        rule: { select: { name: true } },
        violation: { select: { rule: { select: { name: true } } } },
        evidence: { select: { title: true } },
      },
      orderBy: { performedAt: 'desc' },
      take: 200,
    });

    const hydratedLogs = logs.map((log) => {
      let entityName = "Unknown Entity";
      let entityType = "Unknown";
      let entityId = null;

      if (log.ruleId) {
        entityType = "ComplianceRule";
        entityId = log.ruleId;
        entityName = log.rule?.name || `Rule #${log.ruleId.substring(0, 8)}`;
      } else if (log.violationId) {
        entityType = "ComplianceViolation";
        entityId = log.violationId;
        entityName = log.violation?.rule?.name ? `Violation: ${log.violation.rule.name}` : `Violation #${log.violationId.substring(0, 8)}`;
      } else if (log.evidenceId) {
        entityType = "ComplianceEvidence";
        entityId = log.evidenceId;
        entityName = log.evidence?.title || `Evidence #${log.evidenceId.substring(0, 8)}`;
      }

      return {
        ...log,
        entityType,
        entityId,
        entityName,
      };
    });

    return res.status(200).json({
      success: true,
      data: hydratedLogs,
    });
  } catch (err) {
    next(err);
  }
}

export async function listSystemAuditLogs(req, res, next) {
  req.auditType = 'system';
  return listAuditLogs(req, res, next);
}

export async function listProcessAuditLogs(req, res, next) {
  req.auditType = 'process';
  return listAuditLogs(req, res, next);
}

export async function listAuditLogsByUser(req, res, next) {
  try {
    const { userId } = req.params;

    const [complianceLogs, systemLogs, processLogs] = await Promise.all([
      prisma.complianceAuditLog.findMany({
        where: { companyId: req.user.companyId, performedById: userId },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      }),
      prisma.systemAuditLog.findMany({
        where: { companyId: req.user.companyId, performedById: userId },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      }),
      prisma.processAuditLog.findMany({
        where: { companyId: req.user.companyId, performedById: userId },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      }),
    ]);

    const logs = [...complianceLogs, ...systemLogs, ...processLogs].sort(
      (a, b) => new Date(b.performedAt) - new Date(a.performedAt)
    );

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogsByEntity(req, res, next) {
  try {
    const { entityType, entityId } = req.params;

    let logs = [];
    if (entityType === 'ComplianceRule' || entityType === 'rule') {
      logs = await prisma.complianceAuditLog.findMany({
        where: { companyId: req.user.companyId, ruleId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    } else if (entityType === 'ComplianceViolation' || entityType === 'violation') {
      logs = await prisma.complianceAuditLog.findMany({
        where: { companyId: req.user.companyId, violationId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    } else if (entityType === 'ComplianceEvidence' || entityType === 'evidence') {
      logs = await prisma.complianceAuditLog.findMany({
        where: { companyId: req.user.companyId, evidenceId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    } else if (entityType === 'Task' || entityType === 'task') {
      logs = await prisma.processAuditLog.findMany({
        where: { companyId: req.user.companyId, taskId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    } else if (entityType === 'Project' || entityType === 'project') {
      logs = await prisma.processAuditLog.findMany({
        where: { companyId: req.user.companyId, projectId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    } else if (entityType === 'User' || entityType === 'user') {
      logs = await prisma.systemAuditLog.findMany({
        where: { companyId: req.user.companyId, targetUserId: String(entityId) },
        include: { performedBy: { select: { id: true, fullName: true, email: true } } },
        orderBy: { performedAt: 'desc' },
      });
    }

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
}

export async function createAuditLogEndpoint(req, res, next) {
  try {
    const { action, entityType, entityId, oldValue, newValue } = req.body;
    validateRequired(req.body, ['entityType', 'entityId']);

    const validAction = action && Object.values(AUDIT_ACTIONS).includes(action.toUpperCase())
      ? action.toUpperCase()
      : AUDIT_ACTIONS.UPDATE;

    let ruleId = null;
    let violationId = null;
    let evidenceId = null;

    if (entityType === 'ComplianceRule') ruleId = entityId;
    else if (entityType === 'ComplianceViolation') violationId = entityId;
    else if (entityType === 'ComplianceEvidence') evidenceId = entityId;
    else throw new BadRequestError('Invalid compliance entity type');

    const created = await createComplianceAuditLog({
      companyId: req.user.companyId,
      ruleId,
      violationId,
      evidenceId,
      action: validAction,
      performedById: req.user.id,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    });

    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

