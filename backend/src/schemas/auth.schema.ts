import { z } from "zod";

import {
  registerBodyBaseSchema,
  requestEnvelopeSchema,
  roleSchema,
} from "./shared-auth.schema.js";

const managementRoleSchema = roleSchema.refine(
  (role: "ADMIN" | "COMPANY") => ["ADMIN"].includes(role),
  {
    message: "Role must be ADMIN.",
  },
);

export const registerSchema = requestEnvelopeSchema(
  registerBodyBaseSchema.extend({
    role: managementRoleSchema,
  }),
);

export const loginSchema = requestEnvelopeSchema(
  z.object({
    identifier: z
      .string()
      .trim()
      .min(1, "E-posta veya kullanıcı adı zorunludur."),
    password: z.string().min(1, "Şifre zorunludur."),
  }),
);
