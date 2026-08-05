-- AlterEnum
ALTER TYPE "ImportRowStatus" ADD VALUE 'PENDING';

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
