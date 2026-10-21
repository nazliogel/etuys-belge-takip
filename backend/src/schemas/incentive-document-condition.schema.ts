import { z } from "zod";

const positiveId = z.coerce.number().int().positive();

export const conditionStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const conditionListSchema = z.object({
  query: z.object({
    status: conditionStatusSchema.optional(),
    search: z.string().trim().optional(),
  }),
});

export const createConditionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(250),
    description: z.string().trim().min(1),
    sortOrder: z.number().int().nonnegative().optional(),
    status: conditionStatusSchema.optional(),
  }),
});

export const updateConditionSchema = z.object({
  params: z.object({ id: positiveId }),
  body: z
    .object({
      title: z.string().trim().min(1).max(250).optional(),
      description: z.string().trim().min(1).optional(),
      sortOrder: z.number().int().nonnegative().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "En az bir alan güncellenmelidir.",
    }),
});

export const setConditionStatusSchema = z.object({
  params: z.object({ id: positiveId }),
  body: z.object({ status: conditionStatusSchema }),
});

export const reorderConditionsSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: positiveId,
          sortOrder: z.number().int().nonnegative(),
        }),
      )
      .min(1)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        { message: "Aynı şart maddesi birden fazla kez gönderilemez." },
      ),
  }),
});

export const conditionIdParamSchema = z.object({
  params: z.object({ id: positiveId }),
});