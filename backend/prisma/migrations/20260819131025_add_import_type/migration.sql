-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "importType" "ImportType" NOT NULL DEFAULT 'OPEN';
