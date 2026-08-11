import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { userController } from "../modules/user/user.module.js";

export const userRouter = Router();

userRouter.post("/", authenticate, userController.createUser);
