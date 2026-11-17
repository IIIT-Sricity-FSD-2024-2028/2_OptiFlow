// prisma/seeds/compliance.ts
// Compliance: categories, rules, bindings, violations, evidence, the evidence attachment and the
// demo audit trail (system, process and compliance audit rows).
//
// Part of the split of prisma/seed.ts (PRE-M2-04). The statements below are the original seed's, moved
// here unchanged; only their grouping and the plumbing between modules is new.

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

export async function seedCompliance(prisma: PrismaClient, ctx: PlatformResult & HrResult & WorkResult) {
  const { acmeCorp, userAlice, userSamuel, userDavid, userEmma, userFrank, userIan, task1, projectQ3, projectMobile, projectSOC2, teamMembers, createdTasks } = ctx;

  const categorySecurity = await prisma.complianceCategory.create({
    data: { companyId: acmeCorp.id, name: "IT Security Controls", description: "Identity, credentialing, and infrastructure security requirements.", ownerId: userAlice.id },
  });

  const categoryOperations = await prisma.complianceCategory.create({
    data: { companyId: acmeCorp.id, name: "Operational & Process Quality", description: "Sprint delivery SLA, task lifecycle deadlines, and signoff requirements.", ownerId: userAlice.id },
  });

  const categoryPrivacy = await prisma.complianceCategory.create({
    data: { companyId: acmeCorp.id, name: "Data Privacy & Governance", description: "PII protection, GDPR/CCPA data retention and masking policies.", ownerId: userAlice.id },
  });

  const rule2FA = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Acme Mandatory 2FA Enforcement Policy",
      description: "All employee accounts must have 2FA tokens enabled.",
      severity: Severity.Critical,
      categoryId: categorySecurity.id,
      isActive: true,
      criteria: { "field": "two_factor_auth", "operator": "eq", "value": true },
      actionOnFail: "BLOCK_TRANSITION",
    },
  });

  await prisma.complianceBinding.create({ data: { companyId: acmeCorp.id, ruleId: rule2FA.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id } });

  const ruleOverdue = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "No Overdue Tasks Allowed",
      description: "Any task past its due date will trigger a compliance violation.",
      severity: Severity.Medium,
      categoryId: categoryOperations.id,
      isActive: true,
      criteria: { "field": "dueDate", "operator": "lt", "value": "NOW()" },
      actionOnFail: "ALLOW_WITH_WARNING",
    },
  });

  const ruleGDPR = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "GDPR Data Masking Policy",
      description: "Ensure all sensitive customer data fields are masked.",
      severity: Severity.High,
      categoryId: categoryPrivacy.id,
      isActive: true,
      criteria: { "field": "data_masking", "operator": "eq", "value": true },
      actionOnFail: "REQUIRE_MANUAL_OVERRIDE",
    },
  });

  const rulePeerReview = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Mandatory Evidence for Task Completion",
      description: "A task cannot be marked as Completed unless approved Compliance Evidence is attached.",
      severity: Severity.High,
      categoryId: categoryOperations.id,
      isActive: true,
      criteria: { 
        trigger: { field: "status", transitionTo: "Completed" },
        requirement: { type: "EVIDENCE_REQUIRED" }
      },
      actionOnFail: "BLOCK_TRANSITION",
    },
  });



  const violation = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "User",
      entityId: userDavid.id,
      status: ViolationStatus.Under_Review,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
    },
  });

  const evidence = await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id, userId: userDavid.id,
      taskId: task1.id,
      violationId: violation.id,
      title: "2FA Hardware Setup Verification Form",
      evidenceType: "PDF Document",
      fileUrl: "/uploads/acme_2fa_signoff_proof.pdf",
      notes: "Submitted form proof by David Smith",
      status: EvidenceStatus.Pending,
    },
  });

  await prisma.attachment.create({
    data: {
      companyId: acmeCorp.id,
      entityType: "ComplianceEvidence",
      entityId: evidence.id,
      fileName: "acme_2fa_signoff_proof.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 1048576,
      storageKey: "uploads/acme_2fa_signoff_proof.pdf",
      uploadedById: userDavid.id,
    },
  });

  await prisma.complianceBinding.create({ data: { companyId: acmeCorp.id, ruleId: ruleOverdue.id, scopeType: ScopeType.Project, scopeId: projectQ3.id } });
  await prisma.complianceBinding.create({ data: { companyId: acmeCorp.id, ruleId: rulePeerReview.id, scopeType: ScopeType.Project, scopeId: projectQ3.id } });

  for (let i = 0; i < 20; i++) {
    if (i % 3 === 0) {
      await prisma.systemAuditLog.create({
        data: {
          companyId: acmeCorp.id,
          action: AuditAction.LOGIN,
          targetUserId: userDavid.id,
          performedById: teamMembers[i % teamMembers.length].id,
          ipAddress: "192.168.1." + (100 + i),
          userAgent: "Mozilla/5.0 Demo Browser",
        }
      });
    } else if (i % 3 === 1) {
      await prisma.processAuditLog.create({
        data: {
          companyId: acmeCorp.id,
          action: AuditAction.UPDATE,
          taskId: createdTasks[i % createdTasks.length].id,
          performedById: teamMembers[i % teamMembers.length].id,
        }
      });
    } else {
      await prisma.complianceAuditLog.create({
        data: {
          companyId: acmeCorp.id,
          action: AuditAction.CREATE,
          ruleId: rule2FA.id,
          performedById: userSamuel.id,
        }
      });
    }
  }

  // Diverse Compliance Violations for Dashboard testing
  await prisma.complianceViolation.createMany({
    data: [
      // Critical (rule2FA)
      { companyId: acmeCorp.id, ruleId: rule2FA.id, entityType: "User", entityId: userFrank.id, status: ViolationStatus.Open, severity: Severity.Critical, reportedById: userSamuel.id, resolutionRemarks: "Frank has not setup 2FA yet." },
      { companyId: acmeCorp.id, ruleId: rule2FA.id, entityType: "User", entityId: userEmma.id, status: ViolationStatus.Resolved, severity: Severity.Critical, reportedById: userSamuel.id, resolutionRemarks: "Resolved via manual override." },
      { companyId: acmeCorp.id, ruleId: rule2FA.id, entityType: "User", entityId: userIan.id, status: ViolationStatus.Ignored, severity: Severity.Critical, reportedById: userSamuel.id, resolutionRemarks: "Ignored for testing." },

      // High (ruleGDPR)
      { companyId: acmeCorp.id, ruleId: ruleGDPR.id, entityType: "Project", entityId: projectQ3.id, status: ViolationStatus.Under_Review, severity: Severity.High, reportedById: userSamuel.id, resolutionRemarks: "Pending review of newly submitted data masking script." },
      { companyId: acmeCorp.id, ruleId: ruleGDPR.id, entityType: "Project", entityId: projectMobile.id, status: ViolationStatus.Open, severity: Severity.High, reportedById: userSamuel.id, resolutionRemarks: "Data masking missing on mobile API." },
      { companyId: acmeCorp.id, ruleId: rulePeerReview.id, entityType: "Task", entityId: createdTasks[2].id, status: ViolationStatus.Resolved, severity: Severity.High, reportedById: userSamuel.id, resolutionRemarks: "Approved evidence uploaded." },

      // Medium (ruleOverdue)
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, entityType: "Task", entityId: createdTasks[3].id, status: ViolationStatus.Open, severity: Severity.Medium, reportedById: userSamuel.id, resolutionRemarks: "Task past due date." },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, entityType: "Task", entityId: createdTasks[4].id, status: ViolationStatus.Under_Review, severity: Severity.Medium, reportedById: userSamuel.id, resolutionRemarks: "Evidence of delay approved." },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, entityType: "Project", entityId: projectSOC2.id, status: ViolationStatus.Resolved, severity: Severity.Medium, reportedById: userSamuel.id, resolutionRemarks: "Approved financial log audit trail." },
      
      // Low (ruleOverdue - overriding severity just for demo)
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, entityType: "Task", entityId: createdTasks[5].id, status: ViolationStatus.Open, severity: Severity.Low, reportedById: userSamuel.id, resolutionRemarks: "Minor documentation delay." },
      { companyId: acmeCorp.id, ruleId: ruleOverdue.id, entityType: "Task", entityId: createdTasks[6].id, status: ViolationStatus.Ignored, severity: Severity.Low, reportedById: userSamuel.id, resolutionRemarks: "Known delay, acceptable." },
    ]
  });

  // Get one of the Under_Review violations to link evidence to
  const violationUnderReview = await prisma.complianceViolation.findFirst({
    where: { companyId: acmeCorp.id, status: ViolationStatus.Under_Review }
  });

  if (violationUnderReview) {
    await prisma.complianceEvidence.create({
      data: {
        companyId: acmeCorp.id, userId: userDavid.id,
        violationId: violationUnderReview.id,
        taskId: createdTasks[0].id,
        title: "Data Masking Script Evidence",
        evidenceType: "Code Snippet", fileUrl: "/uploads/fake.pdf",
        status: EvidenceStatus.Pending
      }
    });
  }

  return {  };
}

export type ComplianceResult = Awaited<ReturnType<typeof seedCompliance>>;
