-- CreateEnum
CREATE TYPE "IncentiveDocumentConditionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "IncentiveDocumentCondition" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "IncentiveDocumentConditionStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveDocumentCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncentiveDocumentCondition_isActive_status_sortOrder_idx" ON "IncentiveDocumentCondition"("isActive", "status", "sortOrder");