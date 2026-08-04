import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "COMPANY"]);

export const requestEnvelopeSchema = <T extends z.ZodTypeAny>(bodySchema: T) =>
  z.object({
    body: bodySchema,
  });

export const registerBodyBaseSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
