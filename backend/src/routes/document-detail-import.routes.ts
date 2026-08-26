import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { DocumentDetailImportController } from "../controllers/document-detail-import.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { DocumentDetailImportService } from "../services/document-detail-import.service.js";

const router = Router();

const documentDetailImportService = new DocumentDetailImportService();

const documentDetailImportController = new DocumentDetailImportController(
  documentDetailImportService,
);

router.post(
  "/upload",
  authenticate,
  importUpload.single("file"),
  documentDetailImportController.import,
);

export default router;
