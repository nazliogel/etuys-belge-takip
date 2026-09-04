/*
  Warnings:

  - You are about to drop the column `consultant` on the `Company` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OPERATION';

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "consultant",
ADD COLUMN     "consultantUserId" INTEGER;

-- CreateIndex
CREATE INDEX "Company_consultantUserId_idx" ON "Company"("consultantUserId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_consultantUserId_fkey" FOREIGN KEY ("consultantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
