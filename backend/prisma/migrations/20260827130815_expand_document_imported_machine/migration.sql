/*
  Warnings:

  - You are about to drop the column `cifAmountTl` on the `DocumentImportedMachine` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `DocumentImportedMachine` table. All the data in the column will be lost.
  - You are about to drop the column `fobAmount` on the `DocumentImportedMachine` table. All the data in the column will be lost.
  - You are about to drop the column `fobAmountTl` on the `DocumentImportedMachine` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DocumentImportedMachine" DROP COLUMN "cifAmountTl",
DROP COLUMN "currency",
DROP COLUMN "fobAmount",
DROP COLUMN "fobAmountTl",
ADD COLUMN     "customsPermittedQuantity" DECIMAL(65,30),
ADD COLUMN     "customsPermittedValue" DECIMAL(65,30),
ADD COLUMN     "customsRealizedQuantity" DECIMAL(65,30),
ADD COLUMN     "customsRealizedValue" DECIMAL(65,30),
ADD COLUMN     "customsTaxExemption" TEXT,
ADD COLUMN     "customsTaxExemptionDescription" TEXT,
ADD COLUMN     "exportOutgoingQuantity" DECIMAL(65,30),
ADD COLUMN     "exportOutgoingValue" DECIMAL(65,30),
ADD COLUMN     "exportPermittedQuantity" DECIMAL(65,30),
ADD COLUMN     "exportPermittedValue" DECIMAL(65,30),
ADD COLUMN     "financialLeasingCompanyName" TEXT,
ADD COLUMN     "financialLeasingPermittedQuantity" DECIMAL(65,30),
ADD COLUMN     "financialLeasingPermittedValue" DECIMAL(65,30),
ADD COLUMN     "financialLeasingRealizedQuantity" DECIMAL(65,30),
ADD COLUMN     "financialLeasingRealizedValue" DECIMAL(65,30),
ADD COLUMN     "invoiceRealizedQuantity" DECIMAL(65,30),
ADD COLUMN     "invoiceRealizedValue" DECIMAL(65,30),
ADD COLUMN     "isCkd" TEXT,
ADD COLUMN     "isVehicle" TEXT,
ADD COLUMN     "leasingOutgoingQuantity" DECIMAL(65,30),
ADD COLUMN     "leasingOutgoingValue" DECIMAL(65,30),
ADD COLUMN     "leasingPermittedQuantity" DECIMAL(65,30),
ADD COLUMN     "leasingPermittedValue" DECIMAL(65,30),
ADD COLUMN     "machineryEquipmentType" TEXT,
ADD COLUMN     "originCurrencyFob" TEXT,
ADD COLUMN     "originCurrencyFobAmount" DECIMAL(65,30),
ADD COLUMN     "saleOutgoingQuantity" DECIMAL(65,30),
ADD COLUMN     "saleOutgoingValue" DECIMAL(65,30),
ADD COLUMN     "salePermittedQuantity" DECIMAL(65,30),
ADD COLUMN     "salePermittedValue" DECIMAL(65,30),
ADD COLUMN     "totalCifTl" DECIMAL(65,30),
ADD COLUMN     "totalFobTl" DECIMAL(65,30),
ADD COLUMN     "totalFobUsd" DECIMAL(65,30),
ADD COLUMN     "transferDocumentNumber" TEXT,
ADD COLUMN     "transferIncomingAmount" DECIMAL(65,30),
ADD COLUMN     "transferIncomingQuantity" DECIMAL(65,30),
ADD COLUMN     "transferOutgoingQuantity" DECIMAL(65,30),
ADD COLUMN     "transferOutgoingValue" DECIMAL(65,30),
ADD COLUMN     "transferRealizedQuantity" DECIMAL(65,30),
ADD COLUMN     "transferRealizedValue" DECIMAL(65,30),
ADD COLUMN     "vatExemption" TEXT,
ADD COLUMN     "vatExemptionDescription" TEXT;
