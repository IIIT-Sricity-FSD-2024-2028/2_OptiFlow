-- PRE-M2-03 (BD6): bring the migrations in line with schema.prisma.
--
-- schema.prisma declares `slug @unique` on Permission and RoleTemplate, but no earlier migration
-- created those indexes, so a database built from migrations (CI, a new developer, a new
-- environment) had no unique constraint and the seed's `permission.upsert({ where: { slug } })`
-- could not run. Databases that were synced with `prisma db push` already have the indexes, so the
-- statements below use IF NOT EXISTS and are safe to run there too.
--
-- Step 1: refuse to continue if duplicate slugs already exist, and list them so they can be fixed by
-- hand instead of the migration silently picking a winner. NULL role_templates.slug values are
-- allowed to repeat (custom roles have no slug), exactly as Prisma's unique index treats them.
DO $$
DECLARE
  dup_permissions text;
  dup_templates text;
BEGIN
  SELECT string_agg("slug" || ' (' || n || ' rows)', ', ')
    INTO dup_permissions
    FROM (SELECT "slug", count(*) AS n FROM "permissions" GROUP BY "slug" HAVING count(*) > 1) d;

  SELECT string_agg("slug" || ' (' || n || ' rows)', ', ')
    INTO dup_templates
    FROM (
      SELECT "slug", count(*) AS n
        FROM "role_templates"
       WHERE "slug" IS NOT NULL
       GROUP BY "slug"
      HAVING count(*) > 1
    ) d;

  IF dup_permissions IS NOT NULL OR dup_templates IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot add unique slug indexes. Duplicate permissions.slug: %. Duplicate role_templates.slug: %. Remove the extra rows and re-run the migration.',
      coalesce(dup_permissions, 'none'), coalesce(dup_templates, 'none');
  END IF;
END $$;

-- Step 2: the indexes, named the way Prisma names them so `prisma migrate diff` stays clean.
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_slug_key" ON "permissions"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "role_templates_slug_key" ON "role_templates"("slug");
