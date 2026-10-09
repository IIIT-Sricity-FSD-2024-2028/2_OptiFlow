import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { prisma } from '../config/prisma.js';
import { requireRoles } from '../middleware/authorize.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { validateRequired, validateEnum } from '../utils/validation.js';
import { ROLES, normalizeRole } from '../utils/roles.js';
import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';

export async function listComplianceCategories(req, res, next) {
  try {
    const categories = await prisma.complianceCategory.findMany({
      where: {
        OR: [{ companyId: null }, { companyId: req.user.companyId }],
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { rules: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
}

export async function getComplianceCategoryById(req, res, next) {
  try {
    const { id } = req.params;

    const category = await prisma.complianceCategory.findFirst({
      where: {
        id,
        OR: [{ companyId: null }, { companyId: req.user.companyId }],
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        rules: true,
      },
    });

    if (!category) {
      throw new NotFoundError(`Compliance category with ID ${id} not found`);
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

export async function createComplianceCategory(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const description = (body.description || '').trim();

    validateRequired({ name }, ['name']);

    const category = await prisma.complianceCategory.create({
      data: {
        companyId: req.user.companyId,
        name,
        description: description || null,
        ownerId: req.user.id,
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Compliance category created successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateComplianceCategory(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const existing = await prisma.complianceCategory.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance category ${id} not found in this company`);
    }

    const updateData = {};
    if (body.name) updateData.name = String(body.name).trim();
    if (body.description !== undefined) updateData.description = String(body.description).trim();

    const updated = await prisma.complianceCategory.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: 'Compliance category updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteComplianceCategory(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.complianceCategory.findFirst({
      where: { id, companyId: req.user.companyId },
    });

    if (!existing) {
      throw new NotFoundError(`Compliance category ${id} not found in this company`);
    }

    await prisma.complianceCategory.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Compliance category deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

