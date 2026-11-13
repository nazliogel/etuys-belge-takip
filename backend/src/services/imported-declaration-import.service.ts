import { prisma } from "../config/env.js";
import { ImportedRealizationRepository } from "../repositories/imported-realization.repository.js";
import { ImportedDeclarationExcelParserService } from "./imported-declaration-excel-parser.service.js";

// Rapor ekranında gösterilecek değişiklik. fieldName "declarationDate|<beyanname no>"
// biçiminde tutulur; aynı belgedeki farklı beyannameler ayırt edilebilsin diye.
export interface ImportedDeclarationChange {
    rowNumber: number;
    externalCompanyId: number;
    externalDocumentId: number;
    companyId: number;
    companyName: string;
    taxNumber: string;
    authorizationEndDate: Date | null;
    documentNumber: string | null;
    closedDocument: boolean;
    fields: {
        fieldName: string;
        oldValue: string | null;
        newValue: string | null;
    }[];
}

const toText = (value: unknown): string | null =>
    value === null || value === undefined || value === "" ? null : String(value);

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
            changes: [] as ImportedDeclarationChange[],
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
                const document = row.closedDocumentsOnly
                    ? await this.repository.findClosedDocument(
                        row.externalDocumentId,
                    )
                    : await this.repository.findDocument(
                        row.externalDocumentId,
                    );

                if (!document) {
                    fail(
                        row.closedDocumentsOnly
                            ? "Belge kapalı belgeler arasında bulunamadı."
                            : "Belge sistemde bulunamadı.",
                    );
                    continue;
                }

                if (!document.detail) {
                    fail("Belge sistemde var ama detayı (makine listesi) yüklenmemiş.");
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

                const declarationNumber =
                    row.externalRowId.split(":").slice(1).join(":") || row.externalRowId;
                const fields = [
                    {
                        fieldName: `declarationDate|${declarationNumber}`,
                        oldValue: toText(previous.beyannameTarihi),
                        newValue: toText(date),
                    },
                    {
                        fieldName: `declarationAmount|${declarationNumber}`,
                        oldValue: toText(previous.tutar),
                        newValue: toText(amount),
                    },
                ].filter((field) => field.oldValue !== field.newValue);

                result.changes.push({
                    rowNumber: row.rowNumber,
                    externalCompanyId: row.externalCompanyId,
                    externalDocumentId: row.externalDocumentId,
                    companyId: document.company.id,
                    companyName: document.company.name,
                    taxNumber: document.company.taxNumber,
                    authorizationEndDate:
                        document.company.authorization?.authorizationEndDate ?? null,
                    documentNumber: document.documentNumber,
                    closedDocument: row.closedDocumentsOnly,
                    fields,
                });
            } catch (error) {
                fail(error instanceof Error ? error.message : "Aktarım hatası.");
            }
        }

        return result;
    }
}