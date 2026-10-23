-- AlterTable
ALTER TABLE "ClosedIncentiveDocument" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "osbName" TEXT;

-- AlterTable
ALTER TABLE "IncentiveDocument" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "osbName" TEXT;
