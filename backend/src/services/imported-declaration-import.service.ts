import { prisma } from "../config/env.js";
import { ImportedRealizationRepository } from "../repositories/imported-realization.repository.js";
import { ImportedDeclarationExcelParserService } from "./imported-declaration-excel-parser.service.js";

export class ImportedDeclarationImportService {
    private readonly parser = new ImportedDeclarationExcelParserService();
    private readonly repository = new ImportedRealizationRepository();

    async import(filePath: string) {
        const rows = await this.parser.parse(filePath);
        const result = {
            totalRowCount: rows.length,
            changedRowCount: 0,
            unchangedRowCount: 0,
            invalidRowCount: 0,
            errors: [] as {
                rowNumber: number;
                externalCompanyId: number | null;
                externalDocumentId: number | null;
                message: string;
            }[],
        };

        for (const row of rows) {
            const fail = (message: string) => {
                result.invalidRowCount++;
                result.errors.push({
                    rowNumber: row.rowNumber,
                    externalCompanyId: row.externalCompanyId,
                    externalDocumentId: row.externalDocumentId,
                    message,
                });
            };

            if (
                row.errorMessage ||
                row.externalCompanyId === null ||
                row.externalDocumentId === null ||
                row.externalRowId === null
            ) {
                fail(row.errorMessage ?? "Eşleştirme bilgileri eksik.");
                continue;
            }

            try {
                const document = await this.repository.findDocument(
                    row.externalDocumentId,
                );

                if (!document?.detail) {
                    fail("Belge detay kaydı bulunamadı.");
                    continue;
                }

                if (document.company.externalCompanyId !== row.externalCompanyId) {
                    fail("Firma ID, belgenin firmasıyla eşleşmiyor.");
                    continue;
                }

                const detailId = document.detail.id;
                const existing = await this.repository.findExisting(
                    detailId,
                    row.externalRowId,
                );

                if (!existing) {
                    fail("Eşleşen ithal gerçekleşme satırı bulunamadı.");
                    continue;
                }

                const raw = existing.rawData;
                const previous =
                    raw && typeof raw === "object" && !Array.isArray(raw)
                        ? raw
                        : {};

                const date = row.declarationDate ?? previous.beyannameTarihi ?? null;
                const amount = row.declarationAmount ?? previous.tutar ?? null;

                if (
                    date === (previous.beyannameTarihi ?? null) &&
                    amount === (previous.tutar ?? null)
                ) {
                    result.unchangedRowCount++;
                    continue;
                }

                await prisma.documentImportedRealization.update({
                    where: {
                        detailId_externalRowId: {
                            detailId,
                            externalRowId: row.externalRowId,
                        },
                    },
                    data: {
                        rawData: {
                            ...previous,
                            beyannameTarihi: date,
                            tutar: amount,
                        },
                    },
                });

                result.changedRowCount++;
            } catch (error) {
                fail(error instanceof Error ? error.message : "Aktarım hatası.");
            }
        }

        return result;
    }
}