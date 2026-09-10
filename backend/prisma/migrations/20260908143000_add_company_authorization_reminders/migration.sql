CREATE TYPE "CompanyAuthorizationReminderType"
AS ENUM ('AUTHORIZATION_EXPIRY');

CREATE TABLE "CompanyAuthorizationReminder" (
    "id" SERIAL NOT NULL,
    "authorizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "contactId" INTEGER,
    "type" "CompanyAuthorizationReminderType" NOT NULL DEFAULT 'AUTHORIZATION_EXPIRY',
    "channel" "DocumentReminderChannel" NOT NULL,
    "status" "DocumentReminderStatus" NOT NULL DEFAULT 'PENDING',
    "reminderMonth" INTEGER NOT NULL,
    "targetDate" DATE NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "providerId" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAuthorizationReminder_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyAuthorizationReminder_dedupe_key"
ON "CompanyAuthorizationReminder"(
    "authorizationId",
    "type",
    "targetDate",
    "reminderMonth",
    "channel"
);

CREATE INDEX "CompanyAuthorizationReminder_companyId_idx"
ON "CompanyAuthorizationReminder"("companyId");

CREATE INDEX "CompanyAuthorizationReminder_contactId_idx"
ON "CompanyAuthorizationReminder"("contactId");

CREATE INDEX "CompanyAuthorizationReminder_status_idx"
ON "CompanyAuthorizationReminder"("status");

CREATE INDEX "CompanyAuthorizationReminder_targetDate_idx"
ON "CompanyAuthorizationReminder"("targetDate");

ALTER TABLE "CompanyAuthorizationReminder"
ADD CONSTRAINT "CompanyAuthorizationReminder_authorizationId_fkey"
FOREIGN KEY ("authorizationId")
REFERENCES "CompanyAuthorization"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CompanyAuthorizationReminder"
ADD CONSTRAINT "CompanyAuthorizationReminder_companyId_fkey"
FOREIGN KEY ("companyId")
REFERENCES "Company"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CompanyAuthorizationReminder"
ADD CONSTRAINT "CompanyAuthorizationReminder_contactId_fkey"
FOREIGN KEY ("contactId")
REFERENCES "CompanyContact"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;