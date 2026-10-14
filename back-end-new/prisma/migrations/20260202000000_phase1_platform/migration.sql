-- AlterTable
ALTER TABLE "platform_admin_users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "companyId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_currentPeriodEnd_idx" ON "subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_audit_logs_companyId_idx" ON "platform_audit_logs"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_audit_logs_adminUserId_idx" ON "platform_audit_logs"("adminUserId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_audit_logs_adminUserId_fkey'
    ) THEN
        ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "platform_admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_audit_logs_companyId_fkey'
    ) THEN
        ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
