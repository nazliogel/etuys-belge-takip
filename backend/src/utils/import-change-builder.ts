import type { Prisma } from "../generated/prisma/client.js";

interface CreateImportChangeInput {
  importBatchId: number;
  importRowId: number;
  companyId?: number;
  documentId?: number;

  entityType: "COMPANY" | "COMPANY_AUTHORIZATION" | "INCENTIVE_DOCUMENT";

  changeType: "CREATED" | "UPDATED";

  fieldName: string;

  oldValue: string | null;

  newValue: string | null;
}

export function createImportChange(
  input: CreateImportChangeInput,
): Prisma.ImportChangeCreateManyInput {
  return {
    importBatchId: input.importBatchId,
    importRowId: input.importRowId,
    companyId: input.companyId,
    documentId: input.documentId,
    entityType: input.entityType,
    changeType: input.changeType,
    fieldName: input.fieldName,
    oldValue: input.oldValue,
    newValue: input.newValue,
    status: "PENDING",
  };
}
