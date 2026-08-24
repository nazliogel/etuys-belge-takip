import { AppError } from "../errors/app-error.js";
import type { CompanyIdentityRepository } from "../repositories/company-identity.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyIdentityService {
  constructor(
    private readonly identityRepository: CompanyIdentityRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async getByCompanyId(companyId: number) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    const identity = await this.identityRepository.findByCompanyId(companyId);

    return {
      companyId: company.id,
      externalCompanyId: company.externalCompanyId,

      investorStatus: identity?.investorStatus ?? null,

      // Vergi numarası Company tablosundan geliyor.
      taxNumber: company.taxNumber,

      mersisNumber: identity?.mersisNumber ?? null,
      investorType: identity?.investorType ?? null,
      investorAddress: identity?.investorAddress ?? null,
      registrationDate: identity?.registrationDate ?? null,
      tradeRegistryNumber: identity?.tradeRegistryNumber ?? null,
      nationalId: identity?.nationalId ?? null,
      city: identity?.city ?? null,
      district: identity?.district ?? null,
      mainActivity: identity?.mainActivity ?? null,

      // Kullanıcının değiştirebildiği tek künye alanı
      consultant: company.consultant ?? null,
    };
  }

  async updateConsultant(companyId: number, consultant: string) {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    return this.companyRepository.updateConsultant(companyId, consultant);
  }

  async upsertFromExcel(params: {
    externalCompanyId: number;
    investorStatus?: string | null;
    taxNumber?: string | null;
    mersisNumber?: string | null;
    investorType?: string | null;
    investorAddress?: string | null;
    registrationDate?: Date | null;
    tradeRegistryNumber?: string | null;
    nationalId?: string | null;
    city?: string | null;
    district?: string | null;
    mainActivity?: string | null;
  }) {
    const company = await this.identityRepository.findByExternalCompanyId(
      params.externalCompanyId,
    );

    if (!company) {
      throw new AppError(
        `Company not found for Firma ID: ${params.externalCompanyId}`,
        {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "COMPANY_NOT_FOUND",
        },
      );
    }
    if (params.taxNumber) {
      await this.companyRepository.updateTaxNumber(
        company.id,
        params.taxNumber,
      );
    }

    return this.identityRepository.upsert({
      companyId: company.id,
      investorStatus: params.investorStatus,
      mersisNumber: params.mersisNumber,
      investorType: params.investorType,
      investorAddress: params.investorAddress,
      registrationDate: params.registrationDate,
      tradeRegistryNumber: params.tradeRegistryNumber,
      nationalId: params.nationalId,
      city: params.city,
      district: params.district,
      mainActivity: params.mainActivity,
    });
  }
}
