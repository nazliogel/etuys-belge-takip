import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { companyController } from "../modules/company/company.module.js";
import {
  companyIdParamSchema,
  companyListSchema,
  updateCompanySchema,
} from "../schemas/company.schema.js";

export const companyRouter = Router();

companyRouter.use(authenticate);

companyRouter.get("/", validate(companyListSchema), companyController.list);

companyRouter.get(
  "/:id",
  validate(companyIdParamSchema),
  companyController.getById,
);

companyRouter.patch(
  "/:id",
  validate(updateCompanySchema),
  companyController.update,
);
