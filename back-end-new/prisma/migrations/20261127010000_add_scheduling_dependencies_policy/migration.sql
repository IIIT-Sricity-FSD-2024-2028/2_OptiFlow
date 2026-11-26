-- Phase 1, 2 & 3 Scheduling Schema Extensions
-- Adds task review buffer override, subtask startDate, subtask dependency DAG table,
-- company scheduling policy, and company holiday calendar.

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reviewBufferDays" INTEGER;

ALTER TABLE "subtasks" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "subtask_dependencies" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "subtaskId" TEXT NOT NULL,
  "dependsOnSubtaskId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subtask_dependencies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subtask_dependencies_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "subtask_dependencies_dependsOnSubtaskId_fkey" FOREIGN KEY ("dependsOnSubtaskId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "subtask_dependencies_subtaskId_dependsOnSubtaskId_key"
  ON "subtask_dependencies"("subtaskId", "dependsOnSubtaskId");
CREATE INDEX IF NOT EXISTS "subtask_dependencies_companyId_idx"
  ON "subtask_dependencies"("companyId");
CREATE INDEX IF NOT EXISTS "subtask_dependencies_subtaskId_idx"
  ON "subtask_dependencies"("subtaskId");
CREATE INDEX IF NOT EXISTS "subtask_dependencies_dependsOnSubtaskId_idx"
  ON "subtask_dependencies"("dependsOnSubtaskId");

CREATE TABLE IF NOT EXISTS "company_scheduling_policies" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "workHoursPerDay" DECIMAL(65,30) NOT NULL DEFAULT 8,
  "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5],
  "defaultReviewBufferDays" INTEGER NOT NULL DEFAULT 1,
  "enforceCapacityBlock" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "company_scheduling_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_scheduling_policies_companyId_key" UNIQUE ("companyId"),
  CONSTRAINT "company_scheduling_policies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "company_holidays" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "company_holidays_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_holidays_companyId_date_key" UNIQUE ("companyId", "date"),
  CONSTRAINT "company_holidays_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "company_holidays_companyId_date_idx"
  ON "company_holidays"("companyId", "date");
