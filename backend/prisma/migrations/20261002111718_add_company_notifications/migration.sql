-- CreateEnum
CREATE TYPE "CompanyNotificationType" AS ENUM ('EXTENSION_APPLICATION', 'CLOSURE_APPLICATION', 'AUTHORIZATION_RENEWAL');

-- CreateTable
CREATE TABLE "CompanyNotification" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" "CompanyNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "externalDocumentId" INTEGER,
    "documentNumber" TEXT,
    "targetDate" DATE NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyNotificationRead" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyNotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyNotification_dedupeKey_key" ON "CompanyNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "CompanyNotification_companyId_createdAt_idx" ON "CompanyNotification"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "CompanyNotification_companyId_type_idx" ON "CompanyNotification"("companyId", "type");

-- CreateIndex
CREATE INDEX "CompanyNotificationRead_userId_idx" ON "CompanyNotificationRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyNotificationRead_notificationId_userId_key" ON "CompanyNotificationRead"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "CompanyNotification" ADD CONSTRAINT "CompanyNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyNotificationRead" ADD CONSTRAINT "CompanyNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "CompanyNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyNotificationRead" ADD CONSTRAINT "CompanyNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
