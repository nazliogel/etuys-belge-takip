import type { Prisma } from "../generated/prisma/client.js";

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
        const rawData = row.rawData as Prisma.InputJsonValue;

        if (
          row.errorMessage ||
          row.externalCompanyId === null ||
          row.requestNumber === null
        ) {
          const errorMessage =
            row.errorMessage ?? "Firma ID veya Talep No bulunamadı.";

          failedCount += 1;

          errors.push({
            rowNumber: row.rowNumber,
            externalDocumentId: row.externalDocumentId,
            requestNumber: row.requestNumber,
            message: errorMessage,
          });

          await this.importRepository.createCompanyRequestRow({
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            status: "INVALID",
            externalCompanyId: row.externalCompanyId,
            companyName: row.companyName,
            externalDocumentId: row.externalDocumentId,
            documentNumber: row.documentNumber,
            rawData,
            errorMessage,
          });

          continue;
        }

        try {
          const result = await this.companyRequestService.upsertFromExcel({
            externalCompanyId: row.externalCompanyId,
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

          await this.importRepository.createCompanyRequestRow({
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            status: "CHANGED",
            externalCompanyId: result.company.externalCompanyId,
            companyName: result.company.name,
            externalDocumentId:
              result.document?.externalDocumentId ?? row.externalDocumentId,
            documentNumber:
              result.document?.documentNumber ?? row.documentNumber,
            rawData,
            errorMessage: result.warning,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Bilinmeyen gönderilmiş talep aktarım hatası.";

          failedCount += 1;

          errors.push({
            rowNumber: row.rowNumber,
            externalDocumentId: row.externalDocumentId,
            requestNumber: row.requestNumber,
            message: errorMessage,
          });

          await this.importRepository.createCompanyRequestRow({
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            status: "INVALID",
            externalCompanyId: row.externalCompanyId,
            companyName: row.companyName,
            externalDocumentId: row.externalDocumentId,
            documentNumber: row.documentNumber,
            rawData,
            errorMessage,
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
