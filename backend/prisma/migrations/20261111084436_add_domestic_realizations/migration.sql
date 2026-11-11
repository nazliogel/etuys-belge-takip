-- CreateTable
CREATE TABLE "DocumentDomesticRealization" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "machineId" INTEGER,
    "externalInvoiceLineId" INTEGER NOT NULL,
    "externalInvoiceId" INTEGER,
    "externalMachineId" INTEGER,
    "sequenceNumber" INTEGER,
    "itemName" TEXT,
    "invoiceNumber" TEXT,
    "sellerName" TEXT,
    "sellerTaxNumber" TEXT,
    "invoiceDate" DATE,
    "invoiceValue" DECIMAL(18,2),
    "realizedQuantity" DECIMAL(18,3),
    "invoiceType" TEXT,
    "recordStatus" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDomesticRealization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentDomesticRealization_detailId_idx" ON "DocumentDomesticRealization"("detailId");

-- CreateIndex
CREATE INDEX "DocumentDomesticRealization_machineId_idx" ON "DocumentDomesticRealization"("machineId");

-- CreateIndex
CREATE INDEX "DocumentDomesticRealization_externalMachineId_idx" ON "DocumentDomesticRealization"("externalMachineId");

-- CreateIndex
CREATE INDEX "DocumentDomesticRealization_externalInvoiceId_idx" ON "DocumentDomesticRealization"("externalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDomesticRealization_detailId_externalInvoiceLineId_key" ON "DocumentDomesticRealization"("detailId", "externalInvoiceLineId");

-- AddForeignKey
ALTER TABLE "DocumentDomesticRealization" ADD CONSTRAINT "DocumentDomesticRealization_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDomesticRealization" ADD CONSTRAINT "DocumentDomesticRealization_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "DocumentDomesticMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
