import { Router } from "express";

import { authenticate } from "../middlewares/auth.js";
import { documentController } from "../modules/document/document.module.js";

export const documentRouter = Router();

documentRouter.use(authenticate);

documentRouter.get("/", documentController.list);

documentRouter.get("/:id", documentController.getById);
