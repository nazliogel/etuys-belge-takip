import { prisma } from "../config/env.js";
import {
    DomesticRealizationExcelParserService,
    type ParsedDomesticRealizationRow,
} from "./domestic-realization-excel-parser.service.js";

export interface DomesticRealizationImportError {
    rowNumber: number;
    externalCompanyId: number | null;
    externalDocumentId: number | null;
    message: string;
}

export interface DomesticRealizationImportResult {
    totalRowCount: number;
    newRowCount: number;
    changedRowCount: number;
    unchangedRowCount: number;
    invalidRowCount: number;
    errors: DomesticRealizationImportError[];
}

export class DomesticRealizationImportService {
    private readonly parser = new DomesticRealizationExcelParserService();

    async import(filePath: string): Promise<DomesticRealizationImportResult> {
        const parsed = await this.parser.parse(filePath);
        const result: DomesticRealizationImportResult = {
            totalRowCount: parsed.totalRowCount,
            newRowCount: 0,
            changedRowCount: 0,
            unchangedRowCount: 0,
            invalidRowCount: 0,
            errors: [],
        };

        const invalid = (row: ParsedDomesticRealizationRow, message: string) => {
            result.invalidRowCount += 1;
            result.errors.push({
                rowNumber: row.rowNumber,
                externalCompanyId: row.externalCompanyId,
                externalDocumentId: row.externalDocumentId,
                message,
            });
        };

        for (const row of parsed.rows) {
            if (row.errorMessage) {
                invalid(row, row.errorMessage);
                continue;
            }

            // Parser bu dört alanı zorunlu tutuyor. TS tip daraltması için ayrıca kontrol.
            if (
                row.externalCompanyId === null ||
                row.externalDocumentId === null ||
                row.externalMachineId === null ||
                row.externalInvoiceLineId === null ||
                row.invoiceValue === null
            ) {
                invalid(row, "Zorunlu eşleştirme veya fatura değeri eksik.");
                continue;
            }

            try {
                const document = await prisma.incentiveDocument.findUnique({
                    where: { externalDocumentId: row.externalDocumentId },
                    include: { company: true, detail: true },
                });

                const closedDocument = document
                    ? null
                    : await prisma.closedIncentiveDocument.findUnique({
                        where: { externalDocumentId: row.externalDocumentId },
                        include: { company: true, detail: true },
                    });

                const matchedDocument = document ?? closedDocument;
                if (!matchedDocument) {
                    invalid(row, "Belge ID sistemde bulunamadı.");
                    continue;
                }
                if (matchedDocument.company.externalCompanyId !== row.externalCompanyId) {
                    invalid(row, "Firma ID, belgenin kayıtlı firmasıyla uyuşmuyor.");
                    continue;
                }
                if (!matchedDocument.detail) {
                    invalid(row, "Belge detay kaydı bulunamadı. Önce belge detaylarını yükleyin.");
                    continue;
                }

                const detailId = matchedDocument.detail.id;
                const machines = await prisma.documentDomesticMachine.findMany({
                    where: { detailId, externalMachineId: row.externalMachineId },
                    select: { id: true },
                    take: 2,
                });
                if (machines.length > 1) {
                    invalid(row, "Aynı belge ve Makine ID için birden fazla makine bulundu.");
                    continue;
                }
                // Makine henüz yüklenmemişse gerçekleşme kaydı kaybolmasın.
                const machineId = machines[0]?.id ?? null;

                const data = {
                    machineId,
                    externalMachineId: row.externalMachineId,
                    externalInvoiceId: row.externalInvoiceId,
                    sequenceNumber: row.sequenceNumber,
                    itemName: row.itemName,
                    invoiceNumber: row.invoiceNumber,
                    sellerName: row.sellerName,
                    sellerTaxNumber: row.sellerTaxNumber,
                    invoiceDate: row.invoiceDate,
                    invoiceValue: row.invoiceValue,
                    realizedQuantity: row.realizedQuantity,
                    invoiceType: row.invoiceType,
                    recordStatus: row.recordStatus,
                };

                await prisma.$transaction(async (tx) => {
                    const existing = await tx.documentDomesticRealization.findUnique({
                        where: {
                            detailId_externalInvoiceLineId: {
                                detailId,
                                externalInvoiceLineId: row.externalInvoiceLineId!,
                            },
                        },
                    });

                    if (!existing) {
                        await tx.documentDomesticRealization.create({
                            data: {
                                detailId,
                                externalInvoiceLineId: row.externalInvoiceLineId!,
                                ...data,
                            },
                        });
                        result.newRowCount += 1;
                        return;
                    }

                    const unchanged =
                        existing.machineId === data.machineId &&
                        existing.externalMachineId === data.externalMachineId &&
                        existing.externalInvoiceId === data.externalInvoiceId &&
                        existing.sequenceNumber === data.sequenceNumber &&
                        existing.itemName === data.itemName &&
                        existing.invoiceNumber === data.invoiceNumber &&
                        existing.sellerName === data.sellerName &&
                        existing.sellerTaxNumber === data.sellerTaxNumber &&
                        (existing.invoiceDate?.getTime() ?? null) === (data.invoiceDate?.getTime() ?? null) &&
                        existing.invoiceValue?.equals(data.invoiceValue) === true &&
                        (data.realizedQuantity === null
                            ? existing.realizedQuantity === null
                            : existing.realizedQuantity?.equals(data.realizedQuantity) === true) &&
                        existing.invoiceType === data.invoiceType &&
                        existing.recordStatus === data.recordStatus;

                    if (unchanged) {
                        result.unchangedRowCount += 1;
                        return;
                    }

                    await tx.documentDomesticRealization.update({
                        where: { id: existing.id },
                        data,
                    });
                    result.changedRowCount += 1;
                });
            } catch (error) {
                invalid(row, error instanceof Error ? error.message : "Kayıt işlenemedi.");
            }
        }

        return result;
    }
}
