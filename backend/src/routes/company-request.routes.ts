import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { companyRequestController } from "../modules/import/import.module.js";

export const companyRequestRouter = Router();

companyRequestRouter.use(authenticate);

companyRequestRouter.get("/", companyRequestController.list);