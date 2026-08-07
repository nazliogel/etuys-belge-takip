import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  approvalController,
  compareController,
  importController,
  importProcessController,
} from "../modules/import/import.module.js";
import {
  importBatchIdSchema,
  importBatchListSchema,
  importBatchUploadSchema,
} from "../schemas/import.schema.js";

export const importRouter = Router();

importRouter.use(authenticate);

importRouter.get("/", validate(importBatchListSchema), importController.list);

importRouter.post(
  "/upload",
  importUpload.single("file"),
  validate(importBatchUploadSchema),
  importController.upload,
);

importRouter.post(
  "/:id/process",
  validate(importBatchIdSchema),
  importProcessController.process,
);

importRouter.post(
  "/:id/compare",
  validate(importBatchIdSchema),
  compareController.compare,
);

importRouter.post(
  "/:id/approve",
  validate(importBatchIdSchema),
  approvalController.approve,
);

importRouter.get(
  "/:id",
  validate(importBatchIdSchema),
  importController.getById,
);
