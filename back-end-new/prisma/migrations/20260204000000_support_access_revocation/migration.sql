-- AlterTable
ALTER TABLE "platform_support_accesses" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "platform_support_accesses" ADD COLUMN IF NOT EXISTS "revokedBy" TEXT;
