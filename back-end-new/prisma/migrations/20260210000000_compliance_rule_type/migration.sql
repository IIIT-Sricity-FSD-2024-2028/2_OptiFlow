-- CreateEnum
CREATE TYPE "ComplianceRuleType" AS ENUM ('Overdue', 'Unassigned', 'Custom');

-- AlterTable
ALTER TABLE "compliance_rules" ADD COLUMN "ruleType" "ComplianceRuleType" NOT NULL DEFAULT 'Custom';

-- Backfill: until now the engine guessed the check from the rule name; keep existing rules working.
UPDATE "compliance_rules" SET "ruleType" = 'Overdue' WHERE LOWER("name") LIKE '%overdue%';
UPDATE "compliance_rules" SET "ruleType" = 'Unassigned'
  WHERE "ruleType" = 'Custom' AND LOWER("name") LIKE '%assign%';
