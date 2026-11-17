-- One active violation per rule and entity (SEC-M3-25).
-- Close existing duplicates first (keep the oldest); nothing is deleted.
UPDATE "compliance_violations" v
SET "status" = 'Ignored',
    "resolvedAt" = NOW(),
    "resolutionRemarks" = COALESCE(v."resolutionRemarks", 'Duplicate of an earlier active violation; closed by migration')
FROM (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "ruleId", "entityType", "entityId" ORDER BY "detectedAt", "id") AS rn
  FROM "compliance_violations"
  WHERE "status" IN ('Open', 'Under_Review')
) d
WHERE v."id" = d."id" AND d.rn > 1;

-- Partial unique index (Prisma cannot express this in schema.prisma; it lives in this migration).
CREATE UNIQUE INDEX "compliance_violations_one_active_per_rule_entity"
  ON "compliance_violations" ("ruleId", "entityType", "entityId")
  WHERE "status" IN ('Open', 'Under_Review');
