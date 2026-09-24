import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { DocumentRepository } from "../repositories/document.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import {
  addMonths,
  computeDocumentStatus,
  EXPIRING_WINDOW_MONTHS,
  toDateOnly,
  todayInIstanbul,
  type DateOnly,
  type DisplayStatus,
  type DocumentStatusResult,
} from "./document-status.js";

type CalculatedDocumentStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "INACTIVE";

type DocumentListQuery = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean | "all";
  status?: CalculatedDocumentStatus;
  companyId?: number;
};

type StatusSource = {
  status: "OPEN" | "CLOSED" | "CANCELLED";
  isActive: boolean;
  documentEndDate: Date | null;
  extensionDate: Date | null;
  company: { authorization: { authorizationEndDate: Date | null } | null };
};

type CompanySource = {
  id: number;
  externalCompanyId: number;
  name: string;
  taxNumber: string;
  consultant: string | null;
  authorization: { authorizationEndDate: Date | null } | null;
};

const FAR_FUTURE: DateOnly = "9999-12-31";

/**
 * Frontend'in şu an kullandığı eski `status` alanı (sadece tarihe bakar).
 * Frontend `displayStatus`'a geçince silinecek.
 */
function toLegacyStatus(
  isActive: boolean,
  result: DocumentStatusResult,
  today: DateOnly,
): CalculatedDocumentStatus {
  if (!isActive) return "INACTIVE";
  const end = result.effectiveEndDate;
  if (!end) return "ACTIVE";
  if (end < today) return "EXPIRED";
  if (end <= addMonths(today, EXPIRING_WINDOW_MONTHS)) return "EXPIRING";
  return "ACTIVE";
}

function evaluate<T extends StatusSource>(document: T, today: DateOnly) {
  const result = computeDocumentStatus(
    {
      status: document.status,
      isActive: document.isActive,
      documentEndDate: document.documentEndDate,
      extensionDate: document.extensionDate,
      authorizationEndDate:
        document.company.authorization?.authorizationEndDate ?? null,
    },
    today,
  );

  return {
    document,
    ...result,
    legacyStatus: toLegacyStatus(document.isActive, result, today),
  };
}

function toCompanyDto(company: CompanySource) {
  return {
    id: company.id,
    externalCompanyId: company.externalCompanyId,
    name: company.name,
    taxNumber: company.taxNumber,
    consultant: company.consultant,
    authorizationEndDate:
      company.authorization?.authorizationEndDate?.toISOString() ?? null,
  };
}

function daysFrom(date: DateOnly, today: DateOnly): number {
  return Math.abs(Date.parse(date) - Date.parse(today)) / 86_400_000;
}

