import fs from "node:fs/promises";
import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { authenticate } from "../middlewares/auth.js";
import { ImportedRealizationImportService } from "../services/imported-realization-import.service.js";
import { validate } from "../middlewares/validate.js";
import {
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
const importedRealizationImportService =
  new ImportedRealizationImportService();

importRouter.use(authenticate);

importRouter.use((req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Bu işlem için yetkiniz bulunmuyor.",
    });
  }

  return next();
});

importRouter.get("/", validate(importBatchListSchema), importController.list);

importRouter.post(
  "/upload",
  importUpload.single("file"),
  validate(importBatchUploadSchema),
  importController.upload,
);

importRouter.post(
  "/imported-realizations",
  importUpload.single("file"),
  async (req, res, next) => {
    const file = req.file;
    const filePath = file?.path;

    if (!filePath) {
      res.status(400).json({
        success: false,
        message: "Excel dosyası yüklenmedi.",
      });
      return;
    }

    try {
      if (!file?.originalname.toLowerCase().endsWith(".xlsx")) {
        res.status(400).json({
          success: false,
          message: "Yalnızca .xlsx dosyaları desteklenir.",
        });
        return;
      }

      const result = await importedRealizationImportService.import(
        filePath,
      );

      res.status(200).json({
        success: true,
        message: "İthal Gerçekleşme Excel aktarımı tamamlandı.",
        data: result,
      });
    } catch (error) {
      next(error);
    } finally {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error("Geçici Excel dosyası silinemedi:", error);
      }
    }
  },
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
