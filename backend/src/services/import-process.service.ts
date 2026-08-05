import type { Prisma } from "../generated/prisma/client.js";

import { AppError } from "../errors/app-error.js";
import type { ImportRepository } from "../repositories/import.repository.js";
import type { ImportRowRepository } from "../repositories/import-row.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import type { ExcelParserService } from "./excel-parser.service.js";

export class ImportProcessService {
  constructor(
    private readonly importRepository: ImportRepository,
    private readonly importRowRepository: ImportRowRepository,
    private readonly excelParser: ExcelParserService,
  ) {}

  async process(importBatchId: number) {
    const batch = await this.importRepository.findById(importBatchId);

    if (!batch) {
      throw new AppError("Import batch not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "IMPORT_BATCH_NOT_FOUND",
      });
    }

    if (!batch.storedFileName) {
      throw new AppError("Stored import file was not found.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "IMPORT_FILE_NOT_FOUND",
      });
    }

    if (batch.status === "PROCESSING") {
      throw new AppError("Import batch is already being processed.", {
        statusCode: HTTP_STATUS.CONFLICT,
        code: "IMPORT_ALREADY_PROCESSING",
      });
    }

    if (batch.status === "COMPLETED") {
      throw new AppError("Completed import batch cannot be processed again.", {
        statusCode: HTTP_STATUS.CONFLICT,
        code: "IMPORT_ALREADY_COMPLETED",
      });
    }

    await this.importRepository.updateStatus(importBatchId, "PROCESSING");

    try {
      const parsedResult = await this.excelParser.parse(batch.storedFileName);

      await this.importRowRepository.deleteByImportBatchId(importBatchId);

      const importRows: Prisma.ImportRowCreateManyInput[] =
        parsedResult.rows.map((row) => ({
          importBatchId,
          rowNumber: row.rowNumber,
          status: row.errorMessage ? "INVALID" : "PENDING",
          externalCompanyId: row.externalCompanyId,
          companyName: row.companyName,
          taxNumber: row.taxNumber,
          authorizationEndDate: row.authorizationEndDate,
          externalDocumentId: row.externalDocumentId,
          documentNumber: row.documentNumber,
          documentStartDate: row.documentStartDate,
          documentEndDate: row.documentEndDate,
          extensionDate: row.extensionDate,
          supportClass: row.supportClass,
          processStatus: row.processStatus,
          rawData: row.rawData as Prisma.InputJsonValue,
          errorMessage: row.errorMessage,
        }));

      if (importRows.length > 0) {
        await this.importRowRepository.createMany(importRows);
      }

      await this.importRepository.updateStatistics(importBatchId, {
        totalRowCount: parsedResult.totalRowCount,
        validRowCount: parsedResult.validRowCount,
        invalidRowCount: parsedResult.invalidRowCount,
      });

      await this.importRepository.updateStatus(
        importBatchId,
        "WAITING_APPROVAL",
      );

      return this.importRepository.findById(importBatchId);
    } catch (error) {
      await this.importRepository
        .updateStatus(importBatchId, "FAILED")
        .catch(() => undefined);

      throw error;
    }
  }
}
