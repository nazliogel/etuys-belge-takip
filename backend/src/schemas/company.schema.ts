import { z } from "zod";

import { requestEnvelopeSchema } from "./shared-auth.schema.js";

const positiveIntegerSchema = z.coerce.number().int().positive();

const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const companyListSchema = requestEnvelopeSchema(z.object({})).extend({
  query: z.object({
    page: positiveIntegerSchema.default(1),
    limit: positiveIntegerSchema.max(100).default(20),

    search: z.string().trim().optional(),

    isActive: booleanQuerySchema.optional(),
  }),
});

export const companyIdParamSchema = requestEnvelopeSchema(z.object({})).extend({
  params: z.object({
    id: positiveIntegerSchema,
  }),
});

export const updateCompanySchema = requestEnvelopeSchema(
  z.object({
    processStatus: z
      .string()
      .trim()
      .min(1, "İşlem durumu boş olamaz.")
      .nullable()
      .optional(),

    isActive: z.boolean().optional(),
  }),
).extend({
  params: z.object({
    id: positiveIntegerSchema,
  }),
});
