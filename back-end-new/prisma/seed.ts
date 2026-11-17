/// <reference types="node" />
// prisma/seed.ts
// Official User Testing Matrix Seed Script for Acme Corp & Platform Layer
//
// The seed is split by module (PRE-M2-04). This file only decides the order; each step lives in
// prisma/seeds/<module>.ts, so people can change their own module's data without touching anyone else's.
//
//   cleanup     empties every table (re-runnable)
//   platform    plan, platform admin, companies, subscriptions
//   hr          permissions, roles, users, role assignments, branches, teams
//   work        projects, tasks, subtasks, escalations
//   process     process template, steps, instance
//   compliance  categories, rules, violations, evidence, audit trail

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cleanDatabase } from "./seeds/cleanup.js";
import { seedPlatform, seedSupportAccess } from "./seeds/platform.js";
import { seedHr } from "./seeds/hr.js";
import { seedWork } from "./seeds/work.js";
import { seedWorkDemo } from "./seeds/workDemo.js";
import { seedProcess } from "./seeds/process.js";
import { seedCompliance } from "./seeds/compliance.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Official Acme Corp User Matrix Database Seed...");

  await cleanDatabase(prisma);
  console.log("✓ Cleaned existing database tables.");

  // Simple known password hash for all testing accounts: 'password123'
  const passwordHash = await bcrypt.hash("password123", 10);

  const platform = await seedPlatform(prisma, { passwordHash });
  const hr = await seedHr(prisma, { passwordHash, ...platform });
  const work = await seedWork(prisma, { ...platform, ...hr });
  await seedWorkDemo(prisma);
  await seedProcess(prisma, { ...platform, ...hr, ...work });

  console.log("Generating massive mock data for demo dashboards...");
  await seedCompliance(prisma, { ...platform, ...hr, ...work });
  await seedSupportAccess(prisma, platform);

  const { adminSupportTeam } = hr;

  // Seeded accounts have known demo passwords: mark them as already set so the
  // first-login password-change gate does not lock them out.
  await prisma.user.updateMany({ data: { passwordChangedAt: new Date() } });
  await prisma.platformAdminUser.updateMany({ data: { passwordChangedAt: new Date() } });

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
