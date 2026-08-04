import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { authController } from "../modules/auth/auth.module.js";
import { loginSchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), authController.login);

authRouter.get("/me", authenticate, authController.getProfile);
