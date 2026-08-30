import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BRANCH_LIMIT_MSG =
  'Plan limit reached. Please upgrade your subscription.';

@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async checkBranchLimit(companyId: string): Promise<void> {
    const currentBranchesCount = await this.prisma.branch.count({
      where: { companyId },
    });

    const sub = await this.prisma.subscription.findFirst({
      where: { companyId, status: 'Active' },
      include: { plan: true },
    });

    if (sub && sub.plan && sub.plan.maxBranches !== null) {
      if (currentBranchesCount >= sub.plan.maxBranches) {
        throw new ForbiddenException(BRANCH_LIMIT_MSG);
      }
    }
  }

  async checkUserLimit(companyId: string): Promise<void> {
    const currentUserCount = await this.prisma.user.count({
      where: { companyId },
    });

    const sub = await this.prisma.subscription.findFirst({
      where: { companyId, status: 'Active' },
      include: { plan: true },
    });

    if (sub && sub.plan && sub.plan.maxUsers !== null) {
      if (currentUserCount >= sub.plan.maxUsers) {
        throw new ForbiddenException(
          'Plan limit reached. Please upgrade to add more users.',
        );
      }
    }
  }

  async getCompanyPlanUsage(companyId: string) {
    const [branchCount, userCount, sub] = await Promise.all([
      this.prisma.branch.count({ where: { companyId } }),
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.subscription.findFirst({
        where: { companyId, status: 'Active' },
        include: { plan: true },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
    ]);

    const plan = sub?.plan;
    const billingCycle = sub?.billingCycle || 'MONTHLY';
    const priceInr =
      billingCycle.toUpperCase() === 'YEARLY'
        ? plan?.annualPrice ?? plan?.monthlyPrice ?? 0
        : plan?.monthlyPrice ?? 0;

    return {
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            billingCycle: sub.billingCycle,
            currentPeriodEnd: sub.currentPeriodEnd,
          }
        : null,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
            maxBranches: plan.maxBranches,
            maxUsers: plan.maxUsers,
          }
        : null,
      priceInr,
      usage: {
        branches: {
          used: branchCount,
          limit: plan?.maxBranches ?? null,
        },
        users: {
          used: userCount,
          limit: plan?.maxUsers ?? null,
        },
      },
    };
  }
}
