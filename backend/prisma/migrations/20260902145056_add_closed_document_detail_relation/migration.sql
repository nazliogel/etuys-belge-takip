/*
  Warnings:

  - A unique constraint covering the columns `[closedDocumentId]` on the table `DocumentDetail` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DocumentDetail" ADD COLUMN     "closedDocumentId" INTEGER,
ALTER COLUMN "documentId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDetail_closedDocumentId_key" ON "DocumentDetail"("closedDocumentId");

-- CreateIndex
CREATE INDEX "DocumentDetail_closedDocumentId_idx" ON "DocumentDetail"("closedDocumentId");

-- AddForeignKey
ALTER TABLE "DocumentDetail" ADD CONSTRAINT "DocumentDetail_closedDocumentId_fkey" FOREIGN KEY ("closedDocumentId") REFERENCES "ClosedIncentiveDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
