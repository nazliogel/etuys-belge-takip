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
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);

  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() - months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return normalizeDate(result);
}

function canApplyForExtension(document: {
  isActive: boolean;
  status: string;
  documentEndDate: Date | null;
  extensionDate: Date | null;
}): boolean {
  if (!document.isActive) {
    return false;
  }

  if (document.status !== "OPEN") {
    return false;
  }

  if (!document.documentEndDate || !document.extensionDate) {
    return false;
  }

  const documentEndDate = normalizeDate(document.documentEndDate);
  const extensionDate = normalizeDate(document.extensionDate);
  const today = normalizeDate(new Date());

  // Belge bitiş ve süre uzatım tarihleri aynıysa
  // süre uzatma zaten yapılmış demektir.
  if (documentEndDate.getTime() === extensionDate.getTime()) {
    return false;
  }

  // Süre uzatma müracatı belge bitişinden 6 ay önce başlar.
  const applicationStartDate = subtractMonths(documentEndDate, 6);

  // Henüz müracat zamanı gelmemiş.
  if (today < applicationStartDate) {
    return false;
  }

  // Süre uzatma için son tarih geçmiş.
  if (today > extensionDate) {
    return false;
  }

  return true;
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

  async getExtensionEligibleDocuments(userId: number, role: UserRole) {
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
      isActive: true,
      status: "OPEN",
      companyId,
    });

    const eligibleDocuments = documents
      .filter((document) => canApplyForExtension(document))
      .map((document) => {
        const documentEndDate = document.documentEndDate!;
        const extensionDate = document.extensionDate!;
        const applicationStartDate = subtractMonths(documentEndDate, 6);

        return {
          id: document.id,
          externalDocumentId: document.externalDocumentId,
          documentNumber: document.documentNumber,
          documentStartDate: document.documentStartDate
            ? formatDateOnly(document.documentStartDate)
            : null,

          documentEndDate: formatDateOnly(documentEndDate),

          extensionDate: formatDateOnly(extensionDate),

          extensionApplicationStartDate: formatDateOnly(applicationStartDate),
          supportClass: document.supportClass,
          isActive: document.isActive,

          company: {
            id: document.company.id,
            externalCompanyId: document.company.externalCompanyId,
            name: document.company.name,
            taxNumber: document.company.taxNumber,
          },
        };
      });

    return {
      items: eligibleDocuments,
      totalCount: eligibleDocuments.length,
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
      investmentType: document.detail?.investmentType ?? null,

      // Detay endpoint'i de aynı durumu döndürür.
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

  async getDocumentProducts(id: number, userId: number, role: UserRole) {
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

    const products = document.detail?.products ?? [];

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      items: products.map((product) => ({
        id: product.id,
        productName: product.productName,
        us97Code: product.us97Code,
        us97Description: product.us97Description,
        naceCode: product.naceCode,
        naceDescription: product.naceDescription,
        unit: product.unit,
        existingCapacity: product.existingCapacity?.toString() ?? null,
        additionalCapacity: product.additionalCapacity?.toString() ?? null,
        totalCapacity: product.totalCapacity?.toString() ?? null,
      })),
    };
  }

  async getDocumentSupports(id: number, userId: number, role: UserRole) {
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

    const supports = document.detail?.supports ?? [];

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      items: supports.map((support) => ({
        id: support.id,
        supportType: support.supportType,
        supportTypeCode: support.supportTypeCode,
        supportRate: support.supportRate,
        supportRateCode: support.supportRateCode,
        supportDescription: support.supportDescription,
      })),
    };
  }
  async getDocumentFinancialInfo(id: number, userId: number, role: UserRole) {
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

    const financialInfo = document.detail?.financialInfo ?? null;

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      financialInfo: financialInfo
        ? {
            id: financialInfo.id,
            externalFinancialInfoId: financialInfo.externalFinancialInfoId,

            totalInvestment: financialInfo.totalInvestment?.toString() ?? null,
            totalFinancing: financialInfo.totalFinancing?.toString() ?? null,
            equity: financialInfo.equity?.toString() ?? null,
            equityRate: financialInfo.equityRate?.toString() ?? null,
            foreignResources:
              financialInfo.foreignResources?.toString() ?? null,
            foreignResourcesRate:
              financialInfo.foreignResourcesRate?.toString() ?? null,

            tlLoan: financialInfo.tlLoan?.toString() ?? null,
            foreignCurrencyLoan:
              financialInfo.foreignCurrencyLoan?.toString() ?? null,
            foreignCurrencyIndexedLoan:
              financialInfo.foreignCurrencyIndexedLoan?.toString() ?? null,
            domesticLoan: financialInfo.domesticLoan?.toString() ?? null,
            foreignLoan: financialInfo.foreignLoan?.toString() ?? null,
            otherLoans: financialInfo.otherLoans?.toString() ?? null,
            financialLeasing:
              financialInfo.financialLeasing?.toString() ?? null,

            domesticMachinery:
              financialInfo.domesticMachinery?.toString() ?? null,
            importedMachinery:
              financialInfo.importedMachinery?.toString() ?? null,
            totalMachineryExpenses:
              financialInfo.totalMachineryExpenses?.toString() ?? null,
            newMachinery: financialInfo.newMachinery?.toString() ?? null,
            usedMachinery: financialInfo.usedMachinery?.toString() ?? null,
            importedMachineryUsd:
              financialInfo.importedMachineryUsd?.toString() ?? null,

            totalBuildingConstructionExpenses:
              financialInfo.totalBuildingConstructionExpenses?.toString() ??
              null,
            mainBuilding: financialInfo.mainBuilding?.toString() ?? null,
            auxiliaryEnterpriseEquipment:
              financialInfo.auxiliaryEnterpriseEquipment?.toString() ?? null,
            auxiliaryFacilities:
              financialInfo.auxiliaryFacilities?.toString() ?? null,

            otherInvestmentExpenses:
              financialInfo.otherInvestmentExpenses?.toString() ?? null,
            landCost: financialInfo.landCost?.toString() ?? null,
            landArrangement: financialInfo.landArrangement?.toString() ?? null,
            importCustoms: financialInfo.importCustoms?.toString() ?? null,
            transportInsurance:
              financialInfo.transportInsurance?.toString() ?? null,
            assembly: financialInfo.assembly?.toString() ?? null,
            studyProject: financialInfo.studyProject?.toString() ?? null,
            otherExpenses: financialInfo.otherExpenses?.toString() ?? null,
            generalExpenses: financialInfo.generalExpenses?.toString() ?? null,

            fixedInvestmentUsd:
              financialInfo.fixedInvestmentUsd?.toString() ?? null,
            fixedInvestmentCpi:
              financialInfo.fixedInvestmentCpi?.toString() ?? null,
            fixedInvestmentUsdFirstCopy:
              financialInfo.fixedInvestmentUsdFirstCopy?.toString() ?? null,
            fixedInvestmentCpiFirstCopy:
              financialInfo.fixedInvestmentCpiFirstCopy?.toString() ?? null,
          }
        : null,
    };
  }
}
