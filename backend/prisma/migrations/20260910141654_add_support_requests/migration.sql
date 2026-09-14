-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('SENT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SupportRequestTopic" AS ENUM ('DOCUMENT_GENERAL', 'EXTENSION', 'CLOSURE', 'AUTHORIZATION', 'DOCUMENT_DETAIL', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportRequestSection" AS ENUM ('INVESTMENT_TYPE', 'PRODUCTS', 'SUPPORTS', 'FINANCIAL_INFO', 'DOMESTIC_MACHINES', 'IMPORTED_MACHINES', 'SPECIAL_CONDITIONS');

-- CreateEnum
CREATE TYPE "DocumentReminderType" AS ENUM ('EXTENSION_APPLICATION', 'CLOSURE_APPLICATION');

-- CreateEnum
CREATE TYPE "DocumentReminderChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'CONSULTANT_IN_APP', 'ADMIN_EMAIL');

-- CreateEnum
CREATE TYPE "DocumentReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CompanyAuthorizationReminderType" AS ENUM ('AUTHORIZATION_EXPIRY');

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

-- CreateTable
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

    CONSTRAINT "CompanyAuthorizationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT,
    "companyId" INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "topic" "SupportRequestTopic" NOT NULL,
    "section" "SupportRequestSection",
    "externalDocumentId" INTEGER,
    "documentNumber" TEXT,
    "relatedRecordId" INTEGER,
    "relatedRecordName" TEXT,
    "description" TEXT NOT NULL,
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "CompanyAuthorizationReminder_companyId_idx" ON "CompanyAuthorizationReminder"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAuthorizationReminder_contactId_idx" ON "CompanyAuthorizationReminder"("contactId");

-- CreateIndex
CREATE INDEX "CompanyAuthorizationReminder_status_idx" ON "CompanyAuthorizationReminder"("status");

-- CreateIndex
CREATE INDEX "CompanyAuthorizationReminder_targetDate_idx" ON "CompanyAuthorizationReminder"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAuthorizationReminder_dedupe_key" ON "CompanyAuthorizationReminder"("authorizationId", "type", "targetDate", "reminderMonth", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "SupportRequest_ticketNumber_key" ON "SupportRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportRequest_companyId_idx" ON "SupportRequest"("companyId");

-- CreateIndex
CREATE INDEX "SupportRequest_assignedToId_idx" ON "SupportRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");

-- CreateIndex
CREATE INDEX "SupportRequest_externalDocumentId_idx" ON "SupportRequest"("externalDocumentId");

-- CreateIndex
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IncentiveDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CompanyContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAuthorizationReminder" ADD CONSTRAINT "CompanyAuthorizationReminder_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "CompanyAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAuthorizationReminder" ADD CONSTRAINT "CompanyAuthorizationReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAuthorizationReminder" ADD CONSTRAINT "CompanyAuthorizationReminder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CompanyContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
