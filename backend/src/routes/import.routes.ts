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
  importChangeDecisionSchema,
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

/*
 * Tek değişikliği onayla / reddet
 */
importRouter.patch(
  "/:id/changes/:changeId",
  validate(importChangeDecisionSchema),
  approvalController.reviewChange,
);

importRouter.get(
  "/:id/changes",
  validate(importBatchIdSchema),
  importController.getChanges,
);

importRouter.get(
  "/:id/rows",
  validate(importBatchIdSchema),
  importController.getRows,
);

importRouter.get(
  "/:id",
  validate(importBatchIdSchema),
  importController.getById,
);
