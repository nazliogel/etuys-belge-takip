import { ApprovalController } from "../../controllers/approval.controller.js";
import { CompareController } from "../../controllers/compare.controller.js";
import { ImportController } from "../../controllers/import.controller.js";
import { ImportProcessController } from "../../controllers/import-process.controller.js";

import { CompareRepository } from "../../repositories/compare.repository.js";
import { ImportRepository } from "../../repositories/import.repository.js";
import { ImportRowRepository } from "../../repositories/import-row.repository.js";

import { ApprovalService } from "../../services/approval.service.js";
import { CompareService } from "../../services/compare.service.js";
import { ExcelParserService } from "../../services/excel-parser.service.js";
import { ImportProcessService } from "../../services/import-process.service.js";
import { ImportService } from "../../services/import.service.js";

const importRepository = new ImportRepository();
const importRowRepository = new ImportRowRepository();
const excelParserService = new ExcelParserService();
const compareRepository = new CompareRepository();

const importService = new ImportService(importRepository);

const importProcessService = new ImportProcessService(
  importRepository,
  importRowRepository,
  excelParserService,
);

const compareService = new CompareService(
  importRepository,
  importRowRepository,
  compareRepository,
);

const approvalService = new ApprovalService();

export const importController = new ImportController(importService);

export const importProcessController = new ImportProcessController(
  importProcessService,
);

export const compareController = new CompareController(compareService);

export const approvalController = new ApprovalController(approvalService);
