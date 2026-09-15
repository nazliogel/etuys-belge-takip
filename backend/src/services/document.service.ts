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
function getEffectiveEndDate(document: {
  documentEndDate: Date | null;
  extensionDate: Date | null;
}): Date | null {
  if (!document.documentEndDate && !document.extensionDate) {
    return null;
  }

  if (!document.documentEndDate) {
    return document.extensionDate
      ? normalizeDate(document.extensionDate)
      : null;
  }

  const documentEndDate = normalizeDate(document.documentEndDate);

  if (!document.extensionDate) {
    return documentEndDate;
  }

  const extensionDate = normalizeDate(document.extensionDate);

  // Tarihler farklıysa uzatma yapılmıştır.
  // Bu durumda uzatılmış tarih esas alınır.
  if (documentEndDate.getTime() !== extensionDate.getTime()) {
    return extensionDate;
  }

  // Tarihler eşitse uzatma yapılmamıştır.
  return documentEndDate;
}

function calculateDocumentStatus(document: {
  isActive: boolean;
  documentEndDate: Date | null;
  extensionDate: Date | null;
}): CalculatedDocumentStatus {
  if (!document.isActive) {
    return "INACTIVE";
  }

  const effectiveEndDate = getEffectiveEndDate(document);

  if (!effectiveEndDate) {
    return "ACTIVE";
  }

  const today = normalizeDate(new Date());

  if (effectiveEndDate < today) {
    return "EXPIRED";
  }

  const sixMonthsLater = new Date(today);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  if (effectiveEndDate <= sixMonthsLater) {
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

  // Tarihler farklıysa süre uzatma listesine alma.
  if (documentEndDate.getTime() !== extensionDate.getTime()) {
    return false;
  }

  // Süre uzatma müracaatı belge bitişinden 6 ay önce başlar.
  const applicationStartDate = subtractMonths(documentEndDate, 6);

  // Henüz müracaat zamanı gelmemiş.
  if (today < applicationStartDate) {
    return false;
  }

  // Bitiş tarihi ile süre uzatım tarihi eşitse uzatma yapılmamıştır.
  // Belge OPEN ve aktif kaldığı sürece süre uzatma listesinde kalır.
  return true;
}

function canApplyForClosure(document: {
  isActive: boolean;
  status: string;
  documentEndDate: Date | null;
  extensionDate: Date | null;
}): boolean {
  if (!document.isActive || document.status !== "OPEN") {
    return false;
  }

  if (!document.documentEndDate || !document.extensionDate) {
    return false;
  }

  const documentEndDate = normalizeDate(document.documentEndDate);
  const extensionDate = normalizeDate(document.extensionDate);
  const today = normalizeDate(new Date());

  // Tarihler eşitse süre uzatımı yapılmamıştır.
  if (documentEndDate.getTime() === extensionDate.getTime()) {
    return false;
  }

  // Uzatılan süre henüz bitmediyse belge aktiftir.
  if (extensionDate >= today) {
    return false;
  }

  // Tarihler farklı ve uzatılan süre geçmişse kapatma yapılacaktır.
  return true;
}

function hasActiveCompanyAuthorization(document: {
  company: {
    authorization: {
      authorizationEndDate: Date | null;
    } | null;
  };
}): boolean {
  const authorizationEndDate =
    document.company.authorization?.authorizationEndDate;

  if (!authorizationEndDate) {
    return false;
  }

  const today = normalizeDate(new Date());
  const normalizedAuthorizationEndDate = normalizeDate(authorizationEndDate);

  return normalizedAuthorizationEndDate >= today;
}

export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  private async getAuthorizedCompany(userId: number) {
    const company = await this.companyRepository.findByUserId(userId);

    if (!company) {
      throw new AppError("Company is not assigned to this user.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "USER_COMPANY_NOT_FOUND",
      });
    }

    const authorizationEndDate =
      company.authorization?.authorizationEndDate ?? null;

    const today = normalizeDate(new Date());

    if (!authorizationEndDate || normalizeDate(authorizationEndDate) < today) {
      throw new AppError("Firmanın yetki süresi dolmuştur.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "COMPANY_AUTHORIZATION_EXPIRED",
      });
    }

    return company;
  }

  async getDocuments(query: DocumentListQuery, userId: number, role: UserRole) {
    let companyId: number | undefined;

    const consultantUserId = role === "OPERATION" ? userId : undefined;

    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);
      companyId = company.id;
    }

    const requestedIsActive =
      query.isActive ?? (query.status === "INACTIVE" ? false : true);

    const documents = await this.documentRepository.findMany({
      search: query.search,
      isActive: requestedIsActive,
      companyId,
      consultantUserId,
    });
    const authorizedDocumentIds = new Set(
      documents
        .filter((document) => hasActiveCompanyAuthorization(document))
        .map((document) => document.id),
    );

    const extensionEligibleIds = new Set(
      documents
        .filter(
          (document) =>
            hasActiveCompanyAuthorization(document) &&
            canApplyForExtension(document),
        )
        .map((document) => document.id),
    );

    const closureEligibleIds = new Set(
      documents
        .filter(
          (document) =>
            hasActiveCompanyAuthorization(document) &&
            canApplyForClosure(document),
        )
        .map((document) => document.id),
    );

    const isEligibleElsewhere = (documentId: number) =>
      extensionEligibleIds.has(documentId) ||
      closureEligibleIds.has(documentId);
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
        consultant: document.company.consultant,
        authorizationEndDate:
          document.company.authorization?.authorizationEndDate?.toISOString() ??
          null,
      },

      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    }));

    const filteredItems = query.status
      ? items.filter((item) => {
          const eligibleElsewhere = isEligibleElsewhere(item.id);

          if (
            item.status !== "INACTIVE" &&
            !authorizedDocumentIds.has(item.id)
          ) {
            return false;
          }
          // Aktif:
          // Süre Uzatma ve Kapatma listesine girmeyen,
          // süresi dolmamış açık belgeler.
          if (query.status === "ACTIVE") {
            return (
              authorizedDocumentIds.has(item.id) &&
              (item.status === "ACTIVE" || item.status === "EXPIRING") &&
              !eligibleElsewhere
            );
          }

          if (query.status === "EXPIRING") {
            return (
              authorizedDocumentIds.has(item.id) &&
              item.status === "EXPIRING" &&
              !eligibleElsewhere
            );
          }
          // Süresi dolmuş olsa bile Süre Uzatma veya Kapatma grubundaysa

          if (query.status === "EXPIRED") {
            return item.status === "EXPIRED" && !eligibleElsewhere;
          }

          return item.status === query.status;
        })
      : items;

    filteredItems.sort((a, b) => {
      const getEffectiveTime = (item: {
        documentEndDate: string | null;
        extensionDate: string | null;
      }) => {
        if (!item.documentEndDate && !item.extensionDate) {
          return Number.MAX_SAFE_INTEGER;
        }

        if (!item.documentEndDate) {
          return item.extensionDate
            ? new Date(item.extensionDate).getTime()
            : Number.MAX_SAFE_INTEGER;
        }

        if (!item.extensionDate) {
          return new Date(item.documentEndDate).getTime();
        }

        const documentEndTime = new Date(item.documentEndDate).getTime();
        const extensionTime = new Date(item.extensionDate).getTime();

        return documentEndTime !== extensionTime
          ? extensionTime
          : documentEndTime;
      };

      const aTime = getEffectiveTime(a);
      const bTime = getEffectiveTime(b);

      if (query.status === "EXPIRED") {
        // En yakın zamanda süresi dolan üstte
        return bTime - aTime;
      }

      if (query.status === "ACTIVE" || query.status === "EXPIRING") {
        // En yakın bitecek belge üstte
        return aTime - bTime;
      }

      return 0;
    });

    const totalCount = filteredItems.length;
    const totalPages = Math.max(Math.ceil(totalCount / query.limit), 1);
    const safePage = Math.min(query.page, totalPages);
    const startIndex = (safePage - 1) * query.limit;
    const paginatedItems = filteredItems.slice(
      startIndex,
      startIndex + query.limit,
    );
    const summary = {
      total: items.filter(
        (item) =>
          item.status === "INACTIVE" || authorizedDocumentIds.has(item.id),
      ).length,

      active: items.filter(
        (item) =>
          authorizedDocumentIds.has(item.id) &&
          item.status === "ACTIVE" &&
          !isEligibleElsewhere(item.id),
      ).length,

      expiring: items.filter(
        (item) =>
          authorizedDocumentIds.has(item.id) &&
          item.status === "EXPIRING" &&
          !isEligibleElsewhere(item.id),
      ).length,

      expired: items.filter(
        (item) => item.status === "EXPIRED" && !isEligibleElsewhere(item.id),
      ).length,

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

    const consultantUserId = role === "OPERATION" ? userId : undefined;
    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);
      companyId = company.id;
    }
    const documents = await this.documentRepository.findMany({
      isActive: true,
      status: "OPEN",
      companyId,
      consultantUserId,
    });

    const eligibleDocuments = documents
      .filter(
        (document) =>
          hasActiveCompanyAuthorization(document) &&
          canApplyForExtension(document),
      )
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
            consultant: document.company.consultant,
            authorizationEndDate:
              document.company.authorization?.authorizationEndDate?.toISOString() ??
              null,
          },
        };
      });
    eligibleDocuments.sort((a, b) => {
      if (!a.documentEndDate) return 1;
      if (!b.documentEndDate) return -1;

      const today = Date.now();

      const aDistance = Math.abs(new Date(a.documentEndDate).getTime() - today);

      const bDistance = Math.abs(new Date(b.documentEndDate).getTime() - today);

      return aDistance - bDistance;
    });
    return {
      items: eligibleDocuments,
      totalCount: eligibleDocuments.length,
    };
  }

  async getClosureEligibleDocuments(userId: number, role: UserRole) {
    let companyId: number | undefined;

    const consultantUserId = role === "OPERATION" ? userId : undefined;

    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);
      companyId = company.id;
    }

    const documents = await this.documentRepository.findMany({
      isActive: true,
      status: "OPEN",
      companyId,
      consultantUserId,
    });

    const eligibleDocuments = documents
      .filter(
        (document) =>
          hasActiveCompanyAuthorization(document) &&
          canApplyForClosure(document),
      )
      .map((document) => {
        const documentEndDate = document.documentEndDate!;
        const extensionDate = document.extensionDate!;
        const applicationStartDate = subtractMonths(extensionDate, 6);

        return {
          id: document.id,
          externalDocumentId: document.externalDocumentId,
          documentNumber: document.documentNumber,

          documentStartDate: document.documentStartDate
            ? formatDateOnly(document.documentStartDate)
            : null,

          documentEndDate: formatDateOnly(documentEndDate),
          extensionDate: formatDateOnly(extensionDate),

          closureApplicationStartDate: formatDateOnly(applicationStartDate),

          supportClass: document.supportClass,
          isActive: document.isActive,

          company: {
            id: document.company.id,
            externalCompanyId: document.company.externalCompanyId,
            name: document.company.name,
            taxNumber: document.company.taxNumber,
            consultant: document.company.consultant,
            authorizationEndDate:
              document.company.authorization?.authorizationEndDate?.toISOString() ??
              null,
          },
        };
      });

    eligibleDocuments.sort((a, b) => {
      const aTime = new Date(a.extensionDate).getTime();
      const bTime = new Date(b.extensionDate).getTime();

      return aTime - bTime;
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
      const company = await this.getAuthorizedCompany(userId);

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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
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
        consultant: document.company.consultant,
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
      const company = await this.getAuthorizedCompany(userId);
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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
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
      const company = await this.getAuthorizedCompany(userId);

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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
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
      const company = await this.getAuthorizedCompany(userId);

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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
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
  async getDocumentDomesticMachines(
    id: number,
    userId: number,
    role: UserRole,
  ) {
    const document = await this.documentRepository.findById(id);

    if (!document) {
      throw new AppError("Document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);
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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const domesticMachines = document.detail?.domesticMachines ?? [];

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      items: domesticMachines.map((machine) => ({
        id: machine.id,

        externalMachineId: machine.externalMachineId,
        sequenceNumber: machine.sequenceNumber,

        name: machine.name,
        quantity: machine.quantity?.toString() ?? null,
        unitPriceTl: machine.unitPriceTl?.toString() ?? null,
        totalTl: machine.totalTl?.toString() ?? null,
        unit: machine.unit,

        vatExemption: machine.vatExemption,
        vatExemptionDescription: machine.vatExemptionDescription,

        transferRealizedValue:
          machine.transferRealizedValue?.toString() ?? null,
        transferRealizedQuantity:
          machine.transferRealizedQuantity?.toString() ?? null,
        transferOutgoingValue:
          machine.transferOutgoingValue?.toString() ?? null,
        transferOutgoingQuantity:
          machine.transferOutgoingQuantity?.toString() ?? null,

        leasingOutgoingValue: machine.leasingOutgoingValue?.toString() ?? null,
        leasingOutgoingQuantity:
          machine.leasingOutgoingQuantity?.toString() ?? null,
        leasingPermittedValue:
          machine.leasingPermittedValue?.toString() ?? null,
        leasingPermittedQuantity:
          machine.leasingPermittedQuantity?.toString() ?? null,

        invoiceRealizedValue: machine.invoiceRealizedValue?.toString() ?? null,
        invoiceRealizedQuantity:
          machine.invoiceRealizedQuantity?.toString() ?? null,

        customsRealizedValue: machine.customsRealizedValue?.toString() ?? null,
        customsRealizedQuantity:
          machine.customsRealizedQuantity?.toString() ?? null,
        customsPermittedValue:
          machine.customsPermittedValue?.toString() ?? null,
        customsPermittedQuantity:
          machine.customsPermittedQuantity?.toString() ?? null,

        exportOutgoingValue: machine.exportOutgoingValue?.toString() ?? null,
        exportOutgoingQuantity:
          machine.exportOutgoingQuantity?.toString() ?? null,
        exportPermittedValue: machine.exportPermittedValue?.toString() ?? null,
        exportPermittedQuantity:
          machine.exportPermittedQuantity?.toString() ?? null,

        financialLeasingRealizedValue:
          machine.financialLeasingRealizedValue?.toString() ?? null,
        financialLeasingRealizedQuantity:
          machine.financialLeasingRealizedQuantity?.toString() ?? null,
        financialLeasingPermittedValue:
          machine.financialLeasingPermittedValue?.toString() ?? null,
        financialLeasingPermittedQuantity:
          machine.financialLeasingPermittedQuantity?.toString() ?? null,

        saleOutgoingValue: machine.saleOutgoingValue?.toString() ?? null,
        saleOutgoingQuantity: machine.saleOutgoingQuantity?.toString() ?? null,
        salePermittedValue: machine.salePermittedValue?.toString() ?? null,
        salePermittedQuantity:
          machine.salePermittedQuantity?.toString() ?? null,
        saleRealizedQuantity: machine.saleRealizedQuantity?.toString() ?? null,
        saleRealizedValue: machine.saleRealizedValue?.toString() ?? null,

        gtipCode: machine.gtipCode,
        gtipDescription: machine.gtipDescription,

        transferDocumentNumber: machine.transferDocumentNumber,
        transferIncomingQuantity:
          machine.transferIncomingQuantity?.toString() ?? null,
        transferIncomingAmount:
          machine.transferIncomingAmount?.toString() ?? null,

        barcode: machine.barcode,
        sellerTaxNumber: machine.sellerTaxNumber,
        sellerEmail: machine.sellerEmail,
        financialLeasingCompany: machine.financialLeasingCompany,
        machineryEquipmentType: machine.machineryEquipmentType,
      })),
    };
  }
  async getDocumentImportedMachines(
    id: number,
    userId: number,
    role: UserRole,
  ) {
    const document = await this.documentRepository.findById(id);

    if (!document) {
      throw new AppError("Document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);

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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const importedMachines = document.detail?.importedMachines ?? [];

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      items: importedMachines.map((machine) => ({
        id: machine.id,

        externalMachineId: machine.externalMachineId,
        sequenceNumber: machine.sequenceNumber,

        name: machine.name,
        quantity: machine.quantity?.toString() ?? null,
        unit: machine.unit,
        machineryEquipmentType: machine.machineryEquipmentType,

        gtipCode: machine.gtipCode,
        gtipDescription: machine.gtipDescription,

        vatExemption: machine.vatExemption,
        vatExemptionDescription: machine.vatExemptionDescription,

        customsTaxExemption: machine.customsTaxExemption,
        customsTaxExemptionDescription: machine.customsTaxExemptionDescription,

        usedMachine: machine.usedMachine,
        isVehicle: machine.isVehicle,
        isCkd: machine.isCkd,

        totalFobUsd: machine.totalFobUsd?.toString() ?? null,
        totalFobTl: machine.totalFobTl?.toString() ?? null,
        totalCifTl: machine.totalCifTl?.toString() ?? null,

        originCurrencyFob: machine.originCurrencyFob,
        originCurrencyFobAmount:
          machine.originCurrencyFobAmount?.toString() ?? null,

        customsRealizedValue: machine.customsRealizedValue?.toString() ?? null,
        customsRealizedQuantity:
          machine.customsRealizedQuantity?.toString() ?? null,
        customsPermittedValue:
          machine.customsPermittedValue?.toString() ?? null,
        customsPermittedQuantity:
          machine.customsPermittedQuantity?.toString() ?? null,

        transferRealizedValue:
          machine.transferRealizedValue?.toString() ?? null,
        transferRealizedQuantity:
          machine.transferRealizedQuantity?.toString() ?? null,
        transferOutgoingValue:
          machine.transferOutgoingValue?.toString() ?? null,
        transferOutgoingQuantity:
          machine.transferOutgoingQuantity?.toString() ?? null,

        transferDocumentNumber: machine.transferDocumentNumber,
        transferIncomingQuantity:
          machine.transferIncomingQuantity?.toString() ?? null,
        transferIncomingAmount:
          machine.transferIncomingAmount?.toString() ?? null,

        saleOutgoingValue: machine.saleOutgoingValue?.toString() ?? null,
        saleOutgoingQuantity: machine.saleOutgoingQuantity?.toString() ?? null,
        salePermittedValue: machine.salePermittedValue?.toString() ?? null,
        salePermittedQuantity:
          machine.salePermittedQuantity?.toString() ?? null,

        leasingOutgoingValue: machine.leasingOutgoingValue?.toString() ?? null,
        leasingOutgoingQuantity:
          machine.leasingOutgoingQuantity?.toString() ?? null,
        leasingPermittedValue:
          machine.leasingPermittedValue?.toString() ?? null,
        leasingPermittedQuantity:
          machine.leasingPermittedQuantity?.toString() ?? null,

        exportOutgoingValue: machine.exportOutgoingValue?.toString() ?? null,
        exportOutgoingQuantity:
          machine.exportOutgoingQuantity?.toString() ?? null,
        exportPermittedValue: machine.exportPermittedValue?.toString() ?? null,
        exportPermittedQuantity:
          machine.exportPermittedQuantity?.toString() ?? null,

        invoiceRealizedValue: machine.invoiceRealizedValue?.toString() ?? null,
        invoiceRealizedQuantity:
          machine.invoiceRealizedQuantity?.toString() ?? null,

        financialLeasingRealizedValue:
          machine.financialLeasingRealizedValue?.toString() ?? null,
        financialLeasingRealizedQuantity:
          machine.financialLeasingRealizedQuantity?.toString() ?? null,
        financialLeasingPermittedValue:
          machine.financialLeasingPermittedValue?.toString() ?? null,
        financialLeasingPermittedQuantity:
          machine.financialLeasingPermittedQuantity?.toString() ?? null,

        financialLeasingCompanyName: machine.financialLeasingCompanyName,
      })),
    };
  }
  async getDocumentSpecialConditions(
    id: number,
    userId: number,
    role: UserRole,
  ) {
    const document = await this.documentRepository.findById(id);

    if (!document) {
      throw new AppError("Document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "DOCUMENT_NOT_FOUND",
      });
    }

    if (role === "COMPANY") {
      const company = await this.getAuthorizedCompany(userId);

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

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw new AppError(
        "You do not have permission to access this document.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "FORBIDDEN",
        },
      );
    }

    const specialConditions = document.detail?.specialConditions ?? [];

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      items: specialConditions.map((condition) => ({
        id: condition.id,
        conditionCode: condition.conditionCode,
        conditionName: condition.conditionName,
        description: condition.description,
      })),
    };
  }
}
