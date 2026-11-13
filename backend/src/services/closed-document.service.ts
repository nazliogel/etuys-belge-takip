import { prisma } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../generated/prisma/client.js";
import type { ClosedDocumentRepository } from "../repositories/closed-document.repository.js";
import type { CompanyRepository } from "../repositories/company.repository.js";
import { ImportedRealizationRepository } from "../repositories/imported-realization.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

const importedRealizationRepository = new ImportedRealizationRepository();

type ClosedDocumentListQuery = {
  page: number;
  limit: number;
  search?: string;
  companyId?: number;
  onlyAssigned?: boolean;
};

export class ClosedDocumentService {
  constructor(
    private readonly closedDocumentRepository: ClosedDocumentRepository,
    private readonly companyRepository: CompanyRepository,
  ) { }

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedAuthorizationEndDate = authorizationEndDate
      ? new Date(authorizationEndDate)
      : null;

    normalizedAuthorizationEndDate?.setHours(0, 0, 0, 0);

    if (
      !normalizedAuthorizationEndDate ||
      normalizedAuthorizationEndDate < today
    ) {
      throw new AppError("Firmanın yetki süresi dolmuştur.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "COMPANY_AUTHORIZATION_EXPIRED",
      });
    }

    return company;
  }

  async getDocuments(
    query: ClosedDocumentListQuery,
    userId: number,
    role: UserRole,
  ) {
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 1000);
    const skip = (page - 1) * limit;

    // Admin/uzman belirli bir firmayı isteyebilir.
    let companyId: number | undefined = query.companyId;

    if (role === "COMPANY") {
      // Firma kullanıcısı her zaman sadece kendi firmasını görür, isteği yok sayılır.
      const company = await this.getAuthorizedCompany(userId);

      companyId = company.id;
    }

    const consultantUserId =
      role === "OPERATION" && query.onlyAssigned ? userId : undefined;

    const [documents, totalCount] = await Promise.all([
      this.closedDocumentRepository.findMany({
        skip,
        take: limit,
        search: query.search,
        companyId,
        consultantUserId,
      }),
      this.closedDocumentRepository.count({
        search: query.search,
        companyId,
        consultantUserId,
      }),
    ]);

    return {
      items: documents.map((document) => ({
        id: document.id,
        externalDocumentId: document.externalDocumentId,
        documentNumber: document.documentNumber,
        documentDate: document.documentDate?.toISOString() ?? null,
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
          consultant: document.company.consultant ?? null,
          authorizationEndDate:
            document.company.authorization?.authorizationEndDate?.toISOString() ??
            null,
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

    return {
      id: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,
      documentDate: document.documentDate?.toISOString() ?? null,
      documentStartDate: document.documentStartDate?.toISOString() ?? null,
      documentEndDate: document.documentEndDate?.toISOString() ?? null,
      extensionDate: document.extensionDate?.toISOString() ?? null,
      investmentType: document.detail?.investmentType ?? null,
      supportClass: document.supportClass,
      status: document.status,

      // Belgenin künye bilgisi (yatırım yeri); firma kimliğinden bağımsızdır.
      city: document.city ?? null,
      district: document.district ?? null,
      address: document.address ?? null,
      osbName: document.osbName ?? null,

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
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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

    const financialInfo = document.detail?.financialInfo ?? null;

    const realizationInfo = document.detail?.realizationInfo ?? null;

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,

      realizationInfo: realizationInfo
        ? {
          id: realizationInfo.id,
          landRealization:
            realizationInfo.landRealization?.toString() ?? null,
          totalLandRealization:
            realizationInfo.totalLandRealization?.toString() ?? null,
          mainBuildingRealization:
            realizationInfo.mainBuildingRealization?.toString() ?? null,
          auxiliaryFacilitiesRealization:
            realizationInfo.auxiliaryFacilitiesRealization?.toString() ??
            null,
          administrativeBuildingsRealization:
            realizationInfo.administrativeBuildingsRealization?.toString() ??
            null,
          undergroundGalleriesRealization:
            realizationInfo.undergroundGalleriesRealization?.toString() ??
            null,
          totalBuildingRealization:
            realizationInfo.totalBuildingRealization?.toString() ?? null,
          auxiliaryMachineryRealization:
            realizationInfo.auxiliaryMachineryRealization?.toString() ?? null,
          importCustomsRealization:
            realizationInfo.importCustomsRealization?.toString() ?? null,
          transportInsuranceRealization:
            realizationInfo.transportInsuranceRealization?.toString() ?? null,
          assemblyRealization:
            realizationInfo.assemblyRealization?.toString() ?? null,
          studyProjectRealization:
            realizationInfo.studyProjectRealization?.toString() ?? null,
          otherExpensesRealization:
            realizationInfo.otherExpensesRealization?.toString() ?? null,
          expenseDocumentRealization:
            realizationInfo.expenseDocumentRealization?.toString() ?? null,
          totalOtherInvestmentRealization:
            realizationInfo.totalOtherInvestmentRealization?.toString() ??
            null,
          domesticRealization:
            realizationInfo.domesticRealization?.toString() ?? null,
          importedRealization:
            realizationInfo.importedRealization?.toString() ?? null,
          exchangeDifferenceRealization:
            realizationInfo.exchangeDifferenceRealization?.toString() ?? null,
          totalRealizedAmount:
            realizationInfo.totalRealizedAmount?.toString() ?? null,
          updatedTotalLandRealization:
            realizationInfo.updatedTotalLandRealization?.toString() ?? null,
          updatedTotalBuildingRealization:
            realizationInfo.updatedTotalBuildingRealization?.toString() ??
            null,
          updatedTotalOtherInvestmentRealization:
            realizationInfo.updatedTotalOtherInvestmentRealization?.toString() ??
            null,
        }
        : null,

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
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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

    const domesticMachines = document.detail?.domesticMachines ?? [];

    // Yerli fatura gerçekleşmeleri açık belge detayına bağlı tutuluyor.
    // Kapalı belgenin E-TUYS Belge ID'siyle karşılık gelen açık belgeyi bul.
    const openDocument = await prisma.incentiveDocument.findFirst({
      where: {
        externalDocumentId: document.externalDocumentId,
        companyId: document.companyId,
      },
      select: {
        detail: {
          select: {
            id: true,
          },
        },
      },
    });

    const domesticRealizations = openDocument?.detail?.id
      ? await prisma.documentDomesticRealization.findMany({
        where: {
          detailId: openDocument.detail.id,
        },
        orderBy: {
          externalInvoiceLineId: "asc",
        },
        select: {
          externalMachineId: true,
          externalInvoiceLineId: true,
          sellerName: true,
          invoiceNumber: true,
          invoiceDate: true,
          invoiceValue: true,
        },
      })
      : [];

    const realizationsByMachine = new Map<
      number,
      {
        externalInvoiceLineId: number;
        sellerName: string | null;
        invoiceNumber: string | null;
        invoiceDate: string | null;
        invoiceValue: string | null;
      }[]
    >();

    for (const realization of domesticRealizations) {
      // Açık ve kapalı belgelerin yerel makine ID'leri farklı olabilir.
      // Bu yüzden E-TUYS Yerli Makine ID ile eşleştiriyoruz.
      const machine = domesticMachines.find(
        (item) =>
          realization.externalMachineId !== null &&
          item.externalMachineId === realization.externalMachineId,
      );

      if (!machine) continue;

      const items = realizationsByMachine.get(machine.id) ?? [];

      items.push({
        externalInvoiceLineId: realization.externalInvoiceLineId,
        sellerName: realization.sellerName,
        invoiceNumber: realization.invoiceNumber,
        invoiceDate: realization.invoiceDate?.toISOString() ?? null,
        invoiceValue: realization.invoiceValue?.toString() ?? null,
      });

      realizationsByMachine.set(machine.id, items);
    }

    return {
      documentId: document.id,
      externalDocumentId: document.externalDocumentId,
      documentNumber: document.documentNumber,
      items: domesticMachines.map((machine) => ({
        id: machine.id,
        externalMachineId: machine.externalMachineId,
        sequenceNumber: machine.sequenceNumber,

        realizations: realizationsByMachine.get(machine.id) ?? [],

        name: machine.name,
        quantity: machine.quantity?.toString() ?? null,
        unitPriceTl: machine.unitPriceTl?.toString() ?? null,
        totalTl: machine.totalTl?.toString() ?? null,
        unit: machine.unit,

        vatExemption: machine.vatExemption,

        invoiceRealizedValue: machine.invoiceRealizedValue?.toString() ?? null,
        invoiceRealizedQuantity:
          machine.invoiceRealizedQuantity?.toString() ?? null,

        gtipCode: machine.gtipCode,
        gtipDescription: machine.gtipDescription,

        barcode: machine.barcode,
        sellerTaxNumber: machine.sellerTaxNumber,
        sellerEmail: machine.sellerEmail,
        machineryEquipmentType: machine.machineryEquipmentType,
      })),
    };
  }

  async getDocumentImportedMachines(
    id: number,
    userId: number,
    role: UserRole,
  ) {
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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

    const importedMachines = document.detail?.importedMachines ?? [];

    const realizationsByMachine =
      await importedRealizationRepository.findGroupedByMachine(
        document.detail?.id,
        importedMachines,
      );

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

        realizations: realizationsByMachine.get(machine.id) ?? [],
      })),
    };
  }

  async getDocumentSpecialConditions(
    id: number,
    userId: number,
    role: UserRole,
  ) {
    const document = await this.closedDocumentRepository.findById(id);

    if (!document) {
      throw new AppError("Closed document not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "CLOSED_DOCUMENT_NOT_FOUND",
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
