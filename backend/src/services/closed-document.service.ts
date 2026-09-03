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
      investmentType: document.detail?.investmentType ?? null,
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
  async getDocumentProducts(id: number, userId: number, role: UserRole) {
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
        customsTaxExemption: machine.customsTaxExemption,

        usedMachine: machine.usedMachine,
        isVehicle: machine.isVehicle,
        isCkd: machine.isCkd,

        totalFobUsd: machine.totalFobUsd?.toString() ?? null,
        totalFobTl: machine.totalFobTl?.toString() ?? null,
        totalCifTl: machine.totalCifTl?.toString() ?? null,

        originCurrencyFob: machine.originCurrencyFob,
        originCurrencyFobAmount:
          machine.originCurrencyFobAmount?.toString() ?? null,
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
