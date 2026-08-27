/*
  Warnings:

  - A unique constraint covering the columns `[importBatchId,sheetName,rowNumber]` on the table `ImportRow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ImportRow_importBatchId_rowNumber_key";

-- AlterTable
ALTER TABLE "ImportRow" ADD COLUMN     "sheetName" TEXT NOT NULL DEFAULT 'MAIN';

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importBatchId_sheetName_rowNumber_key" ON "ImportRow"("importBatchId", "sheetName", "rowNumber");
