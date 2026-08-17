-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ImportRow" ADD COLUMN     "documentStatus" "DocumentStatus";

-- AlterTable
ALTER TABLE "IncentiveDocument" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'OPEN';
