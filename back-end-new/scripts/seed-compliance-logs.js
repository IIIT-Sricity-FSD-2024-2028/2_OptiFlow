import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found, skipping seed");
    return;
  }
  const user = await prisma.user.findFirst({ where: { companyId: company.id } });
  const rule = await prisma.complianceRule.findFirst({ where: { companyId: company.id } });
  const violation = await prisma.complianceViolation.findFirst({ where: { rule: { companyId: company.id } } });
  const evidence = await prisma.complianceEvidence.findFirst({ where: { companyId: company.id } });

  console.log("Found resources to seed compliance logs:", { company: !!company, rule: !!rule, violation: !!violation, evidence: !!evidence });

  if (rule) {
    await prisma.complianceAuditLog.create({
      data: {
        companyId: company.id,
        ruleId: rule.id,
        action: 'UPDATE',
        performedById: user?.id,
        oldValue: { strictness: 'WARN' },
        newValue: { strictness: 'BLOCK' }
      }
    });
  }

  if (violation) {
    await prisma.complianceAuditLog.create({
      data: {
        companyId: company.id,
        violationId: violation.id,
        action: 'STATUS_CHANGE',
        performedById: user?.id,
        oldValue: { status: 'OPEN' },
        newValue: { status: 'RESOLVED' }
      }
    });
  }

  if (evidence) {
    await prisma.complianceAuditLog.create({
      data: {
        companyId: company.id,
        evidenceId: evidence.id,
        action: 'CREATE',
        performedById: user?.id,
        newValue: { title: evidence.title }
      }
    });
  }

  console.log("Successfully seeded Compliance Audit Logs!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
