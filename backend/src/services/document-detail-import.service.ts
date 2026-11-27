/*
 * ==================================================================
 * [20.11.2026] Belge detay aktarımı: hatalı belge atlanıyor, dosya reddedilmiyor
 * ------------------------------------------------------------------
 * Önceki sohbetten gelen (korundu):
 *   - Excel’deki "Belge Durumu"na göre açık/kapalı kayıt seçiliyor.
 *   - Yerli/ithal makineler silinip yeniden oluşturulmuyor, ID ile bulunup güncelleniyor
 *     (beyanname–makine bağlantıları korunuyor).
 * Bu sürümde eklenen:
 *   - Belge bazında hatalar (tanınmayan durum, kapalı kaydı olmayan kapalı belge vb.)
 *     artık tüm dosyayı reddetmiyor; o belge atlanıp hata listesine yazılıyor.
 *   - Her belge kendi transaction’ında: hata olursa sadece o belge geri alınıyor.
 *   - Belge kapalıysa ve verisi hâlâ açık kayıttaysa önce taşınıyor (kendini onarma).
 *   - Hiç belge yüklenemezse batch FAILED, en az biri yüklenirse COMPLETED.
 *   - Excel'de artık olmayan (e-TUYS'tan çıkarılmış) makineler siliniyor; mevcut
 *     makineler silinmeden güncellendiği için ID'ler ve bağlantılar korunuyor.
 *     Bağlantısı boşalan beyanname/faturalar makine ID ile yeniden bağlanıyor.
 *     Not: Excel'de belgenin hiç makine satırı yoksa makinelere dokunulmuyor
 *     (eksik/başarısız e-TUYS çekiminde makinelerin toptan silinmemesi için).
 * Ayrıntı: DEGISIKLIKLER-2026-11-20.md
 * ==================================================================
 */

