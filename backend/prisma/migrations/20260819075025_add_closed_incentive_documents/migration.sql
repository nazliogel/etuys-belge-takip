-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'CLOSED_INCENTIVE_DOCUMENT';

-- CreateTable
CREATE TABLE "ClosedIncentiveDocument" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "externalDocumentId" INTEGER NOT NULL,
    "documentNumber" TEXT,
    "documentStartDate" DATE,
    "documentEndDate" DATE,
    "extensionDate" DATE,
    "supportClass" TEXT,
    "status" "DocumentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosedIncentiveDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClosedIncentiveDocument_externalDocumentId_key" ON "ClosedIncentiveDocument"("externalDocumentId");

-- CreateIndex
CREATE INDEX "ClosedIncentiveDocument_companyId_idx" ON "ClosedIncentiveDocument"("companyId");

-- CreateIndex
CREATE INDEX "ClosedIncentiveDocument_documentNumber_idx" ON "ClosedIncentiveDocument"("documentNumber");

-- AddForeignKey
ALTER TABLE "ClosedIncentiveDocument" ADD CONSTRAINT "ClosedIncentiveDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
