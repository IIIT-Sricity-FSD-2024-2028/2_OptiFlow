import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        maxBranches: dto.maxBranches ?? null,
        maxUsers: dto.maxUsers ?? null,
        maxActiveProcessTemplates: dto.maxActiveProcessTemplates ?? null,
        maxComplianceRules: dto.maxComplianceRules ?? null,
        auditLogRetentionDays: dto.auditLogRetentionDays,
        allowsIntegrations: dto.allowsIntegrations,
        monthlyPrice: dto.monthlyPrice ?? 0,
        annualPrice: dto.annualPrice ?? 0,
        currency: dto.currency ?? 'USD',
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
      },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { company: true },
        },
      },
    });
    if (!plan) throw new NotFoundException(`Plan with ID ${id} not found`);
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.plan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.plan.delete({ where: { id } });
    return { message: `Plan ${id} deleted successfully` };
  }
}
