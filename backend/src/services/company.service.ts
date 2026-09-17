import { AppError } from "../errors/app-error.js";
import {
  getConsultantEmail,
  getConsultantPhone,
} from "../constants/consultant-phones.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanyListResponse,
  UpdateCompanyInput,
} from "../types/company.js";
import type { UserRole } from "../generated/prisma/client.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async getCompanies(
    query: CompanyListQuery,
    userId: number,
    role: UserRole,
  ): Promise<CompanyListResponse> {
    if (role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(userId);

      if (!company) {
        throw new AppError("Company is not assigned to this user.", {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "USER_COMPANY_NOT_FOUND",
        });
      }

      return {
        items: [
          {
            id: company.id,
            externalCompanyId: company.externalCompanyId,
            name: company.name,
            taxNumber: company.taxNumber,
            processStatus: company.processStatus,
            consultant: company.consultant,
            consultantPhone: getConsultantPhone(company.consultant),
            consultantEmail: getConsultantEmail(company.consultant),
            isActive: company.isActive,
            authorizationEndDate:
              company.authorization?.authorizationEndDate?.toISOString() ??
              null,
            documentCount: company._count.documents,
            createdAt: company.createdAt.toISOString(),
            updatedAt: company.updatedAt.toISOString(),
          },
        ],
        totalCount: 1,
      };
    }

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
          consultant: company.consultant,
          consultantPhone: getConsultantPhone(company.consultant),
          consultantEmail: getConsultantEmail(company.consultant),
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
  async getAuthorizationRequiredCompanies(userId: number, role: UserRole) {
    if (role === "COMPANY") {
      throw new AppError(
        "You do not have permission to view authorization operations.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const consultantUserId = role === "OPERATION" ? userId : undefined;

    const companies = await this.companyRepository.findAuthorizationRequired({
      consultantUserId,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = companies.map((company) => {
      const authorizationEndDate =
        company.authorization?.authorizationEndDate ?? null;

      let authorizationStatus: "MISSING" | "EXPIRED" | "EXPIRING";

      if (!authorizationEndDate) {
        authorizationStatus = "MISSING";
      } else {
        const normalizedEndDate = new Date(authorizationEndDate);
        normalizedEndDate.setHours(0, 0, 0, 0);

        authorizationStatus =
          normalizedEndDate < today ? "EXPIRED" : "EXPIRING";
      }

      return {
        id: company.id,
        externalCompanyId: company.externalCompanyId,
        name: company.name,
        taxNumber: company.taxNumber,
        processStatus: company.processStatus,
        consultant: company.consultant,
        consultantPhone: getConsultantPhone(company.consultant),
        consultantEmail: getConsultantEmail(company.consultant),
        isActive: company.isActive,
        authorizationEndDate: authorizationEndDate?.toISOString() ?? null,
        authorizationStatus,
        documentCount: company._count.documents,

        documents: company.documents.map((document) => ({
          id: document.id,
          externalDocumentId: document.externalDocumentId,
          documentNumber: document.documentNumber,
        })),

        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      };
    });
    items.sort((a, b) => {
      // Yetki tarihi olmayan firmalar en altta gösterilir
      if (!a.authorizationEndDate && !b.authorizationEndDate) {
        return a.name.localeCompare(b.name, "tr");
      }

      if (!a.authorizationEndDate) return 1;
      if (!b.authorizationEndDate) return -1;

      // Önce henüz bitmemiş, en yakın tarihte bitecek yetkiler
      if (
        a.authorizationStatus === "EXPIRING" &&
        b.authorizationStatus === "EXPIRED"
      ) {
        return -1;
      }

      if (
        a.authorizationStatus === "EXPIRED" &&
        b.authorizationStatus === "EXPIRING"
      ) {
        return 1;
      }

      const aTime = new Date(a.authorizationEndDate).getTime();
      const bTime = new Date(b.authorizationEndDate).getTime();

      if (a.authorizationStatus === "EXPIRING") {
        // En yakın bitecek tarih önce
        return aTime - bTime;
      }

      // Süresi bitenlerde en yakın zamanda bitmiş olan önce
      return bTime - aTime;
    });

    return {
      items,
      totalCount: items.length,
    };
  }
  async getCompanyById(
    id: number,
    userId: number,
    role: UserRole,
  ): Promise<CompanyDetail> {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    if (role === "COMPANY") {
      const ownCompany = await this.companyRepository.findByUserId(userId);

      if (!ownCompany || ownCompany.id !== id) {
        throw new AppError(
          "You do not have permission to access this company.",
          {
            statusCode: HTTP_STATUS.FORBIDDEN,
            code: "FORBIDDEN",
          },
        );
      }
    }

    return {
      id: company.id,
      externalCompanyId: company.externalCompanyId,
      name: company.name,
      taxNumber: company.taxNumber,
      processStatus: company.processStatus,
      consultant: company.consultant,
      consultantPhone: getConsultantPhone(company.consultant),
      consultantEmail: getConsultantEmail(company.consultant),
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
        status: document.status,
        isActive: document.isActive,
      })),
    };
  }

  async updateCompany(
    id: number,
    payload: UpdateCompanyInput,
    role: UserRole,
  ): Promise<CompanyDetail> {
    if (role !== "ADMIN") {
      throw new AppError("You do not have permission to update companies.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "FORBIDDEN",
      });
    }

    const existingCompany = await this.companyRepository.findById(id);

    if (!existingCompany) {
      throw new AppError("Company not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOT_FOUND",
      });
    }

    const company = await this.companyRepository.update(id, payload);

    return {
      id: company.id,
      externalCompanyId: company.externalCompanyId,
      name: company.name,
      taxNumber: company.taxNumber,
      processStatus: company.processStatus,
      consultant: company.consultant,
      consultantPhone: getConsultantPhone(company.consultant),
      consultantEmail: getConsultantEmail(company.consultant),
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
        status: document.status,
        isActive: document.isActive,
      })),
    };
  }
}
