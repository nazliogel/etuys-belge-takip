import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { closedDocumentController } from "../modules/closed-document/closed-document.module.js";

export const closedDocumentRouter = Router();

closedDocumentRouter.use(authenticate);

closedDocumentRouter.get("/", closedDocumentController.list);

closedDocumentRouter.get("/:id", closedDocumentController.getById);
