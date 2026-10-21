-- CreateTable
CREATE TABLE "DocumentRealizationInfo" (
    "id" SERIAL NOT NULL,
    "detailId" INTEGER NOT NULL,
    "landRealization" DECIMAL(65,30),
    "totalLandRealization" DECIMAL(65,30),
    "mainBuildingRealization" DECIMAL(65,30),
    "auxiliaryFacilitiesRealization" DECIMAL(65,30),
    "administrativeBuildingsRealization" DECIMAL(65,30),
    "undergroundGalleriesRealization" DECIMAL(65,30),
    "totalBuildingRealization" DECIMAL(65,30),
    "auxiliaryMachineryRealization" DECIMAL(65,30),
    "importCustomsRealization" DECIMAL(65,30),
    "transportInsuranceRealization" DECIMAL(65,30),
    "assemblyRealization" DECIMAL(65,30),
    "studyProjectRealization" DECIMAL(65,30),
    "otherExpensesRealization" DECIMAL(65,30),
    "expenseDocumentRealization" DECIMAL(65,30),
    "totalOtherInvestmentRealization" DECIMAL(65,30),
    "domesticRealization" DECIMAL(65,30),
    "importedRealization" DECIMAL(65,30),
    "exchangeDifferenceRealization" DECIMAL(65,30),
    "totalRealizedAmount" DECIMAL(65,30),
    "updatedTotalLandRealization" DECIMAL(65,30),
    "updatedTotalBuildingRealization" DECIMAL(65,30),
    "updatedTotalOtherInvestmentRealization" DECIMAL(65,30),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRealizationInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRealizationInfo_detailId_key" ON "DocumentRealizationInfo"("detailId");

-- AddForeignKey
ALTER TABLE "DocumentRealizationInfo" ADD CONSTRAINT "DocumentRealizationInfo_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "DocumentDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
