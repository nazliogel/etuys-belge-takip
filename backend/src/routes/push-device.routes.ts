import { Router } from "express";

import { pushDeviceController } from "../controllers/push-device.controller.js";
import { authenticate } from "../middlewares/auth.js";

export const pushDeviceRouter = Router();

pushDeviceRouter.use(authenticate);

pushDeviceRouter.post("/", pushDeviceController.register);

pushDeviceRouter.post("/deactivate", pushDeviceController.deactivate);
