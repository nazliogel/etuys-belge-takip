import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

import {
  DocumentDetailExcelParserService,
  type ParsedDocumentDetailResult,
} from "./document-detail-excel-parser.service.js";

type DocumentDetailImportInput = {
  filePath: string;
  fileName: string;
  storedFileName?: string | null;
  uploadedById: number;
};

type DocumentDetailImportError = {
  sheetName: string;
  rowNumber: number;
  externalDocumentId: number;
  documentNumber: string | null;
  message: string;
};

type DocumentDetailImportResult = {
  batchId: number;
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  newRowCount: number;
  changedRowCount: number;
  unchangedRowCount: number;
  errors: DocumentDetailImportError[];
};

type ParsedRow =
  | ParsedDocumentDetailResult["documents"][number]
  | ParsedDocumentDetailResult["products"][number]
  | ParsedDocumentDetailResult["supports"][number]
  | ParsedDocumentDetailResult["financialInfos"][number]
  | ParsedDocumentDetailResult["domesticMachines"][number]
  | ParsedDocumentDetailResult["importedMachines"][number]
  | ParsedDocumentDetailResult["specialConditions"][number];

function toJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function flattenRows(parsed: ParsedDocumentDetailResult): ParsedRow[] {
  return [
    ...parsed.documents,
    ...parsed.products,
    ...parsed.supports,
    ...parsed.financialInfos,
    ...parsed.domesticMachines,
    ...parsed.importedMachines,
    ...parsed.specialConditions,
  ];
}

export class DocumentDetailImportService {
  private readonly parser = new DocumentDetailExcelParserService();

