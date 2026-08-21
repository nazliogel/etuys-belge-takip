/*
  Warnings:

  - The values [APPROVED,REJECTED] on the enum `ImportChangeStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [IMPORT_WAITING_APPROVAL] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `reviewedAt` on the `ImportBatch` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `ImportBatch` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedReason` on the `ImportChange` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `ImportChange` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedById` on the `ImportChange` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;


CREATE TYPE "ImportChangeStatus_new" AS ENUM ('PENDING', 'APPLIED');
ALTER TABLE "public"."ImportChange" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ImportChange"
ALTER COLUMN "status"
TYPE "ImportChangeStatus_new"
USING (
  CASE
    WHEN "status"::text IN ('APPROVED', 'REJECTED') THEN 'APPLIED'
    ELSE "status"::text
  END
)::"ImportChangeStatus_new";
ALTER TYPE "ImportChangeStatus" RENAME TO "ImportChangeStatus_old";
ALTER TYPE "ImportChangeStatus_new" RENAME TO "ImportChangeStatus";
DROP TYPE "public"."ImportChangeStatus_old";
ALTER TABLE "ImportChange" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;

DELETE FROM "Notification"
WHERE "type" = 'IMPORT_WAITING_APPROVAL';

CREATE TYPE "NotificationType_new" AS ENUM ('AUTHORIZATION_EXPIRING', 'AUTHORIZATION_EXPIRED', 'DOCUMENT_EXPIRING', 'DOCUMENT_EXPIRED', 'EXTENSION_EXPIRING', 'IMPORT_COMPLETED', 'SYSTEM');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ImportBatch" DROP CONSTRAINT "ImportBatch_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "ImportChange" DROP CONSTRAINT "ImportChange_reviewedById_fkey";

-- AlterTable
ALTER TABLE "ImportBatch" DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById";

-- AlterTable
ALTER TABLE "ImportChange" DROP COLUMN "rejectedReason",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedById";
