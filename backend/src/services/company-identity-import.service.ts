import type { ImportRepository } from "../repositories/import.repository.js";
import type { CompanyIdentityExcelParserService } from "./company-identity-excel-parser.service.js";
import type { CompanyIdentityService } from "./company-identity.service.js";

export class CompanyIdentityImportService {
  constructor(
    private readonly parserService: CompanyIdentityExcelParserService,
    private readonly companyIdentityService: CompanyIdentityService,
    private readonly importRepository: ImportRepository,
  ) {}

  async import(input: { file: Express.Multer.File; uploadedById: number }) {
    const { file, uploadedById } = input;

    const batch = await this.importRepository.createBatch({
      fileName: file.originalname,
      storedFileName: file.filename,
      uploadedById,
      isFullSnapshot: false,
      importType: "COMPANY_IDENTITY",
    });

    await this.importRepository.updateStatus(batch.id, "PROCESSING");

    try {
      const rows = await this.parserService.parse(file.path);

      let successCount = 0;
      let failedCount = 0;

      const errors: {
        rowNumber: number;
        externalCompanyId: number;
        message: string;
      }[] = [];

      for (const row of rows) {
        try {
          await this.companyIdentityService.upsertFromExcel({
            externalCompanyId: row.externalCompanyId,
            investorStatus: row.investorStatus,
            taxNumber: row.taxNumber,
            mersisNumber: row.mersisNumber,
            investorType: row.investorType,
            investorAddress: row.investorAddress,
            registrationDate: row.registrationDate,
            tradeRegistryNumber: row.tradeRegistryNumber,
            nationalId: row.nationalId,
            city: row.city,
            district: row.district,
            mainActivity: row.mainActivity,
          });

          successCount += 1;
        } catch (error) {
          failedCount += 1;

          errors.push({
            rowNumber: row.rowNumber,
            externalCompanyId: row.externalCompanyId,
            message:
              error instanceof Error ? error.message : "Unknown import error.",
          });
        }
      }

      await this.importRepository.updateStatistics(batch.id, {
        totalRowCount: rows.length,
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
        totalCount: rows.length,
        successCount,
        failedCount,
        errors,
      };
    } catch (error) {
      await this.importRepository.updateStatus(batch.id, "FAILED");
      throw error;
    }
  }
}
