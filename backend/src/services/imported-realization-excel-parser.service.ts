
import ExcelJS from "exceljs";

export interface ParsedImportedRealizationRow {
    rowNumber: number;
    externalCompanyId: number | null;
    companyName: string | null;
    externalDocumentId: number | null;
    documentNumber: string | null;
    sequenceNumber: number | null;
    itemName: string | null;
    unit: string | null;
    customsRealizedQuantity: string | null;
    declarationNumber: string | null;
    externalRowId: string | null;
    errorMessage: string | null;
}

export interface ImportedRealizationParseResult {
    totalRowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    rows: ParsedImportedRealizationRow[];
}

const HEADERS = [
    "Firma ID",
    "Firma Adı",
    "Belge ID",
    "Belge No",
    "Sıra No",
    "Eşya Cinsi",
    "Birim",
    "Gümrük Gerç. Miktarı",
    "Beyanname Numarası",
    "Satır ID",
] as const;

type Header = (typeof HEADERS)[number];

export class ImportedRealizationExcelParserService {
    async parse(filePath: string): Promise<ImportedRealizationParseResult> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.getWorksheet("Ithal Gerceklesme")
            ?? workbook.worksheets[0];

        if (!worksheet) {
            throw new Error("Excel çalışma sayfası bulunamadı.");
        }

        const headerMap = new Map<string, number>();

        worksheet.getRow(1).eachCell((cell, columnNumber) => {
            headerMap.set(this.normalize(this.text(cell.value)), columnNumber);
        });

        const missing = HEADERS.filter(
            header => !headerMap.has(this.normalize(header)),
        );

        if (missing.length) {
            throw new Error(`Eksik Excel başlıkları: ${missing.join(", ")}`);
        }

        const rows: ParsedImportedRealizationRow[] = [];

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);

            if (!row.hasValues) continue;

            const value = (header: Header) => {
                const column = headerMap.get(this.normalize(header))!;
                return this.text(row.getCell(column).value);
            };

            const integer = (text: string): number | null => {
                if (!/^\d+$/.test(text)) return null;
                const number = Number(text);
                return Number.isSafeInteger(number) ? number : null;
            };

            const externalCompanyId = integer(value("Firma ID"));
            const externalDocumentId = integer(value("Belge ID"));
            const sequenceNumber = integer(value("Sıra No"));
            const sourceRowId = value("Satır ID");
            const declarationNumber = value("Beyanname Numarası");
            const quantity = value("Gümrük Gerç. Miktarı");

            const errors: string[] = [];

            if (!externalCompanyId) errors.push("Firma ID geçersiz.");
            if (!externalDocumentId) errors.push("Belge ID geçersiz.");
            if (!/^\d+$/.test(sourceRowId)) {
                errors.push("Satır ID geçersiz.");
            }

            // 0 miktarı geçerlidir; boş veya geçersiz miktar kabul edilmez.
            const normalizedQuantity = quantity.replace(",", ".");

            if (
                !/^\d+(\.\d+)?$/.test(normalizedQuantity)
            ) {
                errors.push("Gümrük gerçekleşen miktarı geçersiz.");
            }

            if (!declarationNumber) {
                errors.push("Beyanname numarası boş.");
            }

            rows.push({
                rowNumber,
                externalCompanyId,
                companyName: value("Firma Adı") || null,
                externalDocumentId,
                documentNumber: value("Belge No") || null,
                sequenceNumber,
                itemName: value("Eşya Cinsi") || null,
                unit: value("Birim") || null,
                customsRealizedQuantity: errors.some(e =>
                    e.includes("miktarı")
                ) ? null : normalizedQuantity,
                declarationNumber: declarationNumber || null,

                // Aynı Satır ID farklı beyannamelerde bulunabilir.
                externalRowId:
                    /^\d+$/.test(sourceRowId) && declarationNumber
                        ? `${sourceRowId}:${declarationNumber}`
                        : null,

                errorMessage: errors.length ? errors.join(" ") : null,
            });
        }

        return {
            totalRowCount: rows.length,
            validRowCount: rows.filter(row => !row.errorMessage).length,
            invalidRowCount: rows.filter(row => !!row.errorMessage).length,
            rows,
        };
    }

    private normalize(value: string): string {
        return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
    }

    private text(value: ExcelJS.CellValue): string {
        if (value === null || value === undefined) return "";

        if (typeof value === "object") {
            if ("result" in value) return this.text(value.result);
            if ("text" in value) return String(value.text);
            if ("richText" in value) {
                return value.richText.map(item => item.text).join("");
            }
        }

        return String(value).trim();
    }
}
