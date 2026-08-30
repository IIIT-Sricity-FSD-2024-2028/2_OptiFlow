// prisma/seed.ts
// Official User Testing Matrix Seed Script for Acme Corp & Platform Layer

import {
  PrismaClient,
  ScopeType,
  Severity,
  ViolationStatus,
  EvidenceStatus,
  TaskStatus,
  TaskPriority,
  RoleTemplateOrigin,
  SubscriptionStatus,
  AuditAction,
  StepType,
  ProcessInstanceStatus,
  StepStatus,
  EscalationStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Official Acme Corp User Matrix Database Seed...");

  // =====================================================================
  // 0. IDEMPOTENT CLEANUP (Reverse FK Dependency Order)
  // =====================================================================
  await prisma.attachment.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.complianceEvidence.deleteMany({});
  await prisma.complianceViolation.deleteMany({});
  await prisma.complianceBinding.deleteMany({});
  await prisma.complianceRule.deleteMany({});
  await prisma.complianceCategory.deleteMany({});
  await prisma.escalation.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.processInstanceStep.deleteMany({});
  await prisma.processInstance.deleteMany({});
  await prisma.processTemplateStep.deleteMany({});
  await prisma.processTemplate.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.permissionGrant.deleteMany({});
  await prisma.roleAssignment.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.roleTemplatePermission.deleteMany({});
  await prisma.roleTemplate.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.platformSupportAccess.deleteMany({});
  await prisma.platformAdminUser.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.plan.deleteMany({});

  console.log("✓ Cleaned existing database tables.");

  // Simple known password hash for all testing accounts: 'password123'
  const passwordHash = await bcrypt.hash("password123", 10);

  // =====================================================================
  // 1. PLATFORM LAYER & SUBSCRIPTION
  // =====================================================================
  const proPlan = await prisma.plan.create({
    data: {
      name: "Pro Enterprise",
      maxBranches: 20,
      maxUsers: 500,
      maxActiveProcessTemplates: 100,
      maxComplianceRules: 200,
      auditLogRetentionDays: 730,
      allowsIntegrations: true,
      priceMonthly: 8500,
      priceYearly: 82000,
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
      billingCycle: "YEARLY",
      status: SubscriptionStatus.Active,
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // =====================================================================
  // 2. PERMISSIONS & SYSTEM ROLES
  // =====================================================================
  const permUsers = await prisma.permission.create({ data: { slug: "users.manage", module: "HR", description: "Manage users and role assignments" } });
  const permTasks = await prisma.permission.create({ data: { slug: "tasks.manage", module: "Tasks", description: "Create and update tasks" } });
  const permProcess = await prisma.permission.create({ data: { slug: "process.manage", module: "Process", description: "Design process templates" } });
  const permCompliance = await prisma.permission.create({ data: { slug: "compliance.manage", module: "Compliance", description: "Manage compliance rules" } });

  // Predefined Role Templates
  const tSystemAdmin = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "System Admin" } });
  const tCompanyOwner = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Company Owner" } });
  const tAccessGovernance = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Access Governance" } });
  const tProcessAdmin = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Process Admin" } });
  const tComplianceOfficer = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Compliance Officer" } });
  const tProjectManager = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Project Manager" } });
  const tTeamLead = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Team Lead" } });
  const tTeamMember = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Team Member" } });
  const tBranchManager = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Branch Manager" } });

  // System Roles linked to Acme Corp
  const rSystemAdmin = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tSystemAdmin.id, label: "System Admin", isSystem: true } });
  const rCompanyOwner = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tCompanyOwner.id, label: "Company Owner", isSystem: true } });
  const rAccessGovernance = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tAccessGovernance.id, label: "Access Governance", isSystem: true } });
  const rProcessAdmin = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tProcessAdmin.id, label: "Process Admin", isSystem: true } });
  const rComplianceOfficer = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tComplianceOfficer.id, label: "Compliance Officer", isSystem: true } });
  const rProjectManager = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tProjectManager.id, label: "Project Manager", isSystem: true } });
  const rTeamLead = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tTeamLead.id, label: "Team Lead", isSystem: true } });
  const rTeamMember = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tTeamMember.id, label: "Team Member", isSystem: true } });
  const rBranchManager = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tBranchManager.id, label: "Branch Manager", isSystem: true } });

  console.log("✓ System Roles created.");

  // =====================================================================
  // 3. OFFICIAL TESTING MATRIX USER CREATION BLOCKS
  // =====================================================================

  // Company Owners
  const userAlice = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Alice Vance", email: "ceo@acme.com", passwordHash } });
  const userVictor = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Victor Stone", email: "cto@acme.com", passwordHash, managerUserId: userAlice.id } });
  const userOlivia = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Olivia Wilde", email: "coo@acme.com", passwordHash, managerUserId: userAlice.id } });

  // Access Governance
  const userHannah = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Hannah Abbott", email: "hr@acme.com", passwordHash, managerUserId: userOlivia.id } });
  const userKiran = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Kiran Patel", email: "hr_specialist@acme.com", passwordHash, managerUserId: userHannah.id } });

  // Process Admin
  const userArjun = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Arjun Mehta", email: "admin@acme.com", passwordHash, managerUserId: userAlice.id } });

  // Compliance Officer
  const userSamuel = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Samuel Jackson", email: "compliance@acme.com", passwordHash, managerUserId: userAlice.id } });
  const userSophia = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Sophia Turner", email: "security@acme.com", passwordHash, managerUserId: userSamuel.id } });

  // Project Manager
  const userBob = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Bob Miller", email: "pm@acme.com", passwordHash, managerUserId: userVictor.id } });
  const userRachel = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Rachel Green", email: "pm2@acme.com", passwordHash, managerUserId: userVictor.id } });

  // Team Lead
  const userCharlie = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Charlie Davis", email: "tl@acme.com", passwordHash, managerUserId: userBob.id } });
  const userLucas = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Lucas Scott", email: "tl2@acme.com", passwordHash, managerUserId: userRachel.id } });
  const userMarcus = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Marcus Vance", email: "tl_devops@acme.com", passwordHash, managerUserId: userVictor.id } });

  // Team Member
  const userDavid = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "David Smith", email: "employee@acme.com", passwordHash, managerUserId: userCharlie.id } });
  const userEmma = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Emma Watson", email: "member2@acme.com", passwordHash, managerUserId: userLucas.id } });
  const userFrank = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Frank Wright", email: "member3@acme.com", passwordHash, managerUserId: userCharlie.id } });
  const userGrace = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Grace Hopper", email: "member4@acme.com", passwordHash, managerUserId: userLucas.id } });
  const userIan = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Ian Malcolm", email: "member5@acme.com", passwordHash, managerUserId: userMarcus.id } });
  const userJulia = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Julia Roberts", email: "member6@acme.com", passwordHash, managerUserId: userCharlie.id } });
  const userKevin = await prisma.user.create({ data: { companyId: acmeCorp.id, fullName: "Kevin Bacon", email: "member7@acme.com", passwordHash, managerUserId: userLucas.id } });

  console.log("✓ Created 20 User Accounts matching official testing matrix.");

  // =====================================================================
  // 4. OFFICIAL ROLE ASSIGNMENT BLOCKS
  // =====================================================================
  await prisma.roleAssignment.createMany({
    data: [
      // Company Owners
      { userId: userAlice.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { userId: userVictor.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { userId: userOlivia.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },

      // Access Governance
      { userId: userHannah.id, roleId: rAccessGovernance.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userOlivia.id },
      { userId: userKiran.id, roleId: rAccessGovernance.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userHannah.id },

      // Process Admin
      { userId: userArjun.id, roleId: rProcessAdmin.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },

      // Compliance Officer
      { userId: userSamuel.id, roleId: rComplianceOfficer.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { userId: userSophia.id, roleId: rComplianceOfficer.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userSamuel.id },

      // Project Manager
      { userId: userBob.id, roleId: rProjectManager.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },
      { userId: userRachel.id, roleId: rProjectManager.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },

      // Team Lead
      { userId: userCharlie.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userBob.id },
      { userId: userLucas.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userRachel.id },
      { userId: userMarcus.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },

      // Team Member
      { userId: userDavid.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { userId: userEmma.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
      { userId: userFrank.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { userId: userGrace.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
      { userId: userIan.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userMarcus.id },
      { userId: userJulia.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { userId: userKevin.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
    ],
  });

  // Beta LLC Tenant for Multi-Tenant Isolation Verification
  const betaLlc = await prisma.company.create({ data: { legalName: "Beta LLC", status: "Active" } });
  const rBetaOwner = await prisma.role.create({ data: { companyId: betaLlc.id, roleTemplateId: tCompanyOwner.id, label: "Company Owner", isSystem: true } });
  const rBetaMember = await prisma.role.create({ data: { companyId: betaLlc.id, roleTemplateId: tTeamMember.id, label: "Team Member", isSystem: true } });

  const betaCeo = await prisma.user.create({ data: { companyId: betaLlc.id, fullName: "Fiona Gallagher (CEO)", email: "ceo@betallc.com", passwordHash } });
  const betaMember = await prisma.user.create({ data: { companyId: betaLlc.id, fullName: "George Clark (Dev)", email: "member1@betallc.com", passwordHash } });

  await prisma.roleAssignment.createMany({
    data: [
      { userId: betaCeo.id, roleId: rBetaOwner.id, scopeType: ScopeType.Company, scopeId: betaLlc.id, grantedById: betaCeo.id },
      { userId: betaMember.id, roleId: rBetaMember.id, scopeType: ScopeType.Company, scopeId: betaLlc.id, grantedById: betaCeo.id },
    ],
  });

  const betaBranch = await prisma.branch.create({ data: { companyId: betaLlc.id, name: "Beta SF Hub" } });
  const betaTeam = await prisma.team.create({ data: { branchId: betaBranch.id, name: "Beta Mobile Development" } });
  const betaProject = await prisma.project.create({
    data: {
      teamId: betaTeam.id,
      name: "Beta Mobile App (Project Phoenix)",
      status: "Active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdById: betaCeo.id,
    },
  });

  await prisma.task.create({
    data: {
      companyId: betaLlc.id,
      projectId: betaProject.id,
      title: "Beta Mobile UI Components",
      description: "Deliver responsive mobile wireframes.",
      status: TaskStatus.Active,
      priority: TaskPriority.Medium,
      assignedToId: betaMember.id,
      createdById: betaCeo.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
      actualHours: 4,
    },
  });

  console.log("✓ Assigned system roles to all 20 users via RoleAssignment.");

  // =====================================================================
  // 5. MOCK DATA (Org, Projects, Tasks, Workflows & Compliance)
  // =====================================================================
  const branch = await prisma.branch.create({ data: { companyId: acmeCorp.id, name: "Acme HQ - New York" } });
  const branchWest = await prisma.branch.create({ data: { companyId: acmeCorp.id, name: "Acme West - San Francisco" } });

  const userBranchManager = await prisma.user.create({
    data: {
      companyId: acmeCorp.id,
      fullName: "Diana Branch",
      email: "bm@acme.com",
      passwordHash,
      managerUserId: userAlice.id,
    },
  });

  await prisma.roleAssignment.create({
    data: {
      userId: userBranchManager.id,
      roleId: rBranchManager.id,
      scopeType: ScopeType.Branch,
      scopeId: branch.id,
      grantedById: userAlice.id,
    },
  });

  const teamCore = await prisma.team.create({ data: { branchId: branch.id, name: "Acme Core Engineering" } });
  const adminSupportTeam = await prisma.team.create({ data: { branchId: branch.id, name: "Admin Support Team" } });

  const project = await prisma.project.create({
    data: {
      teamId: teamCore.id,
      name: "Acme Cloud Infrastructure (Project Atlas)",
      status: "Active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      createdById: userAlice.id,
    },
  });

  const task1 = await prisma.task.create({
    data: {
      companyId: acmeCorp.id,
      projectId: project.id,
      title: "Implement OAuth2 & Strict Tenant Middleware",
      description: "Enforce companyId header verification and JWT authentication.",
      status: TaskStatus.In_Review,
      priority: TaskPriority.Urgent,
      assignedToId: userDavid.id,
      createdById: userArjun.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedHours: 24,
      actualHours: 18,
    },
  });

  await prisma.subtask.createMany({
    data: [
      { companyId: acmeCorp.id, taskId: task1.id, title: "Add x-company-id validation in TenantMiddleware", status: TaskStatus.Completed, createdById: userDavid.id },
      { companyId: acmeCorp.id, taskId: task1.id, title: "Test role filtering in TasksService.findAll", status: TaskStatus.In_Review, createdById: userDavid.id },
    ],
  });

  const processTemplate = await prisma.processTemplate.create({
    data: {
      companyId: acmeCorp.id,
      name: "Vendor Security & Compliance Onboarding",
      category: "Procurement",
      version: 1,
      isActive: true,
      createdById: userArjun.id,
    },
  });

  const step1 = await prisma.processTemplateStep.create({
    data: { templateId: processTemplate.id, stepOrder: 1, name: "Vendor Information & Audit Intake", stepType: StepType.Input_Required },
  });

  const step2 = await prisma.processTemplateStep.create({
    data: { templateId: processTemplate.id, stepOrder: 2, name: "Security Officer Sign-off", stepType: StepType.Approval, requiredPermissionId: permCompliance.id },
  });

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
      processInstanceId: processInstance.id,
      templateStepId: step1.id,
      assignedToId: userDavid.id,
      actionedById: userDavid.id,
      status: StepStatus.Approved,
      remarks: "Audit intake form completed.",
      actionedAt: new Date(),
    },
  });

  await prisma.processInstance.update({
    where: { id: processInstance.id },
    data: { currentStepId: instStep.id },
  });

  const categorySecurity = await prisma.complianceCategory.create({
    data: { companyId: acmeCorp.id, name: "IT Security Controls", ownerId: userAlice.id },
  });

  const rule2FA = await prisma.complianceRule.create({
    data: {
      companyId: acmeCorp.id,
      name: "Acme Mandatory 2FA Enforcement Policy",
      description: "All employee accounts must have 2FA tokens enabled.",
      severity: Severity.Critical,
      categoryId: categorySecurity.id,
      isActive: true,
    },
  });

  await prisma.complianceBinding.create({
    data: { ruleId: rule2FA.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id },
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
      companyId: acmeCorp.id,
      userId: userDavid.id,
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
      fileUrl: "/uploads/acme_2fa_signoff_proof.pdf",
      uploadedById: userDavid.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      { companyId: acmeCorp.id, entityType: "Project", entityId: project.id, action: AuditAction.CREATE, performedById: userAlice.id, usedPermissionSlug: "projects.manage" },
      { companyId: acmeCorp.id, entityType: "ProcessTemplate", entityId: processTemplate.id, action: AuditAction.CREATE, performedById: userArjun.id, usedPermissionSlug: "process.manage" },
      { companyId: acmeCorp.id, entityType: "Task", entityId: task1.id, action: AuditAction.STATUS_CHANGE, performedById: userDavid.id, usedPermissionSlug: "tasks.manage" },
    ],
  });

  
  // =====================================================================
  // MASSIVE MOCK DATA GENERATION BLOCK FOR DEMO
  // =====================================================================
  console.log("Generating massive mock data for demo dashboards...");

  const teamSales = await prisma.team.create({
    data: { branchId: branch.id, name: "Acme Sales & Operations" }
  });

  const projectQ3 = await prisma.project.create({
    data: { teamId: teamCore.id, name: "Q3 Cloud Migration", status: "Active", startDate: new Date(), endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdById: userBob.id }
  });
  const projectMobile = await prisma.project.create({
    data: { teamId: teamCore.id, name: "Mobile App V2", status: "Active", startDate: new Date(), endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), createdById: userBob.id }
  });
  const projectSOC2 = await prisma.project.create({
    data: { teamId: teamSales.id, name: "SOC2 Audit Prep", status: "Active", startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), createdById: userRachel.id }
  });
  const projectCRM = await prisma.project.create({
    data: { teamId: teamSales.id, name: "Salesforce CRM Integration", status: "Active", startDate: new Date(), endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), createdById: userRachel.id }
  });

  const teamMembers = [userDavid, userEmma, userFrank, userGrace, userIan, userJulia, userKevin];
  const demoProjects = [projectQ3, projectMobile, projectSOC2, projectCRM];
  const taskPriorities = [TaskPriority.Low, TaskPriority.Medium, TaskPriority.High, TaskPriority.Urgent];
  
  const createdTasks: any[] = [];
  for (let i = 0; i < 50; i++) {
    let status: TaskStatus = TaskStatus.Draft;
    if (i >= 10 && i < 30) status = TaskStatus.Active;
    else if (i >= 30 && i < 40) status = TaskStatus.Completed;
    else if (i >= 40) status = TaskStatus.Blocked;

    const assignedTo = teamMembers[i % teamMembers.length];
    const proj = demoProjects[i % demoProjects.length];
    const estimated = Math.floor(Math.random() * 20) + 2;
    const actual = status === TaskStatus.Completed ? estimated : Math.floor(Math.random() * estimated);

    const t = await prisma.task.create({
      data: {
        companyId: acmeCorp.id,
        projectId: proj.id,
        title: `Demo Task ${i + 1} - ${proj.name}`,
        description: `Autogenerated task for workload simulation.`,
        status: status,
        priority: taskPriorities[Math.floor(Math.random() * 4)],
        assignedToId: assignedTo.id,
        createdById: userBob.id,
        dueDate: new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000),
        estimatedHours: estimated,
        actualHours: actual,
        completedAt: status === TaskStatus.Completed ? new Date() : null,
      }
    });
    createdTasks.push(t);
  }

  const blockedTasks = createdTasks.filter(t => t.status === TaskStatus.Blocked);
  for (let i = 0; i < Math.min(5, blockedTasks.length); i++) {
    await prisma.escalation.create({
      data: {
        companyId: acmeCorp.id,
        taskId: blockedTasks[i].id,
        reportedById: blockedTasks[i].assignedToId,
        targetManagerId: userBob.id,
        title: `Blocked: ${blockedTasks[i].title}`,
        description: `Blocked by external dependency. Need PM review.`,
        status: EscalationStatus.Open
      }
    });
  }

  for (let i = 0; i < 20; i++) {
    await prisma.auditLog.create({
      data: {
        companyId: acmeCorp.id,
        action: i % 2 === 0 ? AuditAction.LOGIN : AuditAction.UPDATE,
        entityType: i % 2 === 0 ? "User" : "Task",
        entityId: i % 2 === 0 ? userDavid.id : createdTasks[0].id,
        performedById: teamMembers[i % teamMembers.length].id,
        ipAddress: "192.168.1." + (100 + i),
        userAgent: "Mozilla/5.0 Demo Browser",
        usedPermissionSlug: i % 2 === 0 ? null : "tasks.manage"
      }
    });
  }

  await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "User",
      entityId: userFrank.id,
      status: ViolationStatus.Open,
      severity: Severity.Critical,
      reportedById: userSamuel.id,
      resolutionRemarks: "Frank has not setup 2FA yet."
    }
  });

  const violationUnderReview = await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id, // Reused a safe rule since ruleGDPR might not exist depending on the state
      entityType: "Project",
      entityId: projectQ3.id,
      status: ViolationStatus.Under_Review,
      severity: Severity.High,
      reportedById: userSamuel.id,
      resolutionRemarks: "Pending review of newly submitted data masking script."
    }
  });

  await prisma.complianceEvidence.create({
    data: {
      companyId: acmeCorp.id,
      userId: userDavid.id,
      violationId: violationUnderReview.id,
      taskId: createdTasks[0].id,
      title: "Data Masking Script Evidence",
      evidenceType: "Code Snippet", fileUrl: "/uploads/fake.pdf",
      status: EvidenceStatus.Pending
    }
  });

  await prisma.complianceViolation.create({
    data: {
      companyId: acmeCorp.id,
      ruleId: rule2FA.id,
      entityType: "Project",
      entityId: projectSOC2.id,
      status: ViolationStatus.Resolved,
      severity: Severity.Medium,
      reportedById: userSamuel.id,
      resolutionRemarks: "Approved financial log audit trail."
    }
  });

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


  console.log("\n==========================================================");
  console.log("Admin Support Team ID:", adminSupportTeam.id);
  console.log("🎉 OFFICIAL USER TESTING MATRIX SEED COMPLETE!");
  console.log("==========================================================");
  console.log("Password for all 20 testing accounts: password123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
