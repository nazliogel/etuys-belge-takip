import { Router } from "express";

import { companyNotificationController } from "../controllers/company-notification.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const companyNotificationRouter = Router();

companyNotificationRouter.use(authenticate);

companyNotificationRouter.get("/", companyNotificationController.list);

companyNotificationRouter.patch(
  "/read-all",
  companyNotificationController.markAllAsRead,
);

companyNotificationRouter.patch(
  "/:id/read",
  companyNotificationController.markAsRead,
);

companyNotificationRouter.patch(
  "/:id/unread",
  companyNotificationController.markAsUnread,
);
