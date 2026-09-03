import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";

import { closedDocumentController } from "../modules/closed-document/closed-document.module.js";

export const closedDocumentRouter = Router();

closedDocumentRouter.use(authenticate);

closedDocumentRouter.get("/", closedDocumentController.list);

closedDocumentRouter.get("/:id/products", closedDocumentController.getProducts);

closedDocumentRouter.get("/:id/supports", closedDocumentController.getSupports);

closedDocumentRouter.get(
  "/:id/financial-info",
  closedDocumentController.getFinancialInfo,
);

closedDocumentRouter.get(
  "/:id/domestic-machines",
  closedDocumentController.getDomesticMachines,
);

closedDocumentRouter.get(
  "/:id/imported-machines",
  closedDocumentController.getImportedMachines,
);

closedDocumentRouter.get(
  "/:id/special-conditions",
  closedDocumentController.getSpecialConditions,
);

closedDocumentRouter.get("/:id", closedDocumentController.getById);
