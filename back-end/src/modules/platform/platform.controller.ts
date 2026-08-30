import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@ApiTags('Platform')
@Controller('platform')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get SaaS metrics for platform dashboard' })
  async getMetrics() {
    const totalCompanies = await this.prisma.company.count();
    
    const activeSubscriptions = await this.prisma.subscription.groupBy({
      by: ['planId'],
      _count: { planId: true },
      where: { status: 'Active' }
    });

    // To get plan names, we can fetch all plans and map them
    const plans = await this.prisma.plan.findMany();
    const planMap = new Map(plans.map(p => [p.id, p.name]));
    
    const subscriptionsByPlan = activeSubscriptions.map(sub => ({
      planName: planMap.get(sub.planId) || 'Unknown Plan',
      count: sub._count.planId
    }));

    const recentLogs = await this.prisma.platformSupportAccess.findMany({
      orderBy: { grantedAt: 'desc' },
      take: 10,
      include: {
        company: { select: { legalName: true } },
        adminUser: { select: { fullName: true, email: true } }
      }
    });

    const companies = await this.prisma.company.findMany({
      take: 5,
      include: {
        subscriptions: {
          include: { plan: true },
          where: { status: 'Active' }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalAdmins = await this.prisma.platformAdminUser.count();
    const activeSupport = await this.prisma.platformSupportAccess.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return {
      totalCompanies,
      subscriptionsByPlan,
      recentLogs,
      companies,
      totalAdmins,
      activeSupport,
    };
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get all tenant companies for platform admin' })
  async getCompanies() {
    return this.prisma.company.findMany({
      include: {
        subscriptions: {
          include: { plan: true },
          where: { status: 'Active' }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
