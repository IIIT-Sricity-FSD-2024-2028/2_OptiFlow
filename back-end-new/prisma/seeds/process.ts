// prisma/seeds/process.ts
// Process workflows: the vendor-onboarding template, its steps, one running instance and the
// process audit rows that go with them.
//
// Part of the split of prisma/seed.ts (PRE-M2-04). The statements below are the original seed's, moved
// here unchanged; only their grouping and the plumbing between modules is new.

import {
  AuditAction,
  StepType,
  ProcessInstanceStatus,
  StepStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { PlatformResult } from "./platform.js";
import type { HrResult } from "./hr.js";
import type { WorkResult } from "./work.js";

export async function seedProcess(prisma: PrismaClient, ctx: PlatformResult & HrResult & WorkResult) {
  const { acmeCorp, userAlice, userArjun, userDavid, project, task1 } = ctx;

  const processTemplate = await prisma.processTemplate.create({
    data: {
      companyId: acmeCorp.id,
      name: "Vendor Security & Compliance Onboarding",
      version: 1,
      isActive: true, createdById: userAlice.id,
    },
  });

  const step1 = await prisma.processTemplateStep.create({ data: { companyId: acmeCorp.id, templateId: processTemplate.id, stepOrder: 1, name: "Vendor Information & Audit Intake", stepType: StepType.Input_Required } });

  const step2 = await prisma.processTemplateStep.create({ data: { companyId: acmeCorp.id, templateId: processTemplate.id, stepOrder: 2, name: "Security Officer Sign-off", stepType: StepType.Approval } });

  const processInstance = await prisma.processInstance.create({
    data: {
      companyId: acmeCorp.id,
      templateId: processTemplate.id,
      projectId: project.id,
      title: "AWS Cloud Vendor Audit — Gamma Supplier",
      status: ProcessInstanceStatus.Active,
      initiatedById: userArjun.id,
    },
  });

  const instStep = await prisma.processInstanceStep.create({
    data: {
      companyId: acmeCorp.id, processInstanceId: processInstance.id,
      templateStepId: step1.id,
      assignedToId: userDavid.id,
      actionedById: userDavid.id,
      status: StepStatus.Approved,
      actionedAt: new Date(),
    },
  });

  await prisma.processInstance.update({
    where: { id: processInstance.id },
    data: { currentStepId: instStep.id },
  });

  await prisma.processAuditLog.createMany({
    data: [
      { companyId: acmeCorp.id, projectId: project.id, action: AuditAction.CREATE, performedById: userAlice.id },
      { companyId: acmeCorp.id, templateId: processTemplate.id, action: AuditAction.CREATE, performedById: userArjun.id },
      { companyId: acmeCorp.id, taskId: task1.id, action: AuditAction.STATUS_CHANGE, performedById: userDavid.id },
    ],
  });


  

  return {  };
}

export type ProcessResult = Awaited<ReturnType<typeof seedProcess>>;
