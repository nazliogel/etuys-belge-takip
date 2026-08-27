import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { documentController } from "../modules/document/document.module.js";

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get("/", documentController.list);

documentRouter.get("/extension-eligible", documentController.extensionEligible);

documentRouter.get("/:id/products", documentController.getProducts);

documentRouter.get("/:id/supports", documentController.getSupports);

documentRouter.get("/:id/financial-info", documentController.getFinancialInfo);

documentRouter.get(
  "/:id/domestic-machines",
  documentController.getDomesticMachines,   
);

documentRouter.get("/:id", documentController.getById);
