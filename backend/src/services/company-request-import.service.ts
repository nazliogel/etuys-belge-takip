import type { ImportRepository } from "../repositories/import.repository.js";
import type { CompanyRequestExcelParserService } from "./company-request-excel-parser.service.js";
import type { CompanyRequestService } from "./company-request.service.js";

interface CompanyRequestImportError {
  rowNumber: number;
  externalDocumentId: number | null;
  requestNumber: number | null;
  message: string;
}

export class CompanyRequestImportService {
  constructor(
    private readonly parserService: CompanyRequestExcelParserService,
    private readonly companyRequestService: CompanyRequestService,
    private readonly importRepository: ImportRepository,
  ) {}

  async import(input: { file: Express.Multer.File; uploadedById: number }) {
    const { file, uploadedById } = input;

    const batch = await this.importRepository.createBatch({
      fileName: file.originalname,
      storedFileName: file.filename,
      uploadedById,
      isFullSnapshot: false,
      importType: "COMPANY_REQUEST",
    });

    await this.importRepository.updateStatus(batch.id, "PROCESSING");

    try {
      const parsedResult = await this.parserService.parse(file.path);

      let successCount = 0;
      let failedCount = 0;

      const errors: CompanyRequestImportError[] = [];

      for (const row of parsedResult.rows) {
        if (
          row.errorMessage ||
          row.externalDocumentId === null ||
          row.requestNumber === null
        ) {
          failedCount += 1;

          errors.push({
            rowNumber: row.rowNumber,
            externalDocumentId: row.externalDocumentId,
            requestNumber: row.requestNumber,
            message: row.errorMessage ?? "Belge Id veya Talep No bulunamadı.",
          });

          continue;
        }

        try {
          await this.companyRequestService.upsertFromExcel({
            requestNumber: row.requestNumber,
            externalDocumentId: row.externalDocumentId,
            documentNumber: row.documentNumber,
            note: row.note,
            requestType: row.requestType,
            requestStatus: row.requestStatus,
            department: row.department,
            assignedPersonnel: row.assignedPersonnel,
            informationPerson: row.informationPerson,
            applicationDate: row.applicationDate,
            completionDate: row.completionDate,
          });

          successCount += 1;
        } catch (error) {
          failedCount += 1;

          errors.push({
            rowNumber: row.rowNumber,
            externalDocumentId: row.externalDocumentId,
            requestNumber: row.requestNumber,
            message:
              error instanceof Error
                ? error.message
                : "Unknown company request import error.",
          });
        }
      }

      await this.importRepository.updateStatistics(batch.id, {
        totalRowCount: parsedResult.totalRowCount,
        validRowCount: successCount,
        invalidRowCount: failedCount,
      });

      await this.importRepository.updateComparisonStatistics(batch.id, {
        newRowCount: 0,
        changedRowCount: successCount,
        unchangedRowCount: 0,
      });

      await this.importRepository.updateStatus(batch.id, "COMPLETED");

      return {
        batchId: batch.id,
        totalCount: parsedResult.totalRowCount,
        successCount,
        failedCount,
        errors,
      };
    } catch (error) {
      await this.importRepository
        .updateStatus(batch.id, "FAILED")
        .catch(() => undefined);

      throw error;
    }
  }
}
