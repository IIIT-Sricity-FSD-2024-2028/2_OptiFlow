-- SEC-M2-08: one user per email address across ALL companies, case-insensitive.
--
-- /auth/login identifies a user by email alone, so the same address in two companies makes login pick
-- an arbitrary tenant. The application already checks this when creating users; this index makes the
-- database enforce it too (closing the race between two simultaneous sign-ups).
--
-- Step 1: refuse to continue if duplicates already exist, and list them so they can be fixed by hand
-- (rename or deactivate one account) instead of the migration silently picking a winner.
DO $$
DECLARE
  dup_list text;
BEGIN
  SELECT string_agg(lower(email) || ' (' || n || ' accounts)', ', ')
    INTO dup_list
    FROM (
      SELECT lower("email") AS email, count(*) AS n
        FROM "users"
       GROUP BY lower("email")
      HAVING count(*) > 1
    ) d;

  IF dup_list IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot add global unique user email. Duplicate addresses exist: %. Resolve them (change or remove one account each) and re-run the migration.', dup_list;
  END IF;
END $$;

-- Step 2: the index. Prisma cannot express a lower() index in schema.prisma, so it lives only here;
-- the existing per-company unique ("companyId","email") stays as it is.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
