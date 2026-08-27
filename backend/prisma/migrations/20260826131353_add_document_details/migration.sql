-- AlterEnum
ALTER TYPE "ImportType" ADD VALUE 'DOCUMENT_DETAIL';

-- CreateTable
CREATE TABLE "DocumentDetail" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "investmentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentProduct" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "productName" TEXT,
    "us97Code" TEXT,
    "us97Description" TEXT,
    "naceCode" TEXT,
    "naceDescription" TEXT,
    "unit" TEXT,
    "existingCapacity" DECIMAL(65,30),
    "additionalCapacity" DECIMAL(65,30),
    "totalCapacity" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSupport" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "supportType" TEXT,
    "supportTypeCode" TEXT,
    "supportRate" TEXT,
    "supportRateCode" TEXT,
    "supportDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFinancialInfo" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "externalFinancialInfoId" TEXT,
    "totalInvestment" DECIMAL(65,30),
    "totalFinancing" DECIMAL(65,30),
    "equity" DECIMAL(65,30),
    "foreignResources" DECIMAL(65,30),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFinancialInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDomesticMachine" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "externalMachineId" INTEGER,
    "sequenceNumber" INTEGER,
    "name" TEXT,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "unitPriceTl" DECIMAL(65,30),
    "totalTl" DECIMAL(65,30),
    "gtipCode" TEXT,
    "gtipDescription" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDomesticMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentImportedMachine" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "externalMachineId" INTEGER,
    "sequenceNumber" INTEGER,
    "name" TEXT,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "gtipCode" TEXT,
    "gtipDescription" TEXT,
    "currency" TEXT,
    "fobAmount" DECIMAL(65,30),
    "fobAmountTl" DECIMAL(65,30),
    "cifAmountTl" DECIMAL(65,30),
    "usedMachine" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentImportedMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSpecialCondition" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "conditionCode" TEXT,
    "conditionName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSpecialCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDetail_documentId_key" ON "DocumentDetail"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDetail_documentId_idx" ON "DocumentDetail"("documentId");

-- CreateIndex
CREATE INDEX "DocumentProduct_detailId_idx" ON "DocumentProduct"("detailId");

-- CreateIndex
CREATE INDEX "DocumentSupport_detailId_idx" ON "DocumentSupport"("detailId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFinancialInfo_detailId_key" ON "DocumentFinancialInfo"("detailId");

-- CreateIndex
CREATE INDEX "DocumentDomesticMachine_detailId_idx" ON "DocumentDomesticMachine"("detailId");

-- CreateIndex
CREATE INDEX "DocumentDomesticMachine_externalMachineId_idx" ON "DocumentDomesticMachine"("externalMachineId");

-- CreateIndex
CREATE INDEX "DocumentImportedMachine_detailId_idx" ON "DocumentImportedMachine"("detailId");

-- CreateIndex
CREATE INDEX "DocumentImportedMachine_externalMachineId_idx" ON "DocumentImportedMachine"("externalMachineId");

-- CreateIndex
CREATE INDEX "DocumentSpecialCondition_detailId_idx" ON "DocumentSpecialCondition"("detailId");

-- AddForeignKey
ALTER TABLE "DocumentDetail" ADD CONSTRAINT "DocumentDetail_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IncentiveDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentProduct" ADD CONSTRAINT "DocumentProduct_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSupport" ADD CONSTRAINT "DocumentSupport_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFinancialInfo" ADD CONSTRAINT "DocumentFinancialInfo_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDomesticMachine" ADD CONSTRAINT "DocumentDomesticMachine_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportedMachine" ADD CONSTRAINT "DocumentImportedMachine_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSpecialCondition" ADD CONSTRAINT "DocumentSpecialCondition_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
