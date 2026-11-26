-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN IF NOT EXISTS "estimatedHours" DECIMAL(65,30);
