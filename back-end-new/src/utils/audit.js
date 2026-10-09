import { prisma } from '../config/prisma.js';
import { BadRequestError } from './errors.js';

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  LOGIN: 'LOGIN',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
};

const VALID_ACTIONS = new Set(Object.values(AUDIT_ACTIONS));

export async function createComplianceAuditLog({
  companyId, ruleId = null, violationId = null, evidenceId = null,
  action, performedById = null, oldValue = null, newValue = null,
}) {
  if (!companyId) throw new BadRequestError('companyId is required');
  const normalizedAction = (typeof action === 'string' ? action.trim().toUpperCase() : '');
  if (!VALID_ACTIONS.has(normalizedAction)) throw new BadRequestError(`Invalid action`);

  return await prisma.complianceAuditLog.create({
    data: { companyId: companyId.trim(), ruleId, violationId, evidenceId, action: normalizedAction, performedById, oldValue, newValue },
  });
}

export async function createSystemAuditLog({
  companyId, targetUserId = null, roleId = null, teamId = null, branchId = null,
  action, performedById = null, oldValue = null, newValue = null, ipAddress = null, userAgent = null,
}) {
  if (!companyId) throw new BadRequestError('companyId is required');
  const normalizedAction = (typeof action === 'string' ? action.trim().toUpperCase() : '');
  if (!VALID_ACTIONS.has(normalizedAction)) throw new BadRequestError(`Invalid action`);

  return await prisma.systemAuditLog.create({
    data: { companyId: companyId.trim(), targetUserId, roleId, teamId, branchId, action: normalizedAction, performedById, oldValue, newValue, ipAddress, userAgent },
  });
}

export async function createProcessAuditLog({
  companyId, projectId = null, taskId = null, templateId = null,
  action, performedById = null, oldValue = null, newValue = null,
}) {
  if (!companyId) throw new BadRequestError('companyId is required');
  const normalizedAction = (typeof action === 'string' ? action.trim().toUpperCase() : '');
  if (!VALID_ACTIONS.has(normalizedAction)) throw new BadRequestError(`Invalid action`);

  return await prisma.processAuditLog.create({
    data: { companyId: companyId.trim(), projectId, taskId, templateId, action: normalizedAction, performedById, oldValue, newValue },
  });
}
