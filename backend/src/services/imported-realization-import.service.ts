
import {
    ImportedRealizationExcelParserService,
} from "./imported-realization-excel-parser.service.js";

import {
    ImportedRealizationRepository,
    type ImportedRealizationRecord,
} from "../repositories/imported-realization.repository.js";

export interface ImportedRealizationImportError {
    rowNumber: number;
    externalCompanyId: number | null;
    externalDocumentId: number | null;
    message: string;
}

export interface ImportedRealizationImportResult {
    totalRowCount: number;
    newRowCount: number;
    changedRowCount: number;
    unchangedRowCount: number;
    duplicateRowCount: number;
    invalidRowCount: number;
    errors: ImportedRealizationImportError[];
}

export class ImportedRealizationImportService {
    private readonly parser =
        new ImportedRealizationExcelParserService();

    private readonly repository =
        new ImportedRealizationRepository();

    async import(filePath: string): Promise<ImportedRealizationImportResult> {
        const parsed = await this.parser.parse(filePath);

        const result: ImportedRealizationImportResult = {
            totalRowCount: parsed.totalRowCount,
            newRowCount: 0,
            changedRowCount: 0,
            unchangedRowCount: 0,
            duplicateRowCount: 0,
            invalidRowCount: 0,
            errors: [],
        };

        const seen = new Set<string>();

        for (const row of parsed.rows) {
            const fail = (message: string) => {
                result.invalidRowCount += 1;

                result.errors.push({
                    rowNumber: row.rowNumber,
                    externalCompanyId: row.externalCompanyId,
                    externalDocumentId: row.externalDocumentId,
                    message,
                });
            };

            if (row.errorMessage) {
                fail(row.errorMessage);
                continue;
            }

            if (
                row.externalCompanyId === null ||
                row.externalDocumentId === null ||
                row.externalRowId === null
            ) {
                fail("Firma ID, Belge ID veya Satır ID eksik.");
                continue;
            }

            const key = `${row.externalDocumentId}:${row.externalRowId}`;

            if (seen.has(key)) {
                result.duplicateRowCount += 1;
                continue;
            }

            seen.add(key);

            try {
                const document = await this.repository.findDocument(
                    row.externalDocumentId,
                );

                if (!document) {
                    fail("Teşvik belgesi sistemde bulunamadı.");
                    continue;
                }

                if (
                    document.company.externalCompanyId !==
                    row.externalCompanyId
                ) {
                    fail("Firma ID ile teşvik belgesinin firması eşleşmiyor.");
                    continue;
                }

                if (!document.detail) {
                    fail("Teşvik belgesinin detay kaydı bulunamadı.");
                    continue;
                }

                const detailId = document.detail.id;

                const machines = await this.repository.findImportedMachines(
                    detailId,
                    row.sequenceNumber,
                );

                // Birden fazla eşleşme varsa yanlış makineye bağlama.
                const machine = machines.length === 1 ? machines[0] : null;

                const existing = await this.repository.findExisting(
                    detailId,
                    row.externalRowId,
                );

                const record: ImportedRealizationRecord = {
                    externalCompanyId: row.externalCompanyId,
                    externalDocumentId: row.externalDocumentId,
                    externalRowId: row.externalRowId,
                    sequenceNumber: row.sequenceNumber,
                    itemName: row.itemName,
                    unit: row.unit,
                    customsRealizedQuantity: row.customsRealizedQuantity,
                    rawData: {
                        firmaId: row.externalCompanyId,
                        firmaAdi: row.companyName,
                        belgeId: row.externalDocumentId,
                        belgeNo: row.documentNumber,
                        siraNo: row.sequenceNumber,
                        esyaCinsi: row.itemName,
                        birim: row.unit,
                        gumrukGerceklesenMiktar:
                            row.customsRealizedQuantity,
                        beyannameNumarasi: row.declarationNumber,
                        satirId: row.externalRowId.split(":")[0],
                    },
                };

                if (existing) {
                    const unchanged =
                        existing.sequenceNumber === record.sequenceNumber &&
                        existing.itemName === record.itemName &&
                        existing.unit === record.unit &&
                        (
                            existing.customsRealizedQuantity === null
                                ? record.customsRealizedQuantity === null
                                : record.customsRealizedQuantity !== null &&
                                existing.customsRealizedQuantity.equals(
                                    record.customsRealizedQuantity
                                )
                        ) &&
                        existing.machineId ===
                        (machine?.id ?? null) &&
                        existing.externalMachineId ===
                        (machine?.externalMachineId ?? null);

                    if (unchanged) {
                        result.unchangedRowCount += 1;
                        continue;
                    }
                }

                await this.repository.upsert(
                    detailId,
                    record,
                    machine?.id ?? null,
                    machine?.externalMachineId ?? null,
                );

                if (existing) {
                    result.changedRowCount += 1;
                } else {
                    result.newRowCount += 1;
                }
            } catch (error) {
                fail(
                    error instanceof Error
                        ? error.message
                        : "Bilinmeyen aktarım hatası.",
                );
            }
        }

        return result;
    }
}
