/*
 * ==================================================================
 * [20.11.2026] İthal gerçekleşme: beyanname makineye makine ID ile bağlanıyor
 * ------------------------------------------------------------------
 * findMachine(): Önce e-TUYS makine ID ile (kesin), yoksa tekil Sıra No ile eşleştirir.
 * Sıra No ile bulunan makinenin ID’si Excel’deki ID ile çelişirse bağlamaz.
 * Makine henüz yüklenmemiş olsa bile externalMachineId kaydediliyor (sonra bağlanabilir).
 * rawData’ya beyanname tarihi, tutar, belge durumu ve makine ID ekleniyor.
 * Kontrol (20.11.2026): Excel’deki 1.387 beyannamenin hepsi makine ID ile doğru eşleşiyor.
 * Ayrıntı: DEGISIKLIKLER-2026-11-20.md
 * ==================================================================
 */

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

                const machine = await this.findMachine(
                    detailId,
                    row.externalMachineId,
                    row.sequenceNumber,
                );

                // Makine henüz yüklenmemişse bile e-TUYS makine ID'si saklanır;
                // makine listesi gelince bu ID ile bağlanabilir.
                const externalMachineId =
                    row.externalMachineId ?? machine?.externalMachineId ?? null;

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
                        beyannameTarihi: row.declarationDate,
                        tutar: row.amount,
                        belgeDurumu: row.documentStatus,
                        ithalMakineId: row.externalMachineId,
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
                        existing.externalMachineId === externalMachineId;

                    if (unchanged) {
                        result.unchangedRowCount += 1;
                        continue;
                    }
                }

                await this.repository.upsert(
                    detailId,
                    record,
                    machine?.id ?? null,
                    externalMachineId,
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

    /*
     * Önce e-TUYS makine ID'si ile eşleştirir (kesin eşleşme).
     * ID yoksa veya eski kayıtlarda makinenin ID'si boşsa Sıra No kullanılır.
     * Birden fazla aday varsa yanlış makineye bağlamamak için bağlamaz.
     */
    private async findMachine(
        detailId: number,
        externalMachineId: number | null,
        sequenceNumber: number | null,
    ) {
        if (externalMachineId !== null) {
            const byId =
                await this.repository.findImportedMachinesByExternalId(
                    detailId,
                    externalMachineId,
                );

            if (byId.length === 1) {
                return byId[0];
            }

            if (byId.length > 1) {
                return null;
            }
        }

        const bySequence = await this.repository.findImportedMachines(
            detailId,
            sequenceNumber,
        );

        const candidate = bySequence.length === 1 ? bySequence[0] : null;

        // Sıra No ile bulunan makinenin ID'si Excel'deki ID ile çelişiyorsa bağlama.
        if (
            candidate &&
            externalMachineId !== null &&
            candidate.externalMachineId !== null &&
            candidate.externalMachineId !== externalMachineId
        ) {
            return null;
        }

        return candidate;
    }
}
