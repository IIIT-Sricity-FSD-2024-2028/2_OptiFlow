import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.subscription.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { id: true, legalName: true, status: true } },
        plan: true,
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        company: true,
        plan: true,
      },
    });
    if (!r) throw new NotFoundException(`Subscription ${id} not found`);
    return r;
  }

  async create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        companyId: dto.companyId,
        planId: dto.planId,
        billingCycle: dto.billingCycle,
        status: dto.status ?? 'Active',
        currentPeriodEnd: new Date(dto.currentPeriodEnd),
      },
      include: {
        company: { select: { id: true, legalName: true } },
        plan: true,
      },
    });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.companyId ? { companyId: dto.companyId } : {}),
        ...(dto.planId ? { planId: dto.planId } : {}),
        ...(dto.billingCycle ? { billingCycle: dto.billingCycle } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.currentPeriodEnd
          ? { currentPeriodEnd: new Date(dto.currentPeriodEnd) }
          : {}),
      },
      include: {
        company: { select: { id: true, legalName: true } },
        plan: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.subscription.delete({ where: { id } });
    return { message: `Subscription ${id} deleted successfully` };
  }
}
