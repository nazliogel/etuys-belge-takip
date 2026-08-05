import { ImportController } from "../../controllers/import.controller.js";
import { ImportProcessController } from "../../controllers/import-process.controller.js";
import { ImportRepository } from "../../repositories/import.repository.js";
import { ImportRowRepository } from "../../repositories/import-row.repository.js";
import { ExcelParserService } from "../../services/excel-parser.service.js";
import { ImportProcessService } from "../../services/import-process.service.js";
import { ImportService } from "../../services/import.service.js";

const importRepository = new ImportRepository();
const importRowRepository = new ImportRowRepository();
const excelParserService = new ExcelParserService();

const importService = new ImportService(importRepository);

const importProcessService = new ImportProcessService(
  importRepository,
  importRowRepository,
  excelParserService,
);

export const importController = new ImportController(importService);

export const importProcessController = new ImportProcessController(
  importProcessService,
);