  async import(
    input: DocumentDetailImportInput,
  ): Promise<DocumentDetailImportResult> {
    const batch = await prisma.importBatch.create({
      data: {
        fileName: input.fileName,
        storedFileName: input.storedFileName ?? null,
        uploadedById: input.uploadedById,
        importType: "DOCUMENT_DETAIL",
        status: "PROCESSING",
        isFullSnapshot: false,
      },
    });

    try {
      const parsed = await this.parser.parse(input.filePath);

      const allRows = flattenRows(parsed);

      const externalDocumentIds = [
        ...new Set(allRows.map((row) => row.externalDocumentId)),
      ];

      const [existingDocuments, existingClosedDocuments] = await Promise.all([
        prisma.incentiveDocument.findMany({
          where: {
            externalDocumentId: {
              in: externalDocumentIds,
            },
          },
          select: {
            id: true,
            companyId: true,
            externalDocumentId: true,
            detail: {
              select: {
                id: true,
              },
            },
          },
        }),

        prisma.closedIncentiveDocument.findMany({
          where: {
            externalDocumentId: {
              in: externalDocumentIds,
            },
          },
          select: {
            id: true,
            companyId: true,
            externalDocumentId: true,
            detail: {
              select: {
                id: true,
              },
            },
          },
        }),
      ]);

      const openDocumentMap = new Map(
        existingDocuments.map((document) => [
          document.externalDocumentId,
          document,
        ]),
      );

      const closedDocumentMap = new Map(
        existingClosedDocuments.map((document) => [
          document.externalDocumentId,
          document,
        ]),
      );

      function hasDocument(externalDocumentId: number) {
        return (
          openDocumentMap.has(externalDocumentId) ||
          closedDocumentMap.has(externalDocumentId)
        );
      }

      const validRows = allRows.filter((row) =>
        hasDocument(row.externalDocumentId),
      );

      const invalidRows = allRows.filter(
        (row) => !hasDocument(row.externalDocumentId),
      );

      const errors: DocumentDetailImportError[] = invalidRows.map((row) => ({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        externalDocumentId: row.externalDocumentId,
        documentNumber: row.documentNumber ?? null,
        message: `Belge ID ${row.externalDocumentId} sistemde bulunamadı.`,
      }));

      if (allRows.length > 0) {
        await prisma.importRow.createMany({
          data: allRows.map((row) => {
            const openDocument = openDocumentMap.get(row.externalDocumentId);
            const closedDocument = closedDocumentMap.get(
              row.externalDocumentId,
            );

            const foundDocument = openDocument ?? closedDocument;

            return {
              importBatchId: batch.id,
              sheetName: row.sheetName,
              rowNumber: row.rowNumber,

              status: foundDocument ? "PENDING" : "INVALID",

              externalCompanyId: row.externalCompanyId ?? null,

              companyName: row.companyName ?? null,

              externalDocumentId: row.externalDocumentId,

              documentNumber: row.documentNumber ?? null,

              companyId: foundDocument?.companyId ?? null,

              // ImportRow modeli şu an sadece IncentiveDocument'a bağlı.
              // Bu yüzden kapalı belgede documentId null kalacak.
              documentId: openDocument?.id ?? null,

              rawData: toJson(row.rawData),

              errorMessage: foundDocument
                ? null
                : `Belge ID ${row.externalDocumentId} sistemde bulunamadı.`,
            };
          }),
        });
      }

      const documentIdsToProcess = [
        ...new Set(validRows.map((row) => row.externalDocumentId)),
      ];

      let newRowCount = 0;
      let changedRowCount = 0;

      for (const externalDocumentId of documentIdsToProcess) {
        const openDocument = openDocumentMap.get(externalDocumentId);
        const closedDocument = closedDocumentMap.get(externalDocumentId);

        if (!openDocument && !closedDocument) {
          continue;
        }

        const document = openDocument ?? closedDocument;

        if (!document) {
          continue;
        }

        const documentRow = parsed.documents.find(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const products = parsed.products.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const supports = parsed.supports.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const financialInfos = parsed.financialInfos.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const domesticMachines = parsed.domesticMachines.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const importedMachines = parsed.importedMachines.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const specialConditions = parsed.specialConditions.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const isNew = !document.detail;

        await prisma.$transaction(async (tx) => {
          const detail = openDocument
            ? await tx.documentDetail.upsert({
                where: {
                  documentId: openDocument.id,
                },

                create: {
                  documentId: openDocument.id,
                  closedDocumentId: null,
                  investmentType: documentRow?.investmentType ?? null,
                },

                update: {
                  investmentType: documentRow?.investmentType ?? null,
                },
              })
            : await tx.documentDetail.upsert({
                where: {
                  closedDocumentId: closedDocument!.id,
                },

                create: {
                  documentId: null,
                  closedDocumentId: closedDocument!.id,
                  investmentType: documentRow?.investmentType ?? null,
                },

                update: {
                  investmentType: documentRow?.investmentType ?? null,
                },
              });

          await Promise.all([
            tx.documentProduct.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),

            tx.documentSupport.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),

            tx.documentFinancialInfo.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),

            tx.documentDomesticMachine.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),

            tx.documentImportedMachine.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),

            tx.documentSpecialCondition.deleteMany({
              where: {
                detailId: detail.id,
              },
            }),
          ]);

          if (products.length > 0) {
            await tx.documentProduct.createMany({
              data: products.map((row) => ({
                detailId: detail.id,

                productName: row.productName,
                us97Code: row.us97Code,
                us97Description: row.us97Description,

                naceCode: row.naceCode,
                naceDescription: row.naceDescription,

                unit: row.unit,

                existingCapacity: row.existingCapacity,

                additionalCapacity: row.additionalCapacity,

                totalCapacity: row.totalCapacity,
              })),
            });
          }

          if (supports.length > 0) {
            await tx.documentSupport.createMany({
              data: supports.map((row) => ({
                detailId: detail.id,

                supportType: row.supportType,
                supportTypeCode: row.supportTypeCode,

                supportRate: row.supportRate,
                supportRateCode: row.supportRateCode,

                supportDescription: row.supportDescription,
              })),
            });
          }

          const financialInfo = financialInfos[0];

          if (financialInfo) {
            await tx.documentFinancialInfo.create({
              data: {
                detailId: detail.id,

                externalFinancialInfoId: financialInfo.externalFinancialInfoId,

                totalInvestment: financialInfo.totalInvestment,

                totalFinancing: financialInfo.totalFinancing,

                equity: financialInfo.equity,

                equityRate: financialInfo.equityRate,

                foreignResources: financialInfo.foreignResources,

                foreignResourcesRate: financialInfo.foreignResourcesRate,

                tlLoan: financialInfo.tlLoan,

                foreignCurrencyLoan: financialInfo.foreignCurrencyLoan,

                foreignCurrencyIndexedLoan:
                  financialInfo.foreignCurrencyIndexedLoan,

                domesticLoan: financialInfo.domesticLoan,

                foreignLoan: financialInfo.foreignLoan,

                otherLoans: financialInfo.otherLoans,

                financialLeasing: financialInfo.financialLeasing,

                domesticMachinery: financialInfo.domesticMachinery,

                importedMachinery: financialInfo.importedMachinery,

                totalMachineryExpenses: financialInfo.totalMachineryExpenses,

                newMachinery: financialInfo.newMachinery,

                usedMachinery: financialInfo.usedMachinery,

                importedMachineryUsd: financialInfo.importedMachineryUsd,

                totalBuildingConstructionExpenses:
                  financialInfo.totalBuildingConstructionExpenses,

                mainBuilding: financialInfo.mainBuilding,

                auxiliaryEnterpriseEquipment:
                  financialInfo.auxiliaryEnterpriseEquipment,

                auxiliaryFacilities: financialInfo.auxiliaryFacilities,

                otherInvestmentExpenses: financialInfo.otherInvestmentExpenses,

                landCost: financialInfo.landCost,

                landArrangement: financialInfo.landArrangement,

                importCustoms: financialInfo.importCustoms,

                transportInsurance: financialInfo.transportInsurance,

                assembly: financialInfo.assembly,

                studyProject: financialInfo.studyProject,

                otherExpenses: financialInfo.otherExpenses,

                generalExpenses: financialInfo.generalExpenses,

                fixedInvestmentUsd: financialInfo.fixedInvestmentUsd,

                fixedInvestmentCpi: financialInfo.fixedInvestmentCpi,

                fixedInvestmentUsdFirstCopy:
                  financialInfo.fixedInvestmentUsdFirstCopy,

                fixedInvestmentCpiFirstCopy:
                  financialInfo.fixedInvestmentCpiFirstCopy,

                rawData: toJson(financialInfo.rawData),
              },
            });
          }

          if (domesticMachines.length > 0) {
            await tx.documentDomesticMachine.createMany({
              data: domesticMachines.map((row) => ({
                detailId: detail.id,

                externalMachineId: row.externalMachineId,
                sequenceNumber: row.sequenceNumber,

                name: row.name,
                quantity: row.quantity,
                unitPriceTl: row.unitPriceTl,
                totalTl: row.totalTl,
                unit: row.unit,

                vatExemption: row.vatExemption,
                vatExemptionDescription: row.vatExemptionDescription,

                transferRealizedValue: row.transferRealizedValue,
                transferRealizedQuantity: row.transferRealizedQuantity,
                transferOutgoingValue: row.transferOutgoingValue,
                transferOutgoingQuantity: row.transferOutgoingQuantity,

                leasingOutgoingValue: row.leasingOutgoingValue,
                leasingOutgoingQuantity: row.leasingOutgoingQuantity,
                leasingPermittedValue: row.leasingPermittedValue,
                leasingPermittedQuantity: row.leasingPermittedQuantity,

                invoiceRealizedValue: row.invoiceRealizedValue,
                invoiceRealizedQuantity: row.invoiceRealizedQuantity,

                customsRealizedValue: row.customsRealizedValue,
                customsRealizedQuantity: row.customsRealizedQuantity,
                customsPermittedValue: row.customsPermittedValue,
                customsPermittedQuantity: row.customsPermittedQuantity,

                exportOutgoingValue: row.exportOutgoingValue,
                exportOutgoingQuantity: row.exportOutgoingQuantity,
                exportPermittedValue: row.exportPermittedValue,
                exportPermittedQuantity: row.exportPermittedQuantity,

                financialLeasingRealizedValue:
                  row.financialLeasingRealizedValue,
                financialLeasingRealizedQuantity:
                  row.financialLeasingRealizedQuantity,
                financialLeasingPermittedValue:
                  row.financialLeasingPermittedValue,
                financialLeasingPermittedQuantity:
                  row.financialLeasingPermittedQuantity,

                saleOutgoingValue: row.saleOutgoingValue,
                saleOutgoingQuantity: row.saleOutgoingQuantity,
                salePermittedValue: row.salePermittedValue,
                salePermittedQuantity: row.salePermittedQuantity,
                saleRealizedQuantity: row.saleRealizedQuantity,
                saleRealizedValue: row.saleRealizedValue,

                gtipCode: row.gtipCode,
                gtipDescription: row.gtipDescription,

                transferDocumentNumber: row.transferDocumentNumber,
                transferIncomingQuantity: row.transferIncomingQuantity,
                transferIncomingAmount: row.transferIncomingAmount,

                barcode: row.barcode,
                sellerTaxNumber: row.sellerTaxNumber,
                sellerEmail: row.sellerEmail,
                financialLeasingCompany: row.financialLeasingCompany,
                machineryEquipmentType: row.machineryEquipmentType,

                rawData: toJson(row.rawData),
              })),
            });
          }

          if (importedMachines.length > 0) {
            await tx.documentImportedMachine.createMany({
              data: importedMachines.map((row) => ({
                detailId: detail.id,

                externalMachineId: row.externalMachineId,
                sequenceNumber: row.sequenceNumber,

                name: row.name,
                quantity: row.quantity,
                unit: row.unit,
                machineryEquipmentType: row.machineryEquipmentType,

                gtipCode: row.gtipCode,
                gtipDescription: row.gtipDescription,

                vatExemption: row.vatExemption,
                vatExemptionDescription: row.vatExemptionDescription,

                customsTaxExemption: row.customsTaxExemption,
                customsTaxExemptionDescription:
                  row.customsTaxExemptionDescription,

                usedMachine: row.usedMachine,
                isVehicle: row.isVehicle,
                isCkd: row.isCkd,

                totalFobUsd: row.totalFobUsd,
                totalFobTl: row.totalFobTl,
                totalCifTl: row.totalCifTl,

                originCurrencyFob: row.originCurrencyFob,
                originCurrencyFobAmount: row.originCurrencyFobAmount,

                customsRealizedValue: row.customsRealizedValue,
                customsRealizedQuantity: row.customsRealizedQuantity,
                customsPermittedValue: row.customsPermittedValue,
                customsPermittedQuantity: row.customsPermittedQuantity,

                transferRealizedValue: row.transferRealizedValue,
                transferRealizedQuantity: row.transferRealizedQuantity,
                transferOutgoingValue: row.transferOutgoingValue,
                transferOutgoingQuantity: row.transferOutgoingQuantity,

                transferDocumentNumber: row.transferDocumentNumber,
                transferIncomingQuantity: row.transferIncomingQuantity,
                transferIncomingAmount: row.transferIncomingAmount,

                saleOutgoingValue: row.saleOutgoingValue,
                saleOutgoingQuantity: row.saleOutgoingQuantity,
                salePermittedValue: row.salePermittedValue,
                salePermittedQuantity: row.salePermittedQuantity,

                leasingOutgoingValue: row.leasingOutgoingValue,
                leasingOutgoingQuantity: row.leasingOutgoingQuantity,
                leasingPermittedValue: row.leasingPermittedValue,
                leasingPermittedQuantity: row.leasingPermittedQuantity,

                exportOutgoingValue: row.exportOutgoingValue,
                exportOutgoingQuantity: row.exportOutgoingQuantity,
                exportPermittedValue: row.exportPermittedValue,
                exportPermittedQuantity: row.exportPermittedQuantity,

                invoiceRealizedValue: row.invoiceRealizedValue,
                invoiceRealizedQuantity: row.invoiceRealizedQuantity,

                financialLeasingRealizedValue:
                  row.financialLeasingRealizedValue,
                financialLeasingRealizedQuantity:
                  row.financialLeasingRealizedQuantity,
                financialLeasingPermittedValue:
                  row.financialLeasingPermittedValue,
                financialLeasingPermittedQuantity:
                  row.financialLeasingPermittedQuantity,

                financialLeasingCompanyName: row.financialLeasingCompanyName,

                rawData: toJson(row.rawData),
              })),
            });
          }

          if (specialConditions.length > 0) {
            await tx.documentSpecialCondition.createMany({
              data: specialConditions.map((row) => ({
                detailId: detail.id,

                conditionCode: row.conditionCode,

                conditionName: row.conditionName,

                description: row.description,
              })),
            });
          }

          await tx.importRow.updateMany({
            where: {
              importBatchId: batch.id,
              externalDocumentId,
              status: "PENDING",
            },

            data: {
              status: isNew ? "NEW" : "CHANGED",
            },
          });
        });

        const affectedRowCount = validRows.filter(
          (row) => row.externalDocumentId === externalDocumentId,
        ).length;

        if (isNew) {
          newRowCount += affectedRowCount;
        } else {
          changedRowCount += affectedRowCount;
        }
      }

      const result = await prisma.importBatch.update({
        where: {
          id: batch.id,
        },

        data: {
          status: "COMPLETED",

          totalRowCount: allRows.length,

          validRowCount: validRows.length,

          invalidRowCount: invalidRows.length,

          newRowCount,

          changedRowCount,

          unchangedRowCount: 0,

          completedAt: new Date(),
        },
      });

      return {
        batchId: result.id,
        totalRowCount: result.totalRowCount,
        validRowCount: result.validRowCount,
        invalidRowCount: result.invalidRowCount,
        newRowCount: result.newRowCount,
        changedRowCount: result.changedRowCount,
        unchangedRowCount: result.unchangedRowCount,
        errors,
      };
    } catch (error) {
      await prisma.importBatch.update({
        where: {
          id: batch.id,
        },

        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