function forbiddenError() {
  return new AppError("You do not have permission to access this document.", {
    statusCode: HTTP_STATUS.FORBIDDEN,
    code: "FORBIDDEN",
  });
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

    const authorizationEndDate = toDateOnly(
      company.authorization?.authorizationEndDate,
    );

    if (!authorizationEndDate || authorizationEndDate < todayInIstanbul()) {
      throw new AppError("Firmanın yetki süresi dolmuştur.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "COMPANY_AUTHORIZATION_EXPIRED",
      });
    }

    return company;
  }

  private async resolveScope(
    userId: number,
    role: UserRole,
    requestedCompanyId?: number,
  ) {
    if (role === "COMPANY") {
      // Firma kullanıcısı başka firma isteyemez; her zaman kendi firması.
      const company = await this.getAuthorizedCompany(userId);
      return { companyId: company.id, consultantUserId: undefined };
    }

    return {
      companyId: requestedCompanyId,
      // OPERATION için uzman filtresi her zaman geçerli kalır:
      // başka uzmanın firmasını isterse boş liste döner.
      consultantUserId: role === "OPERATION" ? userId : undefined,
    };
  }

  /** Belgeyi getirir ve kullanıcının erişim yetkisini kontrol eder (tek yer) */
  /** Belgeyi getirir ve kullanıcının erişim yetkisini kontrol eder (tek yer) */
  private async getAccessibleDocument(
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
      if (document.companyId !== company.id) throw forbiddenError();
    }

    if (role === "OPERATION" && document.company.consultantUserId !== userId) {
      throw forbiddenError();
    }

    return document;
  }

  async getDocuments(query: DocumentListQuery, userId: number, role: UserRole) {
    const scope = await this.resolveScope(userId, role, query.companyId);
    const today = todayInIstanbul();

    const requestedIsActive =
      query.isActive === "all"
        ? undefined // filtre yok: aktif + pasif hepsi
        : (query.isActive ?? (query.status === "INACTIVE" ? false : true));

    const documents = await this.documentRepository.findMany({
      search: query.search,
      isActive: requestedIsActive,
      ...scope,
    });

    const rows = documents.map((document) => evaluate(document, today));
    type Row = (typeof rows)[number];

    const matchesStatus = (row: Row): boolean => {
      switch (query.status) {
        case "ACTIVE":
          return (
            row.displayStatus === "ACTIVE" || row.displayStatus === "EXPIRING"
          );
        case "EXPIRING":
          return row.displayStatus === "EXPIRING";
        case "EXPIRED":
          return row.displayStatus === "EXPIRED";
        case "INACTIVE":
          return row.legacyStatus === "INACTIVE";
        default:
          return true;
      }
    };

    const filteredRows = query.status ? rows.filter(matchesStatus) : rows;

    // EXPIRED: en son biten üstte. ACTIVE/EXPIRING: en yakın bitecek üstte.
    if (query.status && query.status !== "INACTIVE") {
      const direction = query.status === "EXPIRED" ? -1 : 1;
      filteredRows.sort(
        (a, b) =>
          direction *
          (a.effectiveEndDate ?? FAR_FUTURE).localeCompare(
            b.effectiveEndDate ?? FAR_FUTURE,
          ),
      );
    }

    const totalCount = filteredRows.length;
    const totalPages = Math.max(Math.ceil(totalCount / query.limit), 1);
    const safePage = Math.min(query.page, totalPages);
    const startIndex = (safePage - 1) * query.limit;

    const items = filteredRows
      .slice(startIndex, startIndex + query.limit)
      .map(({ document, displayStatus, legacyStatus }) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentStartDate: document.documentStartDate?.toISOString() ?? null,
        documentEndDate: document.documentEndDate?.toISOString() ?? null,
        extensionDate: document.extensionDate?.toISOString() ?? null,
        supportClass: document.supportClass,
        isActive: document.isActive,
        status: legacyStatus, // eski alan, frontend geçişine kadar
        displayStatus, // yeni alan, tek doğru kaynak
        company: toCompanyDto(document.company),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      }));

    const count = (status: DisplayStatus) =>
      rows.filter((row) => row.displayStatus === status).length;

    const summary = {
      total: rows.length,
      active: count("ACTIVE"),
      expiring: count("EXPIRING"),
      expired: count("EXPIRED"), // artık yetki kontrolü de yapılıyor (hata düzeltmesi)
      inactive: rows.filter((row) => row.legacyStatus === "INACTIVE").length,

      // yeni alanlar
      extensionEligible: count("EXTENSION_ELIGIBLE"),
      closureEligible: count("CLOSURE_ELIGIBLE"),
      authorizationExpired: count("AUTHORIZATION_EXPIRED"),
    };

    return {
      items,
      totalCount,
      page: safePage,
      limit: query.limit,
      totalPages,
      summary,
    };
  }

  async getExtensionEligibleDocuments(userId: number, role: UserRole) {
    const scope = await this.resolveScope(userId, role);
    const today = todayInIstanbul();

    const documents = await this.documentRepository.findMany({
      isActive: true,
      status: "OPEN",
      ...scope,
    });

    const items = documents
      .map((document) => evaluate(document, today))
      .filter((row) => row.displayStatus === "EXTENSION_ELIGIBLE")
      .map(({ document, extensionApplicationStartDate }) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentStartDate: toDateOnly(document.documentStartDate),
        documentEndDate: toDateOnly(document.documentEndDate)!,
        extensionDate: toDateOnly(document.extensionDate)!,
        extensionApplicationStartDate: extensionApplicationStartDate!,
        supportClass: document.supportClass,
        isActive: document.isActive,
        company: toCompanyDto(document.company),
      }));

    // Bitiş tarihi bugüne en yakın olan üstte
    items.sort(
      (a, b) =>
        daysFrom(a.documentEndDate, today) - daysFrom(b.documentEndDate, today),
    );

    return { items, totalCount: items.length };
  }

  async getClosureEligibleDocuments(userId: number, role: UserRole) {
    const scope = await this.resolveScope(userId, role);
    const today = todayInIstanbul();

    const documents = await this.documentRepository.findMany({
      isActive: true,
      status: "OPEN",
      ...scope,
    });

    const items = documents
      .map((document) => evaluate(document, today))
      .filter((row) => row.displayStatus === "CLOSURE_ELIGIBLE")
      .map(({ document, closureApplicationStartDate }) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentStartDate: toDateOnly(document.documentStartDate),
        documentEndDate: toDateOnly(document.documentEndDate)!,
        extensionDate: toDateOnly(document.extensionDate)!,
        closureApplicationStartDate: closureApplicationStartDate!,
        supportClass: document.supportClass,
        isActive: document.isActive,
        company: toCompanyDto(document.company),
      }));

    // Uzatılan süresi en önce biten üstte
    items.sort((a, b) => a.extensionDate.localeCompare(b.extensionDate));

    return { items, totalCount: items.length };
  }

  async getDocumentById(id: number, userId: number, role: UserRole) {
    const document = await this.getAccessibleDocument(id, userId, role);
    const row = evaluate(document, todayInIstanbul());

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
      status: row.legacyStatus,
      displayStatus: row.displayStatus,
      effectiveEndDate: row.effectiveEndDate,
      company: {
        ...toCompanyDto(document.company),
        processStatus: document.company.processStatus,
      },
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  async getDocumentProducts(id: number, userId: number, role: UserRole) {
    const document = await this.getAccessibleDocument(id, userId, role);

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
    const document = await this.getAccessibleDocument(id, userId, role);

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
    const document = await this.getAccessibleDocument(id, userId, role);
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
    const document = await this.getAccessibleDocument(id, userId, role);

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
    const document = await this.getAccessibleDocument(id, userId, role);
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
    const document = await this.getAccessibleDocument(id, userId, role);

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
