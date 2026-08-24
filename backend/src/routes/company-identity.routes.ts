import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { CompanyIdentityController } from "../controllers/company-identity.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { CompanyIdentityRepository } from "../repositories/company-identity.repository.js";
import { CompanyRepository } from "../repositories/company.repository.js";
import { CompanyIdentityExcelParserService } from "../services/company-identity-excel-parser.service.js";
import { CompanyIdentityImportService } from "../services/company-identity-import.service.js";
import { CompanyIdentityService } from "../services/company-identity.service.js";

const router = Router();

const companyIdentityRepository = new CompanyIdentityRepository();
const companyRepository = new CompanyRepository();

const companyIdentityService = new CompanyIdentityService(
  companyIdentityRepository,
  companyRepository,
);

const companyIdentityExcelParserService =
  new CompanyIdentityExcelParserService();

const companyIdentityImportService = new CompanyIdentityImportService(
  companyIdentityExcelParserService,
  companyIdentityService,
);

const companyIdentityController = new CompanyIdentityController(
  companyIdentityService,
  companyIdentityImportService,
);

router.use(authenticate);

router.post(
  "/identity/import",
  importUpload.single("file"),
  companyIdentityController.importExcel,
);

router.patch(
  "/:companyId/consultant",
  companyIdentityController.updateConsultant,
);

router.get("/:companyId/identity", companyIdentityController.getByCompanyId);

export default router;
