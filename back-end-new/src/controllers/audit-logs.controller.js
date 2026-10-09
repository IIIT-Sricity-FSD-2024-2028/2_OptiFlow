import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEmail } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listAuditLogs(req, res, next) {
  try {
    const logs = await prisma.complianceAuditLog.findMany({
      where: {
        companyId: req.user.companyId,
      },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
        rule: { select: { name: true } },
        violation: { select: { rule: { select: { name: true } } } },
        evidence: { select: { title: true } }
      },
      orderBy: { performedAt: 'desc' },
      take: 100,
    });

    const hydratedLogs = logs.map(log => {
      let entityName = "Unknown Entity";
      let entityType = "Unknown";
      let entityId = null;

      if (log.ruleId) {
        entityType = "ComplianceRule";
        entityId = log.ruleId;
        entityName = log.rule?.name || `Rule #${log.ruleId.substring(0,8)}`;
      } else if (log.violationId) {
        entityType = "ComplianceViolation";
        entityId = log.violationId;
        entityName = log.violation?.rule?.name ? `Violation: ${log.violation.rule.name}` : `Violation #${log.violationId.substring(0,8)}`;
      } else if (log.evidenceId) {
        entityType = "ComplianceEvidence";
        entityId = log.evidenceId;
        entityName = log.evidence?.title || `Evidence #${log.evidenceId.substring(0,8)}`;
      }

      return {
        ...log,
        entityType,
        entityId,
        entityName,
      };
    });

    res.status(200).json({
      success: true,
      data: hydratedLogs,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogsByUser(req, res, next) {
  try {
    const { userId } = req.params;

    const logs = await prisma.auditLog.findMany({
      where: {
        companyId: req.user.companyId,
        performedById: userId,
      },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { performedAt: 'desc' },
    });

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

    const logs = await prisma.auditLog.findMany({
      where: {
        companyId: req.user.companyId,
        entityType,
        entityId: String(entityId),
      },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { performedAt: 'desc' },
    });

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

