import { z } from "zod";

import { ImportBatchStatus } from "../generated/prisma/client.js";

const positiveIntegerSchema = z.coerce.number().int().positive();

const booleanFormDataSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return true;
    }

    if (typeof value === "boolean") {
      return value;
    }

    return value.toLowerCase() !== "false";
  });

export const importBatchListSchema = z.object({
  query: z.object({
    page: positiveIntegerSchema.default(1),
    limit: positiveIntegerSchema.max(100).default(20),
    status: z.nativeEnum(ImportBatchStatus).optional(),
  }),
});

export const importBatchIdSchema = z.object({
  params: z.object({
    id: positiveIntegerSchema,
  }),
});

export const importBatchUploadSchema = z.object({
  body: z.object({
    isFullSnapshot: booleanFormDataSchema,
    importType: z.enum(["OPEN", "CLOSED"]).optional(),
  }),
});
