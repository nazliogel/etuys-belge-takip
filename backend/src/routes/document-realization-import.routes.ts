import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { DocumentRealizationImportController } from "../controllers/document-realization-import.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { DocumentRealizationImportService } from "../services/document-realization-import.service.js";

const router = Router();

const service = new DocumentRealizationImportService();
const controller = new DocumentRealizationImportController(service);

router.post(
  "/upload",
  authenticate,
  (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Bu işlem için yönetici yetkisi gerekiyor.",
      });
      return;
    }

    next();
  },
  importUpload.single("file"),
  controller.import,
);

export default router;
