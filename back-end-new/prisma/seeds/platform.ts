// prisma/seeds/platform.ts
// Platform layer: the plan, the platform admin, the two tenant companies and their subscriptions,
// plus the support-access grants the platform admin has opened on Acme.
//
// Part of the split of prisma/seed.ts (PRE-M2-04). The statements below are the original seed's, moved
// here unchanged; only their grouping and the plumbing between modules is new.

import {
  SubscriptionStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function seedPlatform(prisma: PrismaClient, ctx: { passwordHash: string }) {
  const { passwordHash } = ctx;

  const proPlan = await prisma.plan.create({
    data: {
      name: "Pro Enterprise",
      maxBranches: 20,
      maxUsers: 500,
      maxActiveProcessTemplates: 100,
      maxComplianceRules: 200,
      auditLogRetentionDays: 730,
      allowsIntegrations: true,
    },
  });

  const platformAdmin = await prisma.platformAdminUser.create({
    data: {
      email: "admin@platform.com",
      passwordHash,
      fullName: "Global Platform Administrator",
    },
  });

  const acmeCorp = await prisma.company.create({
    data: { legalName: "Acme Corp", status: "Active" },
  });

  await prisma.subscription.create({
    data: {
      companyId: acmeCorp.id,
      planId: proPlan.id,
      billingCycle: "Annual",
      status: SubscriptionStatus.Active,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const betaLlc = await prisma.company.create({ data: { legalName: "Beta LLC", status: "Active" } });
  await prisma.subscription.create({
    data: {
      companyId: betaLlc.id,
      planId: proPlan.id,
      billingCycle: "Monthly",
      status: SubscriptionStatus.Active,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { platformAdmin, acmeCorp, betaLlc };
}

export type PlatformResult = Awaited<ReturnType<typeof seedPlatform>>;

// Grants the platform admin has opened on Acme (two already expired, one still active).
export async function seedSupportAccess(prisma: PrismaClient, { platformAdmin, acmeCorp }: PlatformResult) {
  await prisma.platformSupportAccess.createMany({
    data: [
      {
        adminUserId: platformAdmin.id,
        companyId: acmeCorp.id,
        reason: "Initial Tenant Setup Check",
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      },
      {
        adminUserId: platformAdmin.id,
        companyId: acmeCorp.id,
        reason: "Investigating PM Dashboard bug",
        expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) 
      },
      {
        adminUserId: platformAdmin.id,
        companyId: acmeCorp.id,
        reason: "Routine tenant audit",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
      }
    ]
  });
}
