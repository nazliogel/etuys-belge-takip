import { ClosedDocumentController } from "../../controllers/closed-document.controller.js";
import { ClosedDocumentRepository } from "../../repositories/closed-document.repository.js";
import { CompanyRepository } from "../../repositories/company.repository.js";
import { ClosedDocumentService } from "../../services/closed-document.service.js";

const closedDocumentRepository = new ClosedDocumentRepository();
const companyRepository = new CompanyRepository();

const closedDocumentService = new ClosedDocumentService(
  closedDocumentRepository,
  companyRepository,
);

export const closedDocumentController = new ClosedDocumentController(
  closedDocumentService,
);
