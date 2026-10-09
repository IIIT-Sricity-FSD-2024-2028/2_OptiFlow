import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listComplianceBindings(req, res, next) {
  try {
    const { ruleId } = req.query;

    const where = {
      rule: {
        OR: [{ companyId: null }, { companyId: req.user.companyId }],
      },
      ...(ruleId ? { ruleId: String(ruleId) } : {}),
    };

    const bindings = await prisma.complianceBinding.findMany({
      where,
      include: {
        rule: true,
      },
    });

    res.status(200).json({
      success: true,
      data: bindings,
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplianceBindingById(req, res, next) {
  try {
    const { id } = req.params;

    const binding = await prisma.complianceBinding.findFirst({
      where: {
        id,
        rule: {
          OR: [{ companyId: null }, { companyId: req.user.companyId }],
        },
      },
      include: {
        rule: true,
      },
    });

    if (!binding) {
      throw new NotFoundError(`Compliance binding ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: binding,
    });
  } catch (err) {
    next(err);
  }
}

export async function createComplianceBinding(req, res, next) {
  try {
    const body = req.body || {};
    const ruleId = body.ruleId || body.rule_id;
    const scopeType = body.scopeType || body.scope_type || 'Company';
    const scopeId = body.scopeId || body.scope_id || req.user.companyId;

    validateRequired({ ruleId, scopeType, scopeId }, ['ruleId', 'scopeType', 'scopeId']);
    validateEnum(scopeType, ['Company', 'Branch', 'Team', 'Project'], 'scopeType');

    const rule = await prisma.complianceRule.findFirst({
      where: {
        id: String(ruleId),
        OR: [{ companyId: null }, { companyId: req.user.companyId }],
      },
    });

    if (!rule) {
      throw new NotFoundError(`Compliance rule ${ruleId} not found`);
    }

    const binding = await prisma.complianceBinding.create({
      data: {
        ruleId: String(ruleId),
        scopeType,
        scopeId: String(scopeId),
        companyId: req.user.companyId,
      },
      include: {
        rule: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Compliance binding created successfully',
      data: binding,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteComplianceBinding(req, res, next) {
  try {
    const { id } = req.params;

    const binding = await prisma.complianceBinding.findFirst({
      where: {
        id,
        rule: {
          OR: [{ companyId: null }, { companyId: req.user.companyId }],
        },
      },
    });

    if (!binding) {
      throw new NotFoundError(`Compliance binding ${id} not found`);
    }

    await prisma.complianceBinding.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Compliance binding deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

