import { AppError } from "../errors/app-error.js";
import type { CompanyIdentityRepository } from "../repositories/company-identity.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type { UserRepository } from "../repositories/user.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyIdentityService {
  constructor(
    private readonly identityRepository: CompanyIdentityRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
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

    const normalizedConsultant = consultant.trim();

    let consultantUserId: number | null = null;

    if (normalizedConsultant) {
      const parts = normalizedConsultant.split(/\s+/);

      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");

      if (firstName && lastName) {
        const consultantUser =
          await this.userRepository.findConsultantByFullName(
            firstName,
            lastName,
          );

        consultantUserId = consultantUser?.id ?? null;
      }
    }

    return this.companyRepository.updateConsultant(
      companyId,
      normalizedConsultant,
      consultantUserId,
    );
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
