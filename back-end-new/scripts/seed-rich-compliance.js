import { PrismaClient, ScopeType, ViolationStatus, Severity, EvidenceStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ where: { legalName: "Acme Corporation" } }) || await prisma.company.findFirst();
  if (!company) {
    console.error("No company found.");
    return;
  }

  const complianceOfficer = await prisma.user.findFirst({ where: { email: "compliance@acme.com" } }) 
    || await prisma.user.findFirst({ where: { companyId: company.id } });
  
  const projects = await prisma.project.findMany({ where: { companyId: company.id } });
  const tasks = await prisma.task.findMany({ where: { companyId: company.id }, take: 10 });
  const users = await prisma.user.findMany({ where: { companyId: company.id } });
  const rules = await prisma.complianceRule.findMany({ where: { companyId: company.id } });

  console.log(`Found ${projects.length} projects, ${rules.length} rules, ${users.length} users in company ${company.legalName}`);

  // 1. Add extra evidence items if fewer than 6 exist
  const existingEvidenceCount = await prisma.complianceEvidence.count({ where: { companyId: company.id } });
  if (existingEvidenceCount < 6) {
    const evidenceToCreate = [
      {
        companyId: company.id,
        userId: users[0]?.id || complianceOfficer.id,
        title: "GDPR Article 32 Encryption Architecture Document",
        evidenceType: "PDF Document",
        fileUrl: "/uploads/gdpr_encryption_arch.pdf",
        status: EvidenceStatus.Approved,
        taskId: tasks[0]?.id || null,
      },
      {
        companyId: company.id,
        userId: users[1]?.id || complianceOfficer.id,
        title: "SOC2 Type II Third-Party Penetration Test Audit Report",
        evidenceType: "Security Audit",
        fileUrl: "/uploads/soc2_pentest_2026.pdf",
        status: EvidenceStatus.Approved,
        taskId: tasks[1]?.id || null,
      },
      {
        companyId: company.id,
        userId: users[2]?.id || complianceOfficer.id,
        title: "AWS Production S3 Bucket Logging & Access List Evidence",
        evidenceType: "Configuration File",
        fileUrl: "/uploads/s3_access_audit.json",
        status: EvidenceStatus.Under_Review,
        taskId: tasks[2]?.id || null,
      },
      {
        companyId: company.id,
        userId: users[3]?.id || complianceOfficer.id,
        title: "Database Backup Verification & Recovery Time Objective Attestation",
        evidenceType: "Attestation",
        fileUrl: "/uploads/db_backup_rto.xlsx",
        status: EvidenceStatus.Pending,
        taskId: tasks[3]?.id || null,
      },
      {
        companyId: company.id,
        userId: users[4]?.id || complianceOfficer.id,
        title: "Mobile Client API TLS 1.3 Key Pinning Certificate",
        evidenceType: "Certificate",
        fileUrl: "/uploads/tls_cert_pinning.crt",
        status: EvidenceStatus.Rejected,
        taskId: tasks[4]?.id || null,
      },
    ];

    for (const ev of evidenceToCreate) {
      await prisma.complianceEvidence.create({ data: ev });
    }
    console.log(`✓ Seeded ${evidenceToCreate.length} rich compliance evidence submissions.`);
  }

  // 2. Ensure audit logs exist with realistic event histories
  const existingAuditCount = await prisma.complianceAuditLog.count({ where: { companyId: company.id } });
  if (existingAuditCount < 10) {
    const auditLogsToCreate = [
      {
        companyId: company.id,
        action: "CREATE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceRule",
        entityId: rules[0]?.id || null,
        entityName: rules[0]?.name || "Mandatory 2FA Policy",
        details: { description: "Initialized mandatory 2FA enforcement policy across all company tenant accounts." },
        performedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        companyId: company.id,
        action: "CREATE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceBinding",
        entityId: company.id,
        entityName: "Company-Wide Scope Binding",
        details: { scopeType: "Company", rule: rules[0]?.name || "2FA Policy" },
        performedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      },
      {
        companyId: company.id,
        action: "STATUS_CHANGE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceViolation",
        entityId: "viol-002",
        entityName: "GDPR Data Masking Flag",
        details: { oldStatus: "Open", newStatus: "Under_Review", remarks: "Evidence document attached by dev team." },
        performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        companyId: company.id,
        action: "UPDATE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceEvidence",
        entityId: "ev-001",
        entityName: "SOC2 Type II Penetration Test Report",
        details: { decision: "Approved", notes: "Sign-off complete. No critical vulnerabilities found." },
        performedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        companyId: company.id,
        action: "STATUS_CHANGE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceViolation",
        entityId: "viol-001",
        entityName: "Mandatory 2FA Enforcement Flag",
        details: { oldStatus: "Open", newStatus: "Resolved", overrideReason: "User authenticated via hardware security key." },
        performedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        companyId: company.id,
        action: "CREATE",
        performedById: complianceOfficer.id,
        entityType: "ComplianceReport",
        entityId: "rep-summary",
        entityName: "Executive Compliance Health & Audit Summary Report",
        details: { exportFormat: "PDF", framework: "SOC2, GDPR", scope: "Company-Wide" },
        performedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    for (const log of auditLogsToCreate) {
      await prisma.complianceAuditLog.create({
        data: {
          companyId: log.companyId,
          action: log.action,
          performedById: log.performedById,
          performedAt: log.performedAt,
          newValue: log.details || {},
        }
      });
    }
    console.log(`✓ Seeded ${auditLogsToCreate.length} rich compliance audit logs.`);
  }

  const finalCounts = {
    rules: await prisma.complianceRule.count({ where: { companyId: company.id } }),
    categories: await prisma.complianceCategory.count({ where: { companyId: company.id } }),
    bindings: await prisma.complianceBinding.count({ where: { companyId: company.id } }),
    violations: await prisma.complianceViolation.count({ where: { companyId: company.id } }),
    evidence: await prisma.complianceEvidence.count({ where: { companyId: company.id } }),
    auditLogs: await prisma.complianceAuditLog.count({ where: { companyId: company.id } }),
  };

  console.log("Final Compliance Counts:", finalCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
