-- AlterEnum
ALTER TYPE "SupportRequestStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "SupportRequest" ADD COLUMN     "viewedAt" TIMESTAMP(3);
