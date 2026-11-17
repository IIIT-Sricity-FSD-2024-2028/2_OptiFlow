/// <reference types="node" />
// prisma/seeds/workDemo.ts
// Work-module seed data (PRE-M3-02): projects, tasks and subtasks so every Project
// Manager and Team Lead test account (pm, pm2, tl, tl2, tl_devops) has work to see.
//
// Runs on top of the main seed (prisma/seed.ts), which creates the users, roles
// and teams. It is idempotent: a project that already exists (same name in the
// company) is left as it is.
//
// Run on its own:   npx tsx prisma/seeds/workDemo.ts
// Or from seed.ts:  import { seedWorkDemo } from './seeds/workDemo'; await seedWorkDemo(prisma);

import { PrismaClient, ProjectStatus, ScopeType, TaskPriority, TaskStatus } from '@prisma/client';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY);

type SubtaskSpec = { title: string; member: string; status: TaskStatus; dueInDays: number };
type TaskSpec = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueInDays: number;
  estimatedHours: number;
  subtasks: SubtaskSpec[];
};
type ProjectSpec = {
  name: string;
  description: string;
  team: string;
  pm: string;
  status: ProjectStatus;
  targetInDays: number;
  tasks: TaskSpec[];
};

// Each project's parent tasks go to its team's Lead; subtasks go to team members.
const PROJECTS: ProjectSpec[] = [
  {
    name: 'Customer Portal Hardening',
    description: 'Security and reliability work on the customer portal before the Q4 audit.',
    team: 'Acme Core Engineering',
    pm: 'pm@acme.com',
    status: ProjectStatus.Active,
    targetInDays: 60,
    tasks: [
      {
        title: 'Session timeout and token rotation',
        description: 'Shorten idle sessions and rotate refresh tokens on every use.',
        status: TaskStatus.Active,
        priority: TaskPriority.High,
        dueInDays: 20,
        estimatedHours: 16,
        subtasks: [
          { title: 'Configure idle timeout', member: 'employee@acme.com', status: TaskStatus.Active, dueInDays: 10 },
          { title: 'Rotate refresh tokens', member: 'member3@acme.com', status: TaskStatus.In_Review, dueInDays: 12 },
          { title: 'Update session docs', member: 'member6@acme.com', status: TaskStatus.Completed, dueInDays: 8 },
        ],
      },
      {
        title: 'Audit log export',
        description: 'Let auditors export portal activity as CSV.',
        status: TaskStatus.In_Review,
        priority: TaskPriority.Medium,
        dueInDays: 30,
        estimatedHours: 10,
        subtasks: [
          { title: 'CSV export endpoint', member: 'employee@acme.com', status: TaskStatus.Completed, dueInDays: 15 },
          { title: 'Export button in UI', member: 'member6@acme.com', status: TaskStatus.Completed, dueInDays: 18 },
        ],
      },
    ],
  },
  {
    name: 'Sales Dashboard Revamp',
    description: 'Rebuild the sales dashboard with live pipeline numbers.',
    team: 'Acme Sales & Operations',
    pm: 'pm2@acme.com',
    status: ProjectStatus.Active,
    targetInDays: 75,
    tasks: [
      {
        title: 'Pipeline data model',
        description: 'Define the pipeline stages and the numbers each card shows.',
        status: TaskStatus.Active,
        priority: TaskPriority.High,
        dueInDays: 25,
        estimatedHours: 12,
        subtasks: [
          { title: 'List pipeline stages', member: 'member2@acme.com', status: TaskStatus.Completed, dueInDays: 7 },
          { title: 'Draft card metrics', member: 'member4@acme.com', status: TaskStatus.In_Review, dueInDays: 14 },
          { title: 'Review with sales leads', member: 'member7@acme.com', status: TaskStatus.Active, dueInDays: 20 },
        ],
      },
      {
        title: 'Dashboard UI build',
        description: 'Build the dashboard pages from the approved designs.',
        status: TaskStatus.Draft,
        priority: TaskPriority.Medium,
        dueInDays: 50,
        estimatedHours: 30,
        subtasks: [
          { title: 'Pipeline chart', member: 'member4@acme.com', status: TaskStatus.Active, dueInDays: 40 },
        ],
      },
    ],
  },
  {
    name: 'Internal Tooling Upgrade',
    description: 'Upgrade the build server and the internal admin tools.',
    team: 'Admin Support Team',
    pm: 'pm@acme.com',
    status: ProjectStatus.Planning,
    targetInDays: 90,
    tasks: [
      {
        title: 'Build server migration',
        description: 'Move CI jobs to the new build server.',
        status: TaskStatus.Active,
        priority: TaskPriority.Urgent,
        dueInDays: 21,
        estimatedHours: 20,
        subtasks: [
          { title: 'Inventory CI jobs', member: 'member5@acme.com', status: TaskStatus.In_Review, dueInDays: 9 },
          { title: 'Migrate nightly jobs', member: 'member5@acme.com', status: TaskStatus.Active, dueInDays: 18 },
        ],
      },
    ],
  },
];

