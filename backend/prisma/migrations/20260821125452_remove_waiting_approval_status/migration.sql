/*
  Warnings:

  - The values [WAITING_APPROVAL] on the enum `ImportBatchStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

UPDATE "ImportBatch"
SET "status" = 'COMPLETED'
WHERE "status" = 'WAITING_APPROVAL';

CREATE TYPE "ImportBatchStatus_new" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
ALTER TABLE "public"."ImportBatch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ImportBatch" ALTER COLUMN "status" TYPE "ImportBatchStatus_new" USING ("status"::text::"ImportBatchStatus_new");
ALTER TYPE "ImportBatchStatus" RENAME TO "ImportBatchStatus_old";
ALTER TYPE "ImportBatchStatus_new" RENAME TO "ImportBatchStatus";
DROP TYPE "public"."ImportBatchStatus_old";
ALTER TABLE "ImportBatch" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';
COMMIT;
