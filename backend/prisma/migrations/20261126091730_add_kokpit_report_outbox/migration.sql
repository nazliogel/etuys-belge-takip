-- CreateTable
CREATE TABLE "KokpitReportOutbox" (
    "id" SERIAL NOT NULL,
    "sourceId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "activityAt" TIMESTAMP(3) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KokpitReportOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KokpitReportOutbox_sentAt_nextAttemptAt_idx" ON "KokpitReportOutbox"("sentAt", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "KokpitReportOutbox_sourceId_sourceUpdatedAt_key" ON "KokpitReportOutbox"("sourceId", "sourceUpdatedAt");
