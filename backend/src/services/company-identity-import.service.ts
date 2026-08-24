import type { CompanyIdentityExcelParserService } from "./company-identity-excel-parser.service.js";
import type { CompanyIdentityService } from "./company-identity.service.js";

export class CompanyIdentityImportService {
  constructor(
    private readonly parserService: CompanyIdentityExcelParserService,
    private readonly companyIdentityService: CompanyIdentityService,
  ) {}

  async import(filePath: string) {
    const rows = await this.parserService.parse(filePath);

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

    return {
      totalCount: rows.length,
      successCount,
      failedCount,
      errors,
    };
  }
}
