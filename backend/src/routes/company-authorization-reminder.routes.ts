import { Router } from "express";

import { companyAuthorizationReminderController } from "../controllers/company-authorization-reminder.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const companyAuthorizationReminderRouter = Router();

companyAuthorizationReminderRouter.use(authenticate);

companyAuthorizationReminderRouter.get(
  "/candidates",
  companyAuthorizationReminderController.listCandidates,
);

companyAuthorizationReminderRouter.post(
  "/test",
  companyAuthorizationReminderController.sendTestEmail,
);

companyAuthorizationReminderRouter.post(
  "/queue/enqueue",
  companyAuthorizationReminderController.enqueueCandidates,
);

companyAuthorizationReminderRouter.get(
  "/queue/pending",
  companyAuthorizationReminderController.listPendingReminders,
);

companyAuthorizationReminderRouter.post(
  "/worker/process",
  companyAuthorizationReminderController.processPendingReminders,
);
