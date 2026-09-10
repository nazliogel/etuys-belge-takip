-- CreateEnum
CREATE TYPE "DocumentReminderType" AS ENUM ('EXTENSION_APPLICATION', 'CLOSURE_APPLICATION');

-- CreateEnum
CREATE TYPE "DocumentReminderChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'CONSULTANT_IN_APP');

-- CreateEnum
CREATE TYPE "DocumentReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "DocumentReminder" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "contactId" INTEGER,
    "type" "DocumentReminderType" NOT NULL,
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

    CONSTRAINT "DocumentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentReminder_companyId_idx" ON "DocumentReminder"("companyId");

-- CreateIndex
CREATE INDEX "DocumentReminder_contactId_idx" ON "DocumentReminder"("contactId");

-- CreateIndex
CREATE INDEX "DocumentReminder_status_idx" ON "DocumentReminder"("status");

-- CreateIndex
CREATE INDEX "DocumentReminder_targetDate_idx" ON "DocumentReminder"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReminder_documentId_type_targetDate_reminderMonth_c_key" ON "DocumentReminder"("documentId", "type", "targetDate", "reminderMonth", "channel");

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IncentiveDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CompanyContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
