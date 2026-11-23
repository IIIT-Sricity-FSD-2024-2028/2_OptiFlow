// prisma/seeds/hr.ts
// Access and people: permissions, role templates, system roles, every user, role assignments,
// branches, teams and team memberships for both tenants.
//
// Part of the split of prisma/seed.ts (PRE-M2-04). The statements below are the original seed's, moved
// here unchanged; only their grouping and the plumbing between modules is new.

import {
  ScopeType,
  RoleTemplateOrigin,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { PlatformResult } from "./platform.js";

export async function seedHr(prisma: PrismaClient, ctx: { passwordHash: string } & PlatformResult) {
  const { acmeCorp, betaLlc, passwordHash } = ctx;

  const permissionsList = [
    // Work Delivery & Tasks
    { slug: "task:create", module: "Tasks", description: "Design and delegate parent project tasks" },
    { slug: "task:subtask:create", module: "Tasks", description: "Decompose tasks into granular subtasks" },
    { slug: "task:execute", module: "Tasks", description: "Update progress, submit deliverables and hours" },
    { slug: "task:review", module: "Tasks", description: "First-line review and approval of deliverables" },
    { slug: "task:change_request", module: "Tasks", description: "Petition upward baseline modifications" },

    // Company Governance & HR
    { slug: "hr:user:create", module: "HR", description: "Create user profiles and assign primary roles" },
    { slug: "hr:user:manage", module: "HR", description: "Edit employee profiles, job titles, and status" },
    { slug: "hr:branch:manage", module: "HR", description: "Create and administer regional branch hubs" },
    { slug: "hr:team:manage", module: "HR", description: "Organize functional pods and assign members" },
    { slug: "hr:role:architect", module: "HR", description: "Define dynamic custom roles & permissions" },

    // Compliance & Auditing
    { slug: "compliance:rule:manage", module: "Compliance", description: "Establish compliance policies and categories" },
    { slug: "compliance:evidence:audit", module: "Compliance", description: "Inspect deliverables and cryptographic hashes" },
    { slug: "compliance:violation:adjudicate", module: "Compliance", description: "Issue and resolve compliance penalties" },

    // Workflow & Process
    { slug: "process:template:design", module: "Process", description: "Author reusable multi-stage workflows" },
    { slug: "executive:telemetry:view", module: "Executive", description: "Access cross-branch financial KPIs" },
  ];

  const permMap: Record<string, string> = {};
  for (const p of permissionsList) {
    const created = await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { module: p.module, description: p.description },
      create: p,
    });
    permMap[p.slug] = created.id;
  }

  // Predefined Role Templates
  const tSystemAdmin = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "System Admin", slug: "system_admin" } });
  const tCompanyOwner = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Company Owner", slug: "company_owner" } });
  const tAccessGovernance = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Access Governance", slug: "access_governance" } });
  const tProcessAdmin = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Process Admin", slug: "process_admin" } });
  const tComplianceOfficer = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Compliance Officer", slug: "compliance_officer" } });
  const tProjectManager = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Project Manager", slug: "project_manager" } });
  const tTeamLead = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Team Lead", slug: "team_lead" } });
  const tTeamMember = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Team Member", slug: "team_member" } });
  const tBranchManager = await prisma.roleTemplate.create({ data: { origin: RoleTemplateOrigin.platform_predefined, label: "Branch Manager", slug: "branch_manager" } });

  // System Roles linked to Acme Corp
  const rSystemAdmin = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tSystemAdmin.id, label: "System Admin", name: "system_admin", isSystem: true } });
  const rCompanyOwner = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tCompanyOwner.id, label: "Company Owner", name: "company_owner", isSystem: true } });
  const rAccessGovernance = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tAccessGovernance.id, label: "Access Governance", name: "access_governance", isSystem: true } });
  const rProcessAdmin = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tProcessAdmin.id, label: "Process Admin", name: "process_admin", isSystem: true } });
  const rComplianceOfficer = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tComplianceOfficer.id, label: "Compliance Officer", name: "compliance_officer", isSystem: true } });
  const rProjectManager = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tProjectManager.id, label: "Project Manager", name: "project_manager", isSystem: true } });
  const rTeamLead = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tTeamLead.id, label: "Team Lead", name: "team_lead", isSystem: true } });
  const rTeamMember = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tTeamMember.id, label: "Team Member", name: "team_member", isSystem: true } });
  const rBranchManager = await prisma.role.create({ data: { companyId: acmeCorp.id, roleTemplateId: tBranchManager.id, label: "Branch Manager", name: "branch_manager", isSystem: true } });

  // Map Default Permissions to Templates and Roles
  const rolePermissionsMapping: Record<string, string[]> = {
    system_admin: permissionsList.map((p) => p.slug),
    company_owner: permissionsList.map((p) => p.slug),
    access_governance: [
      "hr:user:create",
      "hr:user:manage",
      "hr:branch:manage",
      "hr:team:manage",
      "hr:role:architect",
      "task:create",
      "task:execute",
      "executive:telemetry:view",
    ],
    branch_manager: [
      "hr:user:manage",
      "hr:branch:manage",
      "hr:team:manage",
      "task:create",
      "task:subtask:create",
      "task:execute",
      "task:review",
      "executive:telemetry:view",
    ],
    project_manager: [
      "task:create",
      "task:subtask:create",
      "task:execute",
      "task:review",
      "task:change_request",
      "hr:team:manage",
      "process:template:design",
      "executive:telemetry:view",
    ],
    process_admin: [
      "process:template:design",
      "task:create",
      "task:subtask:create",
      "task:execute",
      "task:review",
      "executive:telemetry:view",
    ],
    compliance_officer: [
      "compliance:rule:manage",
      "compliance:evidence:audit",
      "compliance:violation:adjudicate",
      "executive:telemetry:view",
    ],
    team_lead: [
      "task:subtask:create",
      "task:execute",
      "task:review",
      "task:change_request",
      "hr:team:manage",
    ],
    team_member: [
      "task:execute",
      "task:change_request",
    ],
  };

  const templatesAndRoles = [
    { template: tSystemAdmin, role: rSystemAdmin, slug: "system_admin" },
    { template: tCompanyOwner, role: rCompanyOwner, slug: "company_owner" },
    { template: tAccessGovernance, role: rAccessGovernance, slug: "access_governance" },
    { template: tBranchManager, role: rBranchManager, slug: "branch_manager" },
    { template: tProcessAdmin, role: rProcessAdmin, slug: "process_admin" },
    { template: tComplianceOfficer, role: rComplianceOfficer, slug: "compliance_officer" },
    { template: tProjectManager, role: rProjectManager, slug: "project_manager" },
    { template: tTeamLead, role: rTeamLead, slug: "team_lead" },
    { template: tTeamMember, role: rTeamMember, slug: "team_member" },
  ];

  for (const item of templatesAndRoles) {
    const slugs = rolePermissionsMapping[item.slug] || [];
    for (const s of slugs) {
      const pId = permMap[s];
      if (pId) {
        await prisma.roleTemplatePermission.create({
          data: { roleTemplateId: item.template.id, permissionId: pId },
        });
        await prisma.rolePermission.create({
          data: { roleId: item.role.id, permissionId: pId },
        });
      }
    }
  }

  console.log("✓ System Roles and Permissions configured with default capabilities.");

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

  await prisma.roleAssignment.createMany({
    data: [
      // Company Owners
      { companyId: acmeCorp.id, userId: userAlice.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { companyId: acmeCorp.id, userId: userVictor.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { companyId: acmeCorp.id, userId: userOlivia.id, roleId: rCompanyOwner.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },

      // Access Governance
      { companyId: acmeCorp.id, userId: userHannah.id, roleId: rAccessGovernance.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userOlivia.id },
      { companyId: acmeCorp.id, userId: userKiran.id, roleId: rAccessGovernance.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userHannah.id },

      // Process Admin
      { companyId: acmeCorp.id, userId: userArjun.id, roleId: rProcessAdmin.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },

      // Compliance Officer
      { companyId: acmeCorp.id, userId: userSamuel.id, roleId: rComplianceOfficer.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userAlice.id },
      { companyId: acmeCorp.id, userId: userSophia.id, roleId: rComplianceOfficer.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userSamuel.id },

      // Project Manager
      { companyId: acmeCorp.id, userId: userBob.id, roleId: rProjectManager.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },
      { companyId: acmeCorp.id, userId: userRachel.id, roleId: rProjectManager.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },

      // Team Lead
      { companyId: acmeCorp.id, userId: userCharlie.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userBob.id },
      { companyId: acmeCorp.id, userId: userLucas.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userRachel.id },
      { companyId: acmeCorp.id, userId: userMarcus.id, roleId: rTeamLead.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userVictor.id },

      // Team Member
      { companyId: acmeCorp.id, userId: userDavid.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { companyId: acmeCorp.id, userId: userEmma.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
      { companyId: acmeCorp.id, userId: userFrank.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { companyId: acmeCorp.id, userId: userGrace.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
      { companyId: acmeCorp.id, userId: userIan.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userMarcus.id },
      { companyId: acmeCorp.id, userId: userJulia.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userCharlie.id },
      { companyId: acmeCorp.id, userId: userKevin.id, roleId: rTeamMember.id, scopeType: ScopeType.Company, scopeId: acmeCorp.id, grantedById: userLucas.id },
    ],
  });

  const rBetaOwner = await prisma.role.create({ data: { companyId: betaLlc.id, roleTemplateId: tCompanyOwner.id, label: "Company Owner", name: "company_owner", isSystem: true } });
  const rBetaMember = await prisma.role.create({ data: { companyId: betaLlc.id, roleTemplateId: tTeamMember.id, label: "Team Member", name: "team_member", isSystem: true } });

  const betaCeo = await prisma.user.create({ data: { companyId: betaLlc.id, fullName: "Fiona Gallagher (CEO)", email: "ceo@betallc.com", passwordHash } });
  const betaMember = await prisma.user.create({ data: { companyId: betaLlc.id, fullName: "George Clark (Dev)", email: "member1@betallc.com", passwordHash } });

  await prisma.roleAssignment.createMany({
    data: [
      { companyId: betaLlc.id, userId: betaCeo.id, roleId: rBetaOwner.id, scopeType: ScopeType.Company, scopeId: betaLlc.id, grantedById: betaCeo.id },
      { companyId: betaLlc.id, userId: betaMember.id, roleId: rBetaMember.id, scopeType: ScopeType.Company, scopeId: betaLlc.id, grantedById: betaCeo.id },
    ],
  });

  const betaBranch = await prisma.branch.create({ data: { companyId: betaLlc.id, name: "Beta SF Hub" } });
  const betaTeam = await prisma.team.create({ data: { companyId: betaLlc.id, branchId: betaBranch.id, name: "Beta Mobile Development" } });

  console.log("✓ Assigned system roles to all 20 users via RoleAssignment.");

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
      companyId: acmeCorp.id, userId: userBranchManager.id,
      roleId: rBranchManager.id,
      scopeType: ScopeType.Branch,
      scopeId: branch.id,
      grantedById: userAlice.id,
    },
  });

  const teamCore = await prisma.team.create({ data: { companyId: acmeCorp.id, branchId: branch.id, name: "Acme Core Engineering" } });
  const adminSupportTeam = await prisma.team.create({ data: { companyId: acmeCorp.id, branchId: branch.id, name: "Admin Support Team" } });

  const teamSales = await prisma.team.create({
    data: { companyId: acmeCorp.id, branchId: branch.id, name: "Acme Sales & Operations" }
  });

  // Seed official team memberships
  await prisma.teamMember.createMany({
    data: [
      // Acme Core Engineering
      { companyId: acmeCorp.id, teamId: teamCore.id, userId: userCharlie.id, role: "Lead" },
      { companyId: acmeCorp.id, teamId: teamCore.id, userId: userDavid.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: teamCore.id, userId: userFrank.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: teamCore.id, userId: userJulia.id, role: "Member" },

      // Acme Sales & Operations
      { companyId: acmeCorp.id, teamId: teamSales.id, userId: userLucas.id, role: "Lead" },
      { companyId: acmeCorp.id, teamId: teamSales.id, userId: userEmma.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: teamSales.id, userId: userGrace.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: teamSales.id, userId: userKevin.id, role: "Member" },

      // Admin Support Team
      { companyId: acmeCorp.id, teamId: adminSupportTeam.id, userId: userMarcus.id, role: "Lead" },
      { companyId: acmeCorp.id, teamId: adminSupportTeam.id, userId: userIan.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: adminSupportTeam.id, userId: userSamuel.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: adminSupportTeam.id, userId: userSophia.id, role: "Member" },
      { companyId: acmeCorp.id, teamId: adminSupportTeam.id, userId: userArjun.id, role: "Member" },
    ],
  });

  return {
    userAlice,
    userVictor,
    userOlivia,
    userArjun,
    userSamuel,
    userSophia,
    userBob,
    userRachel,
    userCharlie,
    userLucas,
    userMarcus,
    userDavid,
    userEmma,
    userFrank,
    userGrace,
    userIan,
    userJulia,
    userKevin,
    branch,
    betaCeo,
    betaMember,
    betaTeam,
    teamCore,
    adminSupportTeam,
    teamSales,
  };
}

export type HrResult = Awaited<ReturnType<typeof seedHr>>;
