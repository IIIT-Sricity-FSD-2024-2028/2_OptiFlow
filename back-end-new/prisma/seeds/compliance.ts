// prisma/seeds/compliance.ts
// Compliance: categories, rules, bindings, violations, evidence, attachments,
// and complete audit trail linking Project Managers, Team Leads, and Team Members.

import {
  ScopeType,
  Severity,
  ViolationStatus,
  EvidenceStatus,
  AuditAction,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { PlatformResult } from "./platform.js";
import type { HrResult } from "./hr.js";
import type { WorkResult } from "./work.js";

export async function seedCompliance(
  prisma: PrismaClient,
  ctx: PlatformResult & HrResult & WorkResult
) {
  const {
    acmeCorp,
    userAlice,
    userSamuel,
    userSophia,
    userBob,
    userRachel,
    userCharlie,
    userLucas,
    userDavid,
    userEmma,
    userFrank,
    userGrace,
    userIan,
    userJulia,
    userKevin,
    branch,
    teamCore,
    teamSales,
    project,
    task1,
    projectQ3,
    projectMobile,
    projectSOC2,
    teamMembers,
    createdTasks,
  } = ctx;

  console.log("Seeding rich Compliance Categories...");
  const categorySecurity = await prisma.complianceCategory.create({
    data: {
      companyId: acmeCorp.id,
      name: "IT Security & Access Controls",
      description: "Identity, credentialing, 2FA, and infrastructure security controls.",
      ownerId: userSophia?.id || userSamuel.id,
    },
  });

  const categoryOperations = await prisma.complianceCategory.create({
    data: {
      companyId: acmeCorp.id,
      name: "Operational & Delivery Quality",
      description: "Sprint delivery SLAs, QA sign-offs, and task completion evidence requirements.",
      ownerId: userSamuel.id,
    },
  });

  const categoryPrivacy = await prisma.complianceCategory.create({
    data: {
      companyId: acmeCorp.id,
      name: "Data Privacy, GDPR & Governance",
      description: "PII masking, GDPR Article 32 controls, and data retention rules.",
      ownerId: userSamuel.id,
    },
  });

  const categoryFinancial = await prisma.complianceCategory.create({
    data: {
      companyId: acmeCorp.id,
      name: "Financial & Regulatory Governance",
      description: "SOC2 Type II controls, vendor auditing, and financial log retention.",
      ownerId: userAlice.id,
    },
  });

  console.log("Seeding Compliance Rules with varied severities and evaluators...");
  // Rule 1: 2FA Enforcement (Critical, Company Scope)
  const rule2FA = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Acme Mandatory 2FA & Identity Policy",
      description: "All employee user accounts must have active two-factor authentication tokens.",
      ruleType: "Custom",
      severity: Severity.Critical,
      categoryId: categorySecurity.id,
      isActive: true,
      criteria: { field: "two_factor_auth", operator: "eq", value: true },
      actionOnFail: "BLOCK_TRANSITION",
    },
  });

  // Rule 2: Overdue Tasks (Medium, Overdue evaluator)
  const ruleOverdue = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Zero Overdue Sprint Tasks Policy",
      description: "Tasks exceeding their scheduled dueDate trigger automated compliance violations.",
      ruleType: "Overdue",
      severity: Severity.Medium,
      categoryId: categoryOperations.id,
      isActive: true,
      criteria: { field: "dueDate", operator: "lt", value: "NOW()" },
      actionOnFail: "ALLOW_WITH_WARNING",
    },
  });

  // Rule 3: Unassigned Tasks (High, Unassigned evaluator)
  const ruleUnassigned = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Critical Task Assignment Requirement",
      description: "Active work items must have a designated assignee to maintain accountability.",
      ruleType: "Unassigned",
      severity: Severity.High,
      categoryId: categoryOperations.id,
      isActive: true,
      criteria: { field: "assignedToId", operator: "isNotNull" },
      actionOnFail: "ALLOW_WITH_WARNING",
    },
  });

  // Rule 4: GDPR Data Masking (High, Project Scope)
  const ruleGDPR = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "GDPR Article 32 Customer PII Data Masking",
      description: "Ensure customer-facing endpoints and databases enforce PII pseudonymization.",
      ruleType: "Custom",
      severity: Severity.High,
      categoryId: categoryPrivacy.id,
      isActive: true,
      criteria: { field: "data_masking", operator: "eq", value: true },
      actionOnFail: "REQUIRE_MANUAL_OVERRIDE",
    },
  });

  // Rule 5: Task Completion Evidence Gate (High, Transition Gate)
  const ruleEvidenceCompletion = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Mandatory Peer Review & Deliverable Evidence",
      description: "Tasks cannot transition to Completed status without approved compliance evidence.",
      ruleType: "Custom",
      severity: Severity.High,
      categoryId: categoryOperations.id,
      isActive: true,
      criteria: {
        trigger: { field: "status", transitionTo: "Completed" },
        requirement: { type: "EVIDENCE_REQUIRED", evidenceCategory: "Operational & Delivery Quality" },
      },
      actionOnFail: "BLOCK_TRANSITION",
    },
  });

  // Rule 6: SOC2 Cryptographic Key Rotation (Critical)
  const ruleSOC2 = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "SOC2 Cryptographic Key & Secret Rotation",
      description: "Quarterly attestation of API keys, certificates, and TLS endpoints.",
      ruleType: "Custom",
      severity: Severity.Critical,
      categoryId: categoryFinancial.id,
      isActive: true,
      criteria: { field: "key_rotation", operator: "eq", value: true },
      actionOnFail: "BLOCK_TRANSITION",
    },
  });

  console.log("Seeding Compliance Bindings across Company, Branch, Team, and Project scopes...");
  await prisma.complianceBinding.createMany({
    data: [
      { companyId: acmeCorp.id, ruleId: rule2FA.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id },
      { companyId: acmeCorp.id, ruleId: ruleEvidenceCompletion.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id },
      { companyId: acmeCorp.id, ruleId: ruleUnassigned.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, scopeType: ScopeType.Branch, scopeId: branch.id },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, scopeType: ScopeType.Team, scopeId: teamCore.id },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, scopeType: ScopeType.Project, scopeId: projectQ3.id },
      { companyId: acmeCorp.id, ruleId: ruleGDPR.id, scopeType: ScopeType.Project, scopeId: projectMobile.id },
      { companyId: acmeCorp.id, ruleId: ruleSOC2.id, scopeType: ScopeType.Project, scopeId: projectSOC2.id },
    ],
  });

  console.log("Seeding Violations covering Open, Under_Review, Resolved, and Ignored statuses...");
  // V1: Open 2FA violation on Team Member Frank
  const v1 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "User",
      entityId: userFrank.id,
      status: ViolationStatus.Open,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
      resolutionRemarks: "Frank Wright has not yet completed hardware token enrollment.",
    },
  });

  // V2: Resolved 2FA violation on Team Member Emma
  const v2 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "User",
      entityId: userEmma.id,
      status: ViolationStatus.Resolved,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
      resolvedById: userSamuel.id,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      resolutionRemarks: "YubiKey hardware token registered and verified via admin console.",
    },
  });

  // V3: Ignored 2FA violation on Team Member Ian (contractor exception)
  const v3 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "User",
      entityId: userIan.id,
      status: ViolationStatus.Ignored,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
      resolvedById: userAlice.id,
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resolutionRemarks: "Temporary waiver granted for sandbox environment access.",
    },
  });

  // V4: Under_Review violation on Project Mobile (Data Masking)
  const v4 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleGDPR.id,
      entityType: "Project",
      entityId: projectMobile.id,
      status: ViolationStatus.Under_Review,
      severity: Severity.High,
      reportedById: userSamuel.id,
      resolutionRemarks: "Awaiting PM Rachel Green and TL Lucas review of masking script.",
    },
  });

  // V5: Open violation on Task 1 (Mandatory Evidence Completion)
  const v5 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleEvidenceCompletion.id,
      entityType: "Task",
      entityId: task1.id,
      status: ViolationStatus.Open,
      severity: Severity.High,
      reportedById: userSamuel.id,
      resolutionRemarks: "Task transition to Completed requested without approved evidence.",
    },
  });

  // V6: Open Overdue task violation on createdTasks[3]
  const v6 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleOverdue.id,
      entityType: "Task",
      entityId: createdTasks[3].id,
      status: ViolationStatus.Open,
      severity: Severity.Medium,
      reportedById: userSamuel.id,
      resolutionRemarks: "Task is past due date by 4 business days.",
    },
  });

  // V7: Under_Review Overdue violation on createdTasks[4]
  const v7 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleOverdue.id,
      entityType: "Task",
      entityId: createdTasks[4].id,
      status: ViolationStatus.Under_Review,
      severity: Severity.Medium,
      reportedById: userSamuel.id,
      resolutionRemarks: "Mitigation evidence submitted by Emma Watson.",
    },
  });

  // V8: Resolved Overdue violation on createdTasks[5]
  const v8 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleOverdue.id,
      entityType: "Task",
      entityId: createdTasks[5].id,
      status: ViolationStatus.Resolved,
      severity: Severity.Medium,
      reportedById: userSamuel.id,
      resolvedById: userCharlie?.id || userSamuel.id,
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      resolutionRemarks: "Schedule re-baselined and approved by Team Lead Charlie Davis.",
    },
  });

  // V9: Open SOC2 violation on projectSOC2
  const v9 = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: ruleSOC2.id,
      entityType: "Project",
      entityId: projectSOC2.id,
      status: ViolationStatus.Open,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
      resolutionRemarks: "Q3 KMS customer master key rotation evidence missing.",
    },
  });

  console.log("Seeding Evidence connecting Team Members, Team Leads, and Project Managers...");
  // Case 1: TM David -> TL Charlie -> Approved
  const ev1 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userDavid.id,
      taskId: task1.id,
      violationId: v5.id,
      title: "OAuth2 & Tenant Middleware Test Suite & Code Coverage Report",
      evidenceType: "PDF Document",
      fileUrl: "/uploads/oauth2_tenant_coverage_report.pdf",
      notes: "Submitted by David Smith (TM). Verified 98% unit & integration test coverage.",
      status: EvidenceStatus.Approved,
      reviewedById: userCharlie?.id || userBob.id,
      reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev1.id,
      fileName: "oauth2_tenant_coverage_report.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 2451000,
      storageKey: "uploads/oauth2_tenant_coverage_report.pdf",
      uploadedById: userDavid.id,
    },
  });

  // Case 2: TM Frank -> PM Bob -> Under_Review
  const ev2 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userFrank.id,
      taskId: createdTasks[2].id,
      violationId: v4.id,
      title: "GDPR PII Data Masking Script & Staging Dry-Run Audit",
      evidenceType: "Code Snippet",
      fileUrl: "/uploads/gdpr_masking_dryrun_results.csv",
      notes: "Submitted by Frank Wright (TM). Awaiting final sign-off from PM Bob Miller.",
      status: EvidenceStatus.Under_Review,
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev2.id,
      fileName: "gdpr_masking_dryrun_results.csv",
      fileType: "text/csv",
      fileSizeBytes: 89400,
      storageKey: "uploads/gdpr_masking_dryrun_results.csv",
      uploadedById: userFrank.id,
    },
  });

  // Case 3: TM Julia -> TL Charlie -> Rejected
  const ev3 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userJulia.id,
      taskId: createdTasks[3].id,
      title: "Preliminary Staging Load Test Results",
      evidenceType: "Test Results",
      fileUrl: "/uploads/load_test_preliminary.pdf",
      notes: "Rejected by TL Charlie Davis: Latency at 99th percentile exceeded 500ms SLA. Must optimize queries and re-submit.",
      status: EvidenceStatus.Rejected,
      reviewedById: userCharlie?.id || userBob.id,
      reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev3.id,
      fileName: "load_test_preliminary.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 1205000,
      storageKey: "uploads/load_test_preliminary.pdf",
      uploadedById: userJulia.id,
    },
  });

  // Case 4: TM Emma -> TL Lucas -> Pending
  const ev4 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userEmma.id,
      taskId: createdTasks[4].id,
      violationId: v7.id,
      title: "Mobile App TLS 1.3 Key Pinning & SHA-256 Fingerprint Attestation",
      evidenceType: "Certificate",
      fileUrl: "/uploads/mobile_tls_cert_fingerprint.pdf",
      notes: "Submitted by Emma Watson. Pending review by Team Lead Lucas Scott.",
      status: EvidenceStatus.Pending,
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev4.id,
      fileName: "mobile_tls_cert_fingerprint.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 541000,
      storageKey: "uploads/mobile_tls_cert_fingerprint.pdf",
      uploadedById: userEmma.id,
    },
  });

  // Case 5: TM Grace -> Compliance Officer Samuel -> Approved
  const ev5 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userGrace.id,
      taskId: createdTasks[10].id,
      violationId: v9.id,
      title: "SOC2 Type II External Security Auditor Attestation",
      evidenceType: "Security Audit",
      fileUrl: "/uploads/soc2_external_auditor_signoff.pdf",
      notes: "Direct audit evidence sign-off by Compliance Officer Samuel Jackson.",
      status: EvidenceStatus.Approved,
      reviewedById: userSamuel.id,
      reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev5.id,
      fileName: "soc2_external_auditor_signoff.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 4120000,
      storageKey: "uploads/soc2_external_auditor_signoff.pdf",
      uploadedById: userGrace.id,
    },
  });

  // Case 6: TM Kevin -> TL Lucas -> Approved (Category-level matching, SEC-M1-11)
  const ev6 = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userKevin.id,
      taskId: createdTasks[15].id,
      title: "Sprint QA Sign-off Matrix & Cross-Browser Regression Report",
      evidenceType: "Operational & Delivery Quality",
      fileUrl: "/uploads/qa_regression_signoff_matrix.pdf",
      notes: "Proactive task deliverable proof satisfying category-based compliance gates.",
      status: EvidenceStatus.Approved,
      reviewedById: userLucas?.id || userRachel.id,
      reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: ev6.id,
      fileName: "qa_regression_signoff_matrix.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 1840000,
      storageKey: "uploads/qa_regression_signoff_matrix.pdf",
      uploadedById: userKevin.id,
    },
  });

  console.log("Seeding Comprehensive Compliance Audit Trail...");
  const auditEntries = [
    {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      action: AuditAction.CREATE,
      performedById: userSamuel.id,
      performedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      ruleId: ruleEvidenceCompletion.id,
      action: AuditAction.CREATE,
      performedById: userSamuel.id,
      performedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      violationId: v1.id,
      action: AuditAction.CREATE,
      performedById: userSamuel.id,
      performedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      evidenceId: ev1.id,
      action: AuditAction.CREATE,
      performedById: userDavid.id,
      performedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      evidenceId: ev1.id,
      action: AuditAction.UPDATE,
      performedById: userCharlie?.id || userBob.id,
      performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      evidenceId: ev3.id,
      action: AuditAction.UPDATE,
      performedById: userCharlie?.id || userBob.id,
      performedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      companyId: acmeCorp.id,
      violationId: v2.id,
      action: AuditAction.STATUS_CHANGE,
      performedById: userSamuel.id,
      performedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const entry of auditEntries) {
    await prisma.complianceAuditLog.create({ data: entry });
  }

  // System and Process Audit Logs for cross-dashboard telemetry
  for (let i = 0; i < 25; i++) {
    const member = teamMembers[i % teamMembers.length];
    await prisma.systemAuditLog.create({
      data: {
        companyId: acmeCorp.id,
        action: i % 2 === 0 ? AuditAction.LOGIN : AuditAction.UPDATE,
        targetUserId: member.id,
        performedById: member.id,
        ipAddress: `10.0.1.${10 + i}`,
        userAgent: "OptiFlow Automated Client/2.0",
        performedAt: new Date(Date.now() - (25 - i) * 6 * 60 * 60 * 1000),
      },
    });

    const task = createdTasks[i % createdTasks.length];
    await prisma.processAuditLog.create({
      data: {
        companyId: acmeCorp.id,
        action: AuditAction.UPDATE,
        taskId: task.id,
        performedById: member.id,
        performedAt: new Date(Date.now() - (25 - i) * 8 * 60 * 60 * 1000),
      },
    });
  }

  console.log("✓ Compliance module seeded successfully with connected PM, TL, and TM records!");
  return {
    categorySecurity,
    categoryOperations,
    categoryPrivacy,
    rule2FA,
    ruleOverdue,
    ruleEvidenceCompletion,
  };
}

export type ComplianceResult = Awaited<ReturnType<typeof seedCompliance>>;
