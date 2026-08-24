/*
  Warnings:

  - You are about to drop the column `investorName` on the `CompanyIdentity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanyIdentity" DROP COLUMN "investorName",
ADD COLUMN     "investorType" TEXT;
