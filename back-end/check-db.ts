import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const rule = await prisma.complianceRule.findFirst({ where: { name: 'Mandatory Code Review' } });
  console.log('Rule:', rule ? rule.name : 'NOT FOUND');

  const tasks = await prisma.task.findMany({
    where: { title: { in: ['Legacy Authentication Fixes', 'Live Compliance Engine Test'] } },
    select: { id: true, title: true, status: true }
  });
  console.log('Demo Tasks:', tasks);

  const violations = await prisma.complianceViolation.findMany({
    where: { ruleId: rule?.id },
    select: { id: true, status: true, reportedById: true, resolutionRemarks: true }
  });
  console.log('System Violations:', violations);
}

main().catch(console.error).finally(() => prisma.$disconnect());
