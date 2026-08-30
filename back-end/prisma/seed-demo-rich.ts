import { PrismaClient, TaskStatus, TaskPriority, Severity, ViolationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Rich Demo Seed for Executive Dashboard...");

  const company = await prisma.company.findFirst({
    where: { legalName: { contains: "Acme" } }
  });

  if (!company) {
    console.error("Acme Corp not found. Run main seed first.");
    return;
  }

  const branchNames = ["HQ - New York", "EMEA - London"];
  const teamNames = ["Engineering", "Sales", "HR & Ops", "Marketing"];

  const branches: any[] = [];
  for (const bName of branchNames) {
    let b = await prisma.branch.findFirst({ where: { name: bName, companyId: company.id } });
    if (!b) b = await prisma.branch.create({ data: { name: bName, companyId: company.id } });
    branches.push(b);
  }

  const teams: any[] = [];
  for (const tName of teamNames) {
    let t = await prisma.team.findFirst({ where: { name: tName, branchId: branches[0].id } });
    if (!t) t = await prisma.team.create({ data: { name: tName, branchId: branches[0].id } });
    teams.push(t);
  }

  const user = await prisma.user.findFirst({ where: { companyId: company.id } });
  if (!user) throw new Error("No user found for Acme Corp.");

  const projectNames = [
    { name: "Q3 Website Revamp", status: "Active", teamId: teams[0].id },
    { name: "Cloud Migration", status: "Delayed", teamId: teams[0].id },
    { name: "Enterprise Sales Push", status: "Active", teamId: teams[1].id },
    { name: "Q4 Marketing Campaign", status: "Active", teamId: teams[3].id },
    { name: "Onboarding Automation", status: "Active", teamId: teams[2].id }
  ];

  const projects: any[] = [];
  for (const p of projectNames) {
    let proj = await prisma.project.findFirst({ where: { name: p.name, teamId: p.teamId } });
    if (!proj) {
      proj = await prisma.project.create({
        data: { name: p.name, status: p.status, teamId: p.teamId, createdById: user.id }
      });
    }
    projects.push(proj);
  }

  console.log("Generating 30 days of completed tasks...");
  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    await prisma.task.create({
      data: {
        companyId: company.id,
        projectId: projects[Math.floor(Math.random() * projects.length)].id,
        title: `Historical Task ${i}`,
        status: TaskStatus.Completed,
        priority: TaskPriority.Medium,
        createdById: user.id,
        assignedToId: user.id,
        completedAt: d,
        createdAt: new Date(d.getTime() - 86400000)
      }
    });
  }

  console.log("Generating active tasks...");
  for (let i = 0; i < 25; i++) {
    await prisma.task.create({
      data: {
        companyId: company.id,
        projectId: projects[Math.floor(Math.random() * projects.length)].id,
        title: `Active Task ${i}`,
        status: TaskStatus.Active,
        priority: TaskPriority.High,
        createdById: user.id,
        assignedToId: user.id,
      }
    });
  }

  console.log("Generating compliance violations...");
  let rule = await prisma.complianceRule.findFirst({ where: { category: { companyId: company.id } } });
  if (!rule) {
    const cat = await prisma.complianceCategory.create({
      data: { name: "Data Security", description: "Sec", companyId: company.id }
    });
    rule = await prisma.complianceRule.create({
      data: { name: "PII Exposure Check", description: "Check", categoryId: cat.id, severity: Severity.High }
    });
  }

  await prisma.complianceViolation.createMany({
    data: [
      { companyId: company.id, ruleId: rule.id, entityType: "Task", entityId: "some-id", status: ViolationStatus.Open, severity: Severity.Critical },
      { companyId: company.id, ruleId: rule.id, entityType: "Project", entityId: "some-id", status: ViolationStatus.Open, severity: Severity.High },
      { companyId: company.id, ruleId: rule.id, entityType: "Process", entityId: "some-id", status: ViolationStatus.Under_Review, severity: Severity.Critical }
    ]
  });

  console.log("Generating escalations...");
  await prisma.escalation.createMany({
    data: [
      { companyId: company.id, reportedById: user.id, title: "Blocked on API credentials", description: "Waiting on DevOps", priority: Severity.Critical },
      { companyId: company.id, reportedById: user.id, title: "Client rejecting contract terms", description: "Need legal review", priority: Severity.High },
      { companyId: company.id, reportedById: user.id, title: "Production database slow", description: "Index missing", priority: Severity.Critical }
    ]
  });

  console.log("✅ Rich Demo Data Seeded Successfully!");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