export async function seedWorkDemo(prisma: PrismaClient) {
  const pmUser = await prisma.user.findFirst({ where: { email: 'pm@acme.com' } });
  if (!pmUser) {
    console.log('[seed:workDemo] Skipped: run the main seed first (pm@acme.com not found).');
    return;
  }
  const companyId = pmUser.companyId;

  const pmRole = await prisma.role.findFirst({
    where: {
      companyId,
      OR: [{ name: 'project_manager' }, { label: 'Project Manager' }, { roleTemplate: { slug: 'project_manager' } }],
    },
  });

  const userByEmail = async (email: string) => {
    const user = await prisma.user.findFirst({ where: { email, companyId } });
    if (!user) throw new Error(`[seed:workDemo] Missing user ${email}; run the main seed first.`);
    return user;
  };

  let created = 0;
  for (const spec of PROJECTS) {
    const exists = await prisma.project.findFirst({ where: { companyId, name: spec.name, deletedAt: null } });
    if (exists) continue;

    const team = await prisma.team.findFirst({
      where: { companyId, name: spec.team },
      include: { teamMembers: true },
    });
    if (!team) throw new Error(`[seed:workDemo] Missing team "${spec.team}"; run the main seed first.`);
    const lead = team.teamMembers.find((member) => /lead/i.test(member.role || ''));
    if (!lead) throw new Error(`[seed:workDemo] Team "${spec.team}" has no Lead.`);

    const pm = await userByEmail(spec.pm);

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          companyId,
          teamId: team.id,
          name: spec.name,
          description: spec.description,
          status: spec.status,
          startDate: new Date(),
          targetDate: inDays(spec.targetInDays),
          createdById: pm.id,
        },
      });

      // The PM sees the project through a Project-scoped PM assignment (SEC-M3-04).
      if (pmRole) {
        await tx.roleAssignment.create({
          data: {
            companyId,
            userId: pm.id,
            roleId: pmRole.id,
            scopeType: ScopeType.Project,
            scopeId: project.id,
            grantedById: pm.id,
          },
        });
      }

      for (const taskSpec of spec.tasks) {
        const task = await tx.task.create({
          data: {
            companyId,
            projectId: project.id,
            title: taskSpec.title,
            description: taskSpec.description,
            status: taskSpec.status,
            priority: taskSpec.priority,
            assignedToId: lead.userId,
            createdById: pm.id,
            dueDate: inDays(taskSpec.dueInDays),
            estimatedHours: taskSpec.estimatedHours,
            actualHours: 0,
          },
        });

        for (const sub of taskSpec.subtasks) {
          const member = await userByEmail(sub.member);
          await tx.subtask.create({
            data: {
              companyId,
              taskId: task.id,
              title: sub.title,
              status: sub.status,
              assignedToId: member.id,
              createdById: lead.userId,
              // A subtask is due on or before its parent task.
              dueDate: inDays(Math.min(sub.dueInDays, taskSpec.dueInDays)),
              completedAt: sub.status === TaskStatus.Completed ? new Date() : null,
            },
          });
        }
      }
    });
    created += 1;
  }

  console.log(`[seed:workDemo] Created ${created} project(s); ${PROJECTS.length - created} already present.`);
}

// Standalone run: npx tsx prisma/seeds/workDemo.ts
const isDirectRun = /seeds[\\/]workDemo\.ts$/.test(process.argv[1] || '');
if (isDirectRun) {
  const prisma = new PrismaClient();
  seedWorkDemo(prisma)
    .catch((error) => {
      console.error('[seed:workDemo] Failed:', error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
