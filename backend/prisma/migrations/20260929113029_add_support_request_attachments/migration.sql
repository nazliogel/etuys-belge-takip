-- CreateTable
CREATE TABLE "SupportRequestAttachment" (
    "id" SERIAL NOT NULL,
    "supportRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportRequestAttachment_storedFileName_key" ON "SupportRequestAttachment"("storedFileName");

-- CreateIndex
CREATE INDEX "SupportRequestAttachment_supportRequestId_idx" ON "SupportRequestAttachment"("supportRequestId");

-- AddForeignKey
ALTER TABLE "SupportRequestAttachment" ADD CONSTRAINT "SupportRequestAttachment_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
