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
    email: z.string().trim().min(1, "Email is required."),
    password: z.string().min(1, "Password is required."),
  }),
);
