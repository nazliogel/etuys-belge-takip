import { CompareController } from "../../controllers/compare.controller.js";
import { ImportController } from "../../controllers/import.controller.js";
import { ImportProcessController } from "../../controllers/import-process.controller.js";

import { CompareRepository } from "../../repositories/compare.repository.js";
import { ImportRepository } from "../../repositories/import.repository.js";
import { ImportRowRepository } from "../../repositories/import-row.repository.js";
import { CompanyRepository } from "../../repositories/company.repository.js";
import { ApprovalService } from "../../services/approval.service.js";
import { CompareService } from "../../services/compare.service.js";
import { ExcelParserService } from "../../services/excel-parser.service.js";
import { ImportProcessService } from "../../services/import-process.service.js";
import { ImportService } from "../../services/import.service.js";
import { ClosedExcelParserService } from "../../services/closed-excel-parser.service.js";
import { CompanyRequestRepository } from "../../repositories/company-request.repository.js";
import { CompanyRequestExcelParserService } from "../../services/company-request-excel-parser.service.js";
import { CompanyRequestImportService } from "../../services/company-request-import.service.js";
import { CompanyRequestService } from "../../services/company-request.service.js";
import { CompanyRequestController } from "../../controllers/company-request.controller.js";

const importRepository = new ImportRepository();
const importRowRepository = new ImportRowRepository();
const excelParserService = new ExcelParserService();
const closedExcelParserService = new ClosedExcelParserService();
const compareRepository = new CompareRepository();
const companyRepository = new CompanyRepository();
const importProcessService = new ImportProcessService(
  importRepository,
  importRowRepository,
  excelParserService,
  closedExcelParserService,
);

const compareService = new CompareService(
  importRepository,
  importRowRepository,
  compareRepository,
);

const approvalService = new ApprovalService();

const companyRequestRepository = new CompanyRequestRepository();

const companyRequestExcelParserService = new CompanyRequestExcelParserService();

const companyRequestService = new CompanyRequestService(
  companyRequestRepository,
  companyRepository,
);

const companyRequestImportService = new CompanyRequestImportService(
  companyRequestExcelParserService,
  companyRequestService,
  importRepository,
);

const importService = new ImportService(
  importRepository,
  importProcessService,
  compareService,
  approvalService,
  companyRequestImportService,
);

export const importController = new ImportController(importService);

export const importProcessController = new ImportProcessController(
  importProcessService,
);

export const compareController = new CompareController(compareService);

export const companyRequestController =
  new CompanyRequestController(companyRequestService);