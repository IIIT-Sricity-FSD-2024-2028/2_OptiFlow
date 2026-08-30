import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto';
import { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto';

@Injectable()
export class ComplianceRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.complianceRule.findMany({
      where: companyId
        ? { OR: [{ companyId: null }, { companyId }] }
        : undefined,
      include: {
        category: true,
        bindings: true,
        violations: { where: { status: 'Open' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId?: string) {
    const rule = await this.prisma.complianceRule.findFirst({
      where: {
        id,
        ...(companyId ? { OR: [{ companyId: null }, { companyId }] } : {}),
      },
      include: {
        category: true,
        bindings: true,
        violations: true,
      },
    });
    if (!rule) throw new NotFoundException(`Compliance rule ${id} not found`);
    return rule;
  }

  async create(dto: CreateComplianceRuleDto, companyId?: string) {
    return this.prisma.complianceRule.create({
      data: {
        companyId: companyId || dto.companyId || null,
        name: dto.rule_name || (dto as any).name,
        description: dto.description,
        severity: dto.severity as any,
        categoryId: dto.categoryId ?? null,
        sourceTemplateId: dto.sourceTemplateId ?? null,
        isActive: dto.is_active ?? (dto as any).isActive ?? true,
      },
      include: { category: true, bindings: true },
    });
  }

  async update(id: string, dto: UpdateComplianceRuleDto, companyId?: string) {
    await this.findOne(id, companyId);
    return this.prisma.complianceRule.update({
      where: { id },
      data: {
        ...(dto.rule_name !== undefined || (dto as any).name !== undefined
          ? { name: dto.rule_name || (dto as any).name }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.severity !== undefined ? { severity: dto.severity as any } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.is_active !== undefined || (dto as any).isActive !== undefined
          ? { isActive: dto.is_active ?? (dto as any).isActive }
          : {}),
      },
      include: { category: true, bindings: true },
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.complianceRule.delete({ where: { id } });
    return { message: 'Compliance rule deleted successfully' };
  }
}
