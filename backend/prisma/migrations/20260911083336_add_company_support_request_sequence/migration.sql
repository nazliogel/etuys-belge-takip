/*
  Warnings:

  - A unique constraint covering the columns `[companyId,ticketNumber]` on the table `SupportRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SupportRequest_ticketNumber_key";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "supportRequestSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "SupportRequest_companyId_ticketNumber_key" ON "SupportRequest"("companyId", "ticketNumber");
