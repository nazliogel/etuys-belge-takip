import { DocumentController } from "../../controllers/document.controller.js";
import { CompanyRepository } from "../../repositories/company.repository.js";
import { CompanyRequestRepository } from "../../repositories/company-request.repository.js";
import { DocumentRepository } from "../../repositories/document.repository.js";
import { DocumentService } from "../../services/document.service.js";

const documentRepository = new DocumentRepository();
const companyRepository = new CompanyRepository();
const companyRequestRepository = new CompanyRequestRepository();

const documentService = new DocumentService(
  documentRepository,
  companyRepository,
  companyRequestRepository,
);

export const documentController = new DocumentController(documentService);