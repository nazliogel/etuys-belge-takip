-- AlterEnum
ALTER TYPE "ImportType" ADD VALUE 'COMPANY_REQUEST';

-- CreateTable
CREATE TABLE "CompanyRequest" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "requestNumber" INTEGER NOT NULL,
    "externalDocumentId" INTEGER,
    "documentNumber" TEXT,
    "note" TEXT,
    "requestType" TEXT,
    "requestStatus" TEXT,
    "department" TEXT,
    "assignedPersonnel" TEXT,
    "informationPerson" TEXT,
    "applicationDate" TIMESTAMP(3),
    "completionDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyRequest_companyId_idx" ON "CompanyRequest"("companyId");

-- CreateIndex
CREATE INDEX "CompanyRequest_requestNumber_idx" ON "CompanyRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "CompanyRequest_externalDocumentId_idx" ON "CompanyRequest"("externalDocumentId");

-- CreateIndex
CREATE INDEX "CompanyRequest_documentNumber_idx" ON "CompanyRequest"("documentNumber");

-- CreateIndex
CREATE INDEX "CompanyRequest_applicationDate_idx" ON "CompanyRequest"("applicationDate");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRequest_companyId_requestNumber_key" ON "CompanyRequest"("companyId", "requestNumber");

-- AddForeignKey
ALTER TABLE "CompanyRequest" ADD CONSTRAINT "CompanyRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