import type { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../config/env.js";

import {
  DocumentDetailExcelParserService,
  type ParsedDocumentDetailResult,
} from "./document-detail-excel-parser.service.js";
import {
  linkImportedRealizations,
  moveOpenDetailToClosedDocument,
} from "./closed-document-transition.service.js";

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

type DocumentTarget = "OPEN" | "CLOSED" | null;

function resolveDocumentTarget(
  status: string | null | undefined,
): DocumentTarget {
  if (!status) return null;

  const normalized = status.trim().toLocaleLowerCase("tr-TR");

  if (normalized === "açık") {
    return "OPEN";
  }

  if (normalized === "kapalı" || normalized === "iptal") {
    return "CLOSED";
  }

  return null;
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

/*
 * machineId'si boş yerli faturaları, aynı detaydaki makineye e-TUYS makine ID'si
 * ile bağlar. O ID'de tek makine yoksa bağlamaz.
 */
async function linkDomesticRealizations(
  tx: Prisma.TransactionClient,
  detailId: number,
): Promise<number> {
  const [machines, rows] = await Promise.all([
    tx.documentDomesticMachine.findMany({
      where: { detailId, externalMachineId: { not: null } },
      select: { id: true, externalMachineId: true },
    }),
    tx.documentDomesticRealization.findMany({
      where: { detailId, machineId: null, externalMachineId: { not: null } },
      select: { id: true, externalMachineId: true },
    }),
  ]);

  if (machines.length === 0 || rows.length === 0) return 0;

  const counts = new Map<number, number>();
  for (const machine of machines) {
    const key = machine.externalMachineId!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const byExternalId = new Map<number, number>();
  for (const machine of machines) {
    const key = machine.externalMachineId!;
    if (counts.get(key) === 1) byExternalId.set(key, machine.id);
  }

  let linked = 0;

  for (const row of rows) {
    const machineId = byExternalId.get(row.externalMachineId!);
    if (machineId === undefined) continue;

    await tx.documentDomesticRealization.update({
      where: { id: row.id },
      data: { machineId },
    });

    linked += 1;
  }

  return linked;
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
            isActive: true,
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

      const documentTargetMap = new Map<number, "OPEN" | "CLOSED">();

      /*
       * Belge bazında hatalar. Hatalı belge atlanır ve hata listesine yazılır;
       * dosyanın geri kalanı yüklenmeye devam eder.
       */
      const documentErrors = new Map<number, string>();

      for (const id of externalDocumentIds) {
        const openExists = openDocumentMap.has(id);
        const closedExists = closedDocumentMap.has(id);

        if (!openExists && !closedExists) continue;

        const statuses = parsed.documents
          .filter((row) => row.externalDocumentId === id)
          .map((row) => row.documentStatus);

        const unknownStatus = statuses.find(
          (status) => status?.trim() && resolveDocumentTarget(status) === null,
        );

        if (unknownStatus) {
          documentErrors.set(id, `Tanınmayan belge durumu: ${unknownStatus}`);
          continue;
        }

        const targets = statuses
          .map(resolveDocumentTarget)
          .filter((value): value is "OPEN" | "CLOSED" => value !== null);

        if (new Set(targets).size > 1) {
          documentErrors.set(id, "Excel'de çelişkili belge durumları var.");
          continue;
        }

        const target = targets[0] ?? null;

        if (openExists && closedExists && target === null) {
          documentErrors.set(
            id,
            "Belge hem açık hem kapalı kayıtlı, ama Excel'de Belge Durumu boş.",
          );
          continue;
        }

        const resolvedTarget = target ?? (openExists ? "OPEN" : "CLOSED");

        if (resolvedTarget === "CLOSED" && !closedExists) {
          documentErrors.set(
            id,
            "Belge e-TUYS'ta kapalı/iptal ama sistemde kapalı kaydı yok. Önce kapalı belge listesini yükleyip onaylayın.",
          );
          continue;
        }

        // [27.11.2026] Belge kapalıya taşınmış (açık kayıt pasif) ama Excel'de
        // "Açık" görünüyor. Pasif açık kayda yeni detay açılırsa veri ikiye
        // bölünür ve sonraki kapalı detay yüklemesi CLOSED_DETAIL_CONFLICT verir
        // (örnek 1030876). Tahmin yürütme, manuel kontrole bırak.
        if (
          resolvedTarget === "OPEN" &&
          closedExists &&
          openDocumentMap.get(id)?.isActive === false
        ) {
          documentErrors.set(
            id,
            "Belge sistemde kapalıya taşınmış (açık kaydı pasif), ama Excel'de Açık görünüyor. Veri yazılmadı, e-TUYS'taki durumu kontrol edin.",
          );
          continue;
        }

        if (resolvedTarget === "OPEN" && !openExists) {
          documentErrors.set(
            id,
            "Belge e-TUYS'ta açık ama sistemde sadece kapalı kaydı var. Manuel kontrol gerekli.",
          );
          continue;
        }

        documentTargetMap.set(id, resolvedTarget);
      }

      const documentErrorMessage = (externalDocumentId: number) =>
        documentErrors.get(externalDocumentId) ??
        `Belge ID ${externalDocumentId} sistemde bulunamadı.`;

      function hasDocument(externalDocumentId: number) {
        return documentTargetMap.has(externalDocumentId);
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
        message: documentErrorMessage(row.externalDocumentId),
      }));

      if (allRows.length > 0) {
        await prisma.importRow.createMany({
          data: allRows.map((row) => {
            const selectedTarget = documentTargetMap.get(row.externalDocumentId);

            const openDocument =
              selectedTarget === "OPEN"
                ? openDocumentMap.get(row.externalDocumentId)
                : undefined;

            const closedDocument =
              selectedTarget === "CLOSED"
                ? closedDocumentMap.get(row.externalDocumentId)
                : undefined;

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
                : documentErrorMessage(row.externalDocumentId),
            };
          }),
        });
      }

      const documentIdsToProcess = [
        ...new Set(validRows.map((row) => row.externalDocumentId)),
      ];

      let newRowCount = 0;
      let changedRowCount = 0;
      let failedRowCount = 0;

      for (const externalDocumentId of documentIdsToProcess) {
        const selectedTarget = documentTargetMap.get(externalDocumentId);

        const openDocument =
          selectedTarget === "OPEN"
            ? openDocumentMap.get(externalDocumentId)
            : undefined;

        const closedDocument =
          selectedTarget === "CLOSED"
            ? closedDocumentMap.get(externalDocumentId)
            : undefined;
        if (!openDocument && !closedDocument) {
          continue;
        }

        const documentRow = parsed.documents.find(
          (row) => row.externalDocumentId === externalDocumentId,
        );

        const document = openDocument ?? closedDocument;

        if (!document) {
          continue;
        }

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

        try {
          await prisma.$transaction(async (tx) => {
            /*
             * Belge kapalıysa ama verisi hâlâ açık kayıttaysa
             * (kapalı liste onayı sırasında taşınmamışsa) önce taşı.
             */
            if (closedDocument && openDocumentMap.has(externalDocumentId)) {
              await moveOpenDetailToClosedDocument(tx, externalDocumentId, {
                changedById: input.uploadedById,
                importBatchId: batch.id,
              });
            }

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
              const existingMachines = await tx.documentDomesticMachine.findMany({
                where: { detailId: detail.id },
                select: { id: true, externalMachineId: true, sequenceNumber: true },
              });

              const usedMachineIds = new Set<number>();
              const seenExternalIds = new Set<number>();
              const seenSequenceOnly = new Set<number>();

              for (const row of domesticMachines) {
                if (row.externalMachineId === null && row.sequenceNumber === null) {
                  throw new Error(`Belge ${externalDocumentId}: yerli makine ID ve Sıra No eksik.`);
                }

                if (row.externalMachineId !== null) {
                  if (seenExternalIds.has(row.externalMachineId)) {
                    throw new Error(`Belge ${externalDocumentId}: mükerrer yerli makine ID ${row.externalMachineId}.`);
                  }
                  seenExternalIds.add(row.externalMachineId);
                } else if (row.sequenceNumber !== null) {
                  if (seenSequenceOnly.has(row.sequenceNumber)) {
                    throw new Error(`Belge ${externalDocumentId}: mükerrer yerli makine Sıra No ${row.sequenceNumber}.`);
                  }
                  seenSequenceOnly.add(row.sequenceNumber);
                }

                let matches = row.externalMachineId !== null
                  ? existingMachines.filter((m) => m.externalMachineId === row.externalMachineId)
                  : existingMachines.filter(
                    (m) =>
                      m.externalMachineId === null &&
                      m.sequenceNumber === row.sequenceNumber,
                  );

                if (matches.length > 1) {
                  throw new Error(`Belge ${externalDocumentId}: yerli makine eşleştirmesi belirsiz.`);
                }

                const matched = matches[0];
                if (matched && usedMachineIds.has(matched.id)) {
                  throw new Error(`Belge ${externalDocumentId}: aynı yerli makine birden fazla satıra eşleşti.`);
                }
                if (matched) usedMachineIds.add(matched.id);

                const data = {
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
                };

                if (matched) {
                  await tx.documentDomesticMachine.update({
                    where: { id: matched.id },
                    data,
                  });
                } else {
                  await tx.documentDomesticMachine.create({ data });
                }
              }

              /*
               * Excel'de artık olmayan (e-TUYS'tan çıkarılmış) yerli makineleri sil.
               * Bu makinelere bağlı faturaların bağlantısı boşalır (onDelete: SetNull),
               * ardından makine ID'si eşleşen makineye yeniden bağlanır.
               */
              const staleDomesticIds = existingMachines
                .filter((machine) => !usedMachineIds.has(machine.id))
                .map((machine) => machine.id);

              if (staleDomesticIds.length > 0) {
                await tx.documentDomesticMachine.deleteMany({
                  where: { id: { in: staleDomesticIds } },
                });
              }

              await linkDomesticRealizations(tx, detail.id);
            }

            if (importedMachines.length > 0) {
              const existingMachines = await tx.documentImportedMachine.findMany({
                where: { detailId: detail.id },
                select: { id: true, externalMachineId: true, sequenceNumber: true },
              });

              const inputKeys = new Set<string>();
              const usedMachineIds = new Set<number>();
              const machinesToSave = importedMachines.map((row) => {
                const key = row.externalMachineId !== null
                  ? `id:${row.externalMachineId}`
                  : row.sequenceNumber !== null
                    ? `seq:${row.sequenceNumber}`
                    : null;

                if (!key || inputKeys.has(key)) {
                  throw new Error(
                    `Belge ${externalDocumentId}: ithal makine ID/Sıra No eksik veya mükerrer (${key ?? "boş"}).`,
                  );
                }
                inputKeys.add(key);

                let matches = row.externalMachineId !== null
                  ? existingMachines.filter((m) => m.externalMachineId === row.externalMachineId)
                  : existingMachines.filter(
                    (m) =>
                      m.externalMachineId === null &&
                      m.sequenceNumber === row.sequenceNumber,
                  );

                if (matches.length > 1) {
                  throw new Error(`Belge ${externalDocumentId}: makine eşleştirmesi belirsiz (${key}).`);
                }
                const matched = matches[0];
                if (matched && usedMachineIds.has(matched.id)) {
                  throw new Error(`Belge ${externalDocumentId}: aynı makine birden fazla Excel satırına eşleşti.`);
                }
                if (matched) usedMachineIds.add(matched.id);

                return {
                  existingId: matched?.id ?? null,
                  data: {
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
                  },
                };
              });

              for (const machine of machinesToSave) {
                if (machine.existingId !== null) {
                  await tx.documentImportedMachine.update({
                    where: { id: machine.existingId },
                    data: machine.data,
                  });
                } else {
                  await tx.documentImportedMachine.create({ data: machine.data });
                }
              }

              /*
               * Excel'de artık olmayan (e-TUYS'tan çıkarılmış) ithal makineleri sil.
               * Bağlantısı boşalan beyannameler makine ID / Sıra No ile yeniden bağlanır.
               */
              const staleImportedIds = existingMachines
                .filter((machine) => !usedMachineIds.has(machine.id))
                .map((machine) => machine.id);

              if (staleImportedIds.length > 0) {
                await tx.documentImportedMachine.deleteMany({
                  where: { id: { in: staleImportedIds } },
                });
              }

              await linkImportedRealizations(tx, detail.id);
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
        } catch (error) {
          /*
           * Bu belgenin bütün değişiklikleri geri alındı (transaction).
           * Belge hata listesine yazılır, diğer belgelerle devam edilir.
           */
          const message =
            error instanceof Error ? error.message : String(error);

          documentErrors.set(externalDocumentId, message);

          const failedRows = validRows.filter(
            (row) => row.externalDocumentId === externalDocumentId,
          );

          failedRowCount += failedRows.length;

          for (const row of failedRows) {
            errors.push({
              sheetName: row.sheetName,
              rowNumber: row.rowNumber,
              externalDocumentId: row.externalDocumentId,
              documentNumber: row.documentNumber ?? null,
              message,
            });
          }

          await prisma.importRow.updateMany({
            where: {
              importBatchId: batch.id,
              externalDocumentId,
            },
            data: {
              status: "INVALID",
              errorMessage: message,
            },
          });

          continue;
        }

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
          // Hiçbir belge yüklenemediyse FAILED, en az biri yüklendiyse COMPLETED.
          status:
            allRows.length > 0 && validRows.length - failedRowCount === 0
              ? "FAILED"
              : "COMPLETED",

          totalRowCount: allRows.length,

          validRowCount: validRows.length - failedRowCount,

          invalidRowCount: invalidRows.length + failedRowCount,

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