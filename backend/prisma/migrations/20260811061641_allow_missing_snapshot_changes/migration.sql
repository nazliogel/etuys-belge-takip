-- DropForeignKey
ALTER TABLE "ImportChange" DROP CONSTRAINT "ImportChange_importRowId_fkey";

-- AlterTable
ALTER TABLE "ImportChange" ALTER COLUMN "importRowId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ImportChange" ADD CONSTRAINT "ImportChange_importRowId_fkey" FOREIGN KEY ("importRowId") REFERENCES "ImportRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
