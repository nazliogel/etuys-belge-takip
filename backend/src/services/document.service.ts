import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type CalculatedDocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type DocumentListQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  status?: CalculatedDocumentStatus;
};
function calculateDocumentStatus(document: {
  isActive: boolean;
  documentEndDate: Date | null;
}): CalculatedDocumentStatus {
  if (!document.isActive) {
    return "INACTIVE";
  }

  if (!document.documentEndDate) {
    return "ACTIVE";
  }

  const endDate = new Date(document.documentEndDate);
  const today = new Date();

  endDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Bitiş tarihi geçmişse
  if (endDate < today) {
    return "EXPIRED";
  }

  // Bugünden tam 6 ay sonrası
  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  // Bitiş tarihi önümüzdeki 6 ay içindeyse
  if (endDate <= sixMonthsLater) {
    return "EXPIRING";
  }

  return "ACTIVE";
}

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async getDocuments(query: DocumentListQuery, userId: number, role: UserRole) {
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

    const documents = await this.documentRepository.findMany({
      search: query.search,
      isActive: query.isActive,
      companyId,
    });

    const items = documents.map((document) => ({
      id: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,
      documentStartDate: document.documentStartDate?.toISOString() ?? null,
      documentEndDate: document.documentEndDate?.toISOString() ?? null,
      extensionDate: document.extensionDate?.toISOString() ?? null,
      supportClass: document.supportClass,
      isActive: document.isActive,

      // Backend tarafından hesaplanan durum
      status: calculateDocumentStatus(document),

      company: {
        id: document.company.id,
        externalCompanyId: document.company.externalCompanyId,
        name: document.company.name,
        taxNumber: document.company.taxNumber,
      },

      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    }));
    const filteredItems = query.status
      ? items.filter((item) => item.status === query.status)
      : items;

    const totalCount = filteredItems.length;
    const totalPages = Math.max(Math.ceil(totalCount / query.limit), 1);
    const safePage = Math.min(query.page, totalPages);
    const startIndex = (safePage - 1) * query.limit;
    const paginatedItems = filteredItems.slice(
      startIndex,
      startIndex + query.limit,
    );
    const summary = {
      total: items.length,

      active: items.filter((item) => item.status === "ACTIVE").length,

      expiring: items.filter((item) => item.status === "EXPIRING").length,

      expired: items.filter((item) => item.status === "EXPIRED").length,

      inactive: items.filter((item) => item.status === "INACTIVE").length,
    };

    return {
      items: paginatedItems,
      totalCount,
      page: safePage,
      limit: query.limit,
      totalPages,
      summary,
    };
  }

  async getDocumentById(id: number, userId: number, role: UserRole) {
    const document = await this.documentRepository.findById(id);

    if (!document) {
      throw new AppError("Document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "DOCUMENT_NOT_FOUND",
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
      isActive: document.isActive,

      // Detay endpoint’i de aynı durumu döndürür.
      status: calculateDocumentStatus(document),

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
