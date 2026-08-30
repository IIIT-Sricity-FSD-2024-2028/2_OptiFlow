import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateComplianceViolationDto } from './dto/create-compliance-violation.dto';
import { UpdateComplianceViolationDto } from './dto/update-compliance-violation.dto';
import {
  buildViolationCompanyWhere,
  buildBranchViolationWhere,
  resolveEffectiveBranchId,
  TenantListScope,
} from '../../core/utils/tenant-scope.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComplianceViolationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(scope: TenantListScope) {
    const { companyId, user } = scope;
    let where: Prisma.ComplianceViolationWhereInput =
      buildViolationCompanyWhere(scope);

    const effectiveBranchId = resolveEffectiveBranchId(scope);
    if (effectiveBranchId && companyId) {
      where = await buildBranchViolationWhere(
        this.prisma,
        companyId,
        effectiveBranchId,
      );
    }

    return this.prisma.complianceViolation.findMany({
      where,
      include: {
        rule: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        evidence: true,
      },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const violation = await this.prisma.complianceViolation.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        rule: true,
        reportedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true, email: true } },
        evidence: true,
      },
    });
    if (!violation) throw new NotFoundException(`Violation ${id} not found`);
    return violation;
  }

  async create(dto: CreateComplianceViolationDto) {
    const rule = await this.prisma.complianceRule.findUnique({
      where: { id: dto.rule_id },
    });
    if (!rule) throw new NotFoundException(`Rule ${dto.rule_id} not found`);

    return this.prisma.complianceViolation.create({
      data: {
        companyId: dto.companyId,
        ruleId: dto.rule_id,
        entityType: dto.entity_type,
        entityId: String(dto.entity_id),
        status: 'Open',
        severity: dto.severity || rule.severity,
        reportedById: dto.reported_by ?? null,
        dueDate: dto.due_date ? new Date(dto.due_date) : null,
      },
      include: { rule: true },
    });
  }

  async update(
    id: string,
    dto: UpdateComplianceViolationDto,
    companyId?: string,
  ) {
    await this.findOne(id, companyId);
    return this.prisma.complianceViolation.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status as any } : {}),
        ...(dto.resolution_remarks
          ? { resolutionRemarks: dto.resolution_remarks }
          : {}),
        ...(dto.resolved_by
          ? { resolvedById: String(dto.resolved_by), resolvedAt: new Date() }
          : {}),
      },
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.complianceViolation.delete({ where: { id } });
    return { message: 'Compliance violation deleted successfully' };
  }
}
