import { Router } from "express";

import { importUpload } from "../config/upload.js";
import { CompanyIdentityController } from "../controllers/company-identity.controller.js";
import { CompanyContactController } from "../controllers/company-contact.controller.js";
import { CompanyNoteController } from "../controllers/company-note.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { CompanyIdentityRepository } from "../repositories/company-identity.repository.js";
import { CompanyRepository } from "../repositories/company.repository.js";
import { CompanyContactRepository } from "../repositories/company-contact.repository.js";
import { CompanyNoteRepository } from "../repositories/company-note.repository.js";
import { CompanyIdentityExcelParserService } from "../services/company-identity-excel-parser.service.js";
import { CompanyIdentityImportService } from "../services/company-identity-import.service.js";
import { CompanyIdentityService } from "../services/company-identity.service.js";
import { CompanyContactService } from "../services/company-contact.service.js";
import { CompanyNoteService } from "../services/company-note.service.js";
import { ImportRepository } from "../repositories/import.repository.js";

const router = Router();

const companyIdentityRepository = new CompanyIdentityRepository();
const companyRepository = new CompanyRepository();
const companyContactRepository = new CompanyContactRepository();

const companyNoteRepository = new CompanyNoteRepository();
const importRepository = new ImportRepository();

const companyIdentityService = new CompanyIdentityService(
  companyIdentityRepository,
  companyRepository,
);
const companyContactService = new CompanyContactService(
  companyContactRepository,
  companyRepository,
);

const companyNoteService = new CompanyNoteService(
  companyNoteRepository,
  companyRepository,
);

const companyIdentityExcelParserService =
  new CompanyIdentityExcelParserService();

const companyIdentityImportService = new CompanyIdentityImportService(
  companyIdentityExcelParserService,
  companyIdentityService,
  importRepository,
);

const companyIdentityController = new CompanyIdentityController(
  companyIdentityService,
  companyIdentityImportService,
);
const companyContactController = new CompanyContactController(
  companyContactService,
);

const companyNoteController = new CompanyNoteController(companyNoteService);

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
router.get("/:companyId/contacts", companyContactController.list);

router.post("/:companyId/contacts", companyContactController.create);

router.patch(
  "/:companyId/contacts/:contactId",
  companyContactController.update,
);

router.get("/:companyId/notes", companyNoteController.list);

router.post("/:companyId/notes", companyNoteController.create);

router.patch("/:companyId/notes/:noteId", companyNoteController.update);

export default router;
