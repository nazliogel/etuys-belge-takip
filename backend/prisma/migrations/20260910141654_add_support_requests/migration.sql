-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('SENT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SupportRequestTopic" AS ENUM ('DOCUMENT_GENERAL', 'EXTENSION', 'CLOSURE', 'AUTHORIZATION', 'DOCUMENT_DETAIL', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportRequestSection" AS ENUM ('INVESTMENT_TYPE', 'PRODUCTS', 'SUPPORTS', 'FINANCIAL_INFO', 'DOMESTIC_MACHINES', 'IMPORTED_MACHINES', 'SPECIAL_CONDITIONS');

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
CREATE UNIQUE INDEX "SupportRequest_ticketNumber_key"
ON "SupportRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportRequest_companyId_idx"
ON "SupportRequest"("companyId");

-- CreateIndex
CREATE INDEX "SupportRequest_assignedToId_idx" ON "SupportRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");

-- CreateIndex
CREATE INDEX "SupportRequest_externalDocumentId_idx" ON "SupportRequest"("externalDocumentId");

-- CreateIndex
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;