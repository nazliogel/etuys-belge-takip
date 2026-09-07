import { Router } from "express";

import { documentReminderController } from "../controllers/document-reminder.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const documentReminderRouter = Router();

documentReminderRouter.use(authenticate);

documentReminderRouter.get(
  "/candidates/extension",
  documentReminderController.listExtensionCandidates,
);

documentReminderRouter.get(
  "/candidates/closure",
  documentReminderController.listClosureCandidates,
);

documentReminderRouter.get(
  "/candidates",
  documentReminderController.listCandidates,
);

documentReminderRouter.post(
  "/test-send/extension",
  documentReminderController.sendExtensionTest,
);

documentReminderRouter.post(
  "/test-send/closure",
  documentReminderController.sendClosureTest,
);

documentReminderRouter.post(
  "/queue",
  documentReminderController.enqueueCandidates,
);