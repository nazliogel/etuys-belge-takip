import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { ClosedDocumentRepository } from "../repositories/closed-document.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type ClosedDocumentListQuery = {
  page: number;
  limit: number;
  search?: string;
};

export class ClosedDocumentService {
  constructor(
    private readonly closedDocumentRepository: ClosedDocumentRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async getDocuments(
    query: ClosedDocumentListQuery,
    userId: number,
    role: UserRole,
  ) {
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const skip = (page - 1) * limit;

    let companyId: number | undefined;

    if (role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(userId);

      if (!company) {
        throw new AppError("Company is not assigned to this user.", {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "USER_COMPANY_NOT_FOUND",
        });
      }

      companyId = company.id;
    }

    const [documents, totalCount] = await Promise.all([
      this.closedDocumentRepository.findMany({
        skip,
        take: limit,
        search: query.search,
        companyId,
      }),
      this.closedDocumentRepository.count({
        search: query.search,
        companyId,
      }),
    ]);

    return {
      items: documents.map((document) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentStartDate: document.documentStartDate?.toISOString() ?? null,
        documentEndDate: document.documentEndDate?.toISOString() ?? null,
        extensionDate: document.extensionDate?.toISOString() ?? null,
        supportClass: document.supportClass,
        status: document.status,

        company: {
          id: document.company.id,
          externalCompanyId: document.company.externalCompanyId,
          name: document.company.name,
          taxNumber: document.company.taxNumber,
        },

        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      })),
      totalCount,
    };
  }

  async getDocumentById(id: number, userId: number, role: UserRole) {
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
      });
    }

    if (role === "COMPANY") {
      const company = await this.companyRepository.findByUserId(userId);

      if (!company) {
        throw new AppError("Company is not assigned to this user.", {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "USER_COMPANY_NOT_FOUND",
        });
      }

      if (document.companyId !== company.id) {
        throw new AppError(
          "You do not have permission to access this document.",
          {
            statusCode: HTTP_STATUS.FORBIDDEN,
            code: "FORBIDDEN",
          },
        );
      }
    }

    return {
      id: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,
      documentStartDate: document.documentStartDate?.toISOString() ?? null,
      documentEndDate: document.documentEndDate?.toISOString() ?? null,
      extensionDate: document.extensionDate?.toISOString() ?? null,
      supportClass: document.supportClass,
      status: document.status,

      company: {
        id: document.company.id,
        externalCompanyId: document.company.externalCompanyId,
        name: document.company.name,
        taxNumber: document.company.taxNumber,
        processStatus: document.company.processStatus,
        authorizationEndDate:
          document.company.authorization?.authorizationEndDate?.toISOString() ??
          null,
      },

      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}
