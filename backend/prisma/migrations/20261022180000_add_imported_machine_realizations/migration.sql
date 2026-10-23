-- CreateTable
CREATE TABLE "DocumentImportedRealization" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "machineId" INTEGER,
    "externalRowId" TEXT NOT NULL,
    "sequenceNumber" INTEGER,
    "itemName" TEXT,
    "unit" TEXT,
    "customsRealizedQuantity" DECIMAL(65,30),
    "externalMachineId" INTEGER,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentImportedRealization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentImportedRealization_detailId_idx" ON "DocumentImportedRealization"("detailId");

-- CreateIndex
CREATE INDEX "DocumentImportedRealization_machineId_idx" ON "DocumentImportedRealization"("machineId");

-- CreateIndex
CREATE INDEX "DocumentImportedRealization_externalMachineId_idx" ON "DocumentImportedRealization"("externalMachineId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentImportedRealization_detailId_externalRowId_key" ON "DocumentImportedRealization"("detailId", "externalRowId");

-- AddForeignKey
ALTER TABLE "DocumentImportedRealization" ADD CONSTRAINT "DocumentImportedRealization_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportedRealization" ADD CONSTRAINT "DocumentImportedRealization_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "DocumentImportedMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

