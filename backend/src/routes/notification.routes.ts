import { Router } from "express";

import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get(
  "/",
  notificationController.list,
);

notificationRouter.patch(
  "/read-all",
  notificationController.markAllAsRead,
);

notificationRouter.patch(
  "/:id/read",
  notificationController.markAsRead,
);