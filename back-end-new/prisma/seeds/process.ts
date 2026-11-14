import { PrismaClient, StepType, ProcessInstanceStatus, StepStatus } from "@prisma/client";

/**
 * Seed data for Process Admin module.
 * Idempotently seeds standard templates and representative instances.
 */
export async function seedProcessModule(
  prisma: PrismaClient,
  companyId: string,
  adminUserId?: string,
  defaultUserId?: string,
  projectId?: string
) {
  console.log("  ↳ Seeding Process Admin module...");

  // 1. Template: Standard Document Approval (2-step sequential)
  const templateDocApproval = await prisma.processTemplate.upsert({
    where: {
      companyId_name_version: {
        companyId,
        name: "Standard Document Approval",
        version: 1,
      },
    },
    update: { isActive: true },
    create: {
      companyId,
      name: "Standard Document Approval",
      version: 1,
      isActive: true,
      createdById: adminUserId,
    },
  });

  const docStep1 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateDocApproval.id,
        stepOrder: 1,
      },
    },
    update: { name: "Document Submission & Intake", stepType: StepType.Input_Required },
    create: {
      companyId,
      templateId: templateDocApproval.id,
      stepOrder: 1,
      name: "Document Submission & Intake",
      stepType: StepType.Input_Required,
    },
  });

  const docStep2 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateDocApproval.id,
        stepOrder: 2,
      },
    },
    update: { name: "Department Head Sign-off", stepType: StepType.Approval },
    create: {
      companyId,
      templateId: templateDocApproval.id,
      stepOrder: 2,
      name: "Department Head Sign-off",
      stepType: StepType.Approval,
    },
  });

  // 2. Template: Multi-Tier QA Process (3-step with onRejectGotoStep loopback)
  const templateQA = await prisma.processTemplate.upsert({
    where: {
      companyId_name_version: {
        companyId,
        name: "Multi-Tier QA Process",
        version: 1,
      },
    },
    update: { isActive: true },
    create: {
      companyId,
      name: "Multi-Tier QA Process",
      version: 1,
      isActive: true,
      createdById: adminUserId,
    },
  });

  const qaStep1 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateQA.id,
        stepOrder: 1,
      },
    },
    update: { name: "Initial Implementation Draft", stepType: StepType.Input_Required },
    create: {
      companyId,
      templateId: templateQA.id,
      stepOrder: 1,
      name: "Initial Implementation Draft",
      stepType: StepType.Input_Required,
    },
  });

  const qaStep2 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateQA.id,
        stepOrder: 2,
      },
    },
    update: {
      name: "Technical Review & Code QA",
      stepType: StepType.Approval,
      onRejectGotoStepId: qaStep1.id,
    },
    create: {
      companyId,
      templateId: templateQA.id,
      stepOrder: 2,
      name: "Technical Review & Code QA",
      stepType: StepType.Approval,
      onRejectGotoStepId: qaStep1.id,
    },
  });

  const qaStep3 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateQA.id,
        stepOrder: 3,
      },
    },
    update: {
      name: "Compliance & Security Audit",
      stepType: StepType.Approval,
      onRejectGotoStepId: qaStep1.id,
    },
    create: {
      companyId,
      templateId: templateQA.id,
      stepOrder: 3,
      name: "Compliance & Security Audit",
      stepType: StepType.Approval,
      onRejectGotoStepId: qaStep1.id,
    },
  });

  // 3. Template: Automated Compliance & Security Check
  const templateAuto = await prisma.processTemplate.upsert({
    where: {
      companyId_name_version: {
        companyId,
        name: "Automated Compliance & Security Check",
        version: 1,
      },
    },
    update: { isActive: true },
    create: {
      companyId,
      name: "Automated Compliance & Security Check",
      version: 1,
      isActive: true,
      createdById: adminUserId,
    },
  });

  const autoStep1 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateAuto.id,
        stepOrder: 1,
      },
    },
    update: { name: "Automated Vulnerability Scan", stepType: StepType.Automated_Task },
    create: {
      companyId,
      templateId: templateAuto.id,
      stepOrder: 1,
      name: "Automated Vulnerability Scan",
      stepType: StepType.Automated_Task,
    },
  });

  const autoStep2 = await prisma.processTemplateStep.upsert({
    where: {
      templateId_stepOrder: {
        templateId: templateAuto.id,
        stepOrder: 2,
      },
    },
    update: { name: "Risk Officer Verification", stepType: StepType.Approval },
    create: {
      companyId,
      templateId: templateAuto.id,
      stepOrder: 2,
      name: "Risk Officer Verification",
      stepType: StepType.Approval,
    },
  });

  // 4. Seed Process Instances
  // Instance 1: Document Approval Active Instance
  const instDocActive = await prisma.processInstance.create({
    data: {
      companyId,
      templateId: templateDocApproval.id,
      projectId,
      title: "Q4 Vendor Services Agreement Review",
      status: ProcessInstanceStatus.Active,
      initiatedById: adminUserId,
    },
  });

  const instDocStep1 = await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instDocActive.id,
      templateStepId: docStep1.id,
      assignedToId: defaultUserId,
      actionedById: defaultUserId,
      status: StepStatus.Approved,
      actionedAt: new Date(),
    },
  });

  const instDocStep2 = await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instDocActive.id,
      templateStepId: docStep2.id,
      assignedToId: adminUserId,
      status: StepStatus.Pending,
    },
  });

  await prisma.processInstance.update({
    where: { id: instDocActive.id },
    data: { currentStepId: instDocStep2.id },
  });

  // Instance 2: Multi-Tier QA Draft Instance
  const instQADraft = await prisma.processInstance.create({
    data: {
      companyId,
      templateId: templateQA.id,
      projectId,
      title: "Core Auth v2 Migration QA",
      status: ProcessInstanceStatus.Draft,
      initiatedById: adminUserId,
    },
  });

  const instQAStep1 = await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instQADraft.id,
      templateStepId: qaStep1.id,
      status: StepStatus.Pending,
    },
  });

  await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instQADraft.id,
      templateStepId: qaStep2.id,
      status: StepStatus.Pending,
    },
  });

  await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instQADraft.id,
      templateStepId: qaStep3.id,
      status: StepStatus.Pending,
    },
  });

  await prisma.processInstance.update({
    where: { id: instQADraft.id },
    data: { currentStepId: instQAStep1.id },
  });

  // Instance 3: Automated Scan Completed Instance
  const instAutoCompleted = await prisma.processInstance.create({
    data: {
      companyId,
      templateId: templateAuto.id,
      projectId,
      title: "Weekly Production Security Audit - Week 45",
      status: ProcessInstanceStatus.Completed,
      initiatedById: adminUserId,
      completedAt: new Date(),
    },
  });

  await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instAutoCompleted.id,
      templateStepId: autoStep1.id,
      status: StepStatus.Approved,
      actionedAt: new Date(),
    },
  });

  await prisma.processInstanceStep.create({
    data: {
      companyId,
      processInstanceId: instAutoCompleted.id,
      templateStepId: autoStep2.id,
      assignedToId: adminUserId,
      actionedById: adminUserId,
      status: StepStatus.Approved,
      actionedAt: new Date(),
    },
  });

  console.log("  ✓ Process Admin module seeded successfully (3 templates, 3 instances).");

  return {
    templates: [templateDocApproval, templateQA, templateAuto],
    instances: [instDocActive, instQADraft, instAutoCompleted],
  };
}

// Standalone execution support
if (process.argv[1]?.endsWith("process.ts")) {
  const prisma = new PrismaClient();
  prisma.company.findFirst()
    .then(async (company) => {
      if (!company) {
        console.error("No company found to seed process module into.");
        process.exit(1);
      }
      const admin = await prisma.user.findFirst({ where: { companyId: company.id } });
      await seedProcessModule(prisma, company.id, admin?.id, admin?.id);
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

