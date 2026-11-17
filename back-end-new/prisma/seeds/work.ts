// prisma/seeds/work.ts
// Work delivery: projects, tasks, subtasks and escalations for both tenants, including the 50
// generated demo tasks used by the dashboards.
//
// Part of the split of prisma/seed.ts (PRE-M2-04). The statements below are the original seed's, moved
// here unchanged; only their grouping and the plumbing between modules is new.

import {
  TaskStatus,
  TaskPriority,
  EscalationStatus,
  ProjectStatus,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { PlatformResult } from "./platform.js";
import type { HrResult } from "./hr.js";

export async function seedWork(prisma: PrismaClient, ctx: PlatformResult & HrResult) {
  const { acmeCorp, betaLlc, userAlice, userBob, userDavid, userEmma, userFrank, userGrace, userIan, userJulia, userKevin, betaCeo, betaMember, betaTeam, teamCore, teamSales } = ctx;

  const betaProject = await prisma.project.create({
    data: {
      companyId: betaLlc.id, teamId: betaTeam.id,
      name: "Beta Mobile App (Project Phoenix)", createdById: betaCeo.id,
      status: "Active",
      startDate: new Date(),
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
      assignedToId: betaMember.id, createdById: betaCeo.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
      actualHours: 4,
    },
  });

  const project = await prisma.project.create({
    data: {
      companyId: acmeCorp.id, teamId: teamCore.id,
      name: "Acme Cloud Infrastructure (Project Atlas)", createdById: userAlice.id,
      status: "Active",
      startDate: new Date(),
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
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
      assignedToId: userDavid.id, createdById: userAlice.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      estimatedHours: 24,
      actualHours: 18,
    },
  });

  await prisma.subtask.createMany({
    data: [
      { companyId: acmeCorp.id, taskId: task1.id, title: "Subtask 1", createdById: userAlice.id, status: TaskStatus.Completed },
      { companyId: acmeCorp.id, taskId: task1.id, title: "Subtask 2", createdById: userAlice.id, status: TaskStatus.In_Review }
    ],
  });

  const projectQ3 = await prisma.project.create({ data: { companyId: acmeCorp.id, teamId: teamSales.id, name: "Q3 Marketing Campaign", status: ProjectStatus.Active, startDate: new Date(), targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdById: userAlice.id } });
  const projectMobile = await prisma.project.create({ data: { companyId: acmeCorp.id, teamId: teamSales.id, name: "Mobile App V2", status: ProjectStatus.Active, startDate: new Date(), targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdById: userAlice.id } });
  const projectSOC2 = await prisma.project.create({ data: { companyId: acmeCorp.id, teamId: teamSales.id, name: "SOC2 Compliance Audit", status: ProjectStatus.Active, startDate: new Date(), targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdById: userAlice.id } });
  const projectCRM = await prisma.project.create({ data: { companyId: acmeCorp.id, teamId: teamSales.id, name: "CRM Migration", status: ProjectStatus.Active, startDate: new Date(), targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), createdById: userAlice.id } });

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

  return { project, task1, projectQ3, projectMobile, projectSOC2, teamMembers, createdTasks };
}

export type WorkResult = Awaited<ReturnType<typeof seedWork>>;
