-- CreateTable
CREATE TABLE "CompanyIdentity" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "investorStatus" TEXT,
    "mersisNumber" TEXT,
    "investorName" TEXT,
    "investorAddress" TEXT,
    "registrationDate" DATE,
    "tradeRegistryNumber" TEXT,
    "nationalId" TEXT,
    "city" TEXT,
    "district" TEXT,
    "mainActivity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyIdentity_companyId_key" ON "CompanyIdentity"("companyId");

-- CreateIndex
CREATE INDEX "CompanyIdentity_companyId_idx" ON "CompanyIdentity"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyIdentity" ADD CONSTRAINT "CompanyIdentity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
