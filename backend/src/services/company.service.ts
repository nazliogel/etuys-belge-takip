import { AppError } from "../errors/app-error.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanyListResponse,
  UpdateCompanyInput,
} from "../types/company.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async getCompanies(query: CompanyListQuery): Promise<CompanyListResponse> {
    const page = query.page;
    const limit = query.limit;

    const skip = (page - 1) * limit;

    const [companies, totalCount] = await Promise.all([
      this.companyRepository.findMany({
        skip,
        take: limit,
        search: query.search,
        isActive: query.isActive,
      }),
      this.companyRepository.count({
        search: query.search,
        isActive: query.isActive,
      }),
    ]);

    return {
      items: companies.map(
        (company): CompanyListItem => ({
          id: company.id,
          externalCompanyId: company.externalCompanyId,
          name: company.name,
          taxNumber: company.taxNumber,
          processStatus: company.processStatus,
          isActive: company.isActive,

          authorizationEndDate:
            company.authorization?.authorizationEndDate?.toISOString() ?? null,

          documentCount: company._count.documents,

          createdAt: company.createdAt.toISOString(),
          updatedAt: company.updatedAt.toISOString(),
        }),
      ),
      totalCount,
    };
  }

  async getCompanyById(id: number): Promise<CompanyDetail> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    return {
      id: company.id,
      externalCompanyId: company.externalCompanyId,
      name: company.name,
      taxNumber: company.taxNumber,
      processStatus: company.processStatus,
      isActive: company.isActive,

      authorizationEndDate:
        company.authorization?.authorizationEndDate?.toISOString() ?? null,

      documentCount: company.documents.length,

      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),

      documents: company.documents.map((document) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentStartDate: document.documentStartDate?.toISOString() ?? null,
        documentEndDate: document.documentEndDate?.toISOString() ?? null,
        extensionDate: document.extensionDate?.toISOString() ?? null,
        supportClass: document.supportClass,
        isActive: document.isActive,
      })),
    };
  }

  async updateCompany(id: number, payload: UpdateCompanyInput) {
    return this.companyRepository.update(id, payload);
  }
}
