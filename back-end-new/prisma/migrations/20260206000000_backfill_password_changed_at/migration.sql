-- Existing tenant users chose (or were given) their password before the first-login
-- password-change gate existed. Mark them as already set so they are not locked out.
-- Users invited after this point keep NULL until they set their own password.
UPDATE "users" SET "passwordChangedAt" = "createdAt" WHERE "passwordChangedAt" IS NULL;
UPDATE "platform_admin_users" SET "passwordChangedAt" = "createdAt" WHERE "passwordChangedAt" IS NULL;
