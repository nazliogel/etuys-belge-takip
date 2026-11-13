import ExcelJS from "exceljs";

const HEADERS = [
    "Firma ID",
    "Belge ID",
    "Satır ID",
    "Beyanname Numarası",
    "Beyanname Tarihi",
    "Tutar",
] as const;

type Header = (typeof HEADERS)[number];

export interface ParsedImportedDeclarationRow {
    rowNumber: number;
    externalCompanyId: number | null;
    externalDocumentId: number | null;
    externalRowId: string | null;
    declarationDate: string | null;
    declarationAmount: string | null;
    errorMessage: string | null;
}

export class ImportedDeclarationExcelParserService {
    async parse(filePath: string): Promise<ParsedImportedDeclarationRow[]> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet =
            workbook.getWorksheet("Beyanname Tarih Tutar") ??
            workbook.getWorksheet("Ithal Gerceklesme") ??
            workbook.worksheets[0];

        if (!worksheet) {
            throw new Error("Excel çalışma sayfası bulunamadı.");
        }

        const columns = new Map<string, number>();
        worksheet.getRow(1).eachCell((cell, column) => {
            columns.set(normalizeHeader(cellText(cell.value)), column);
        });

        const missing = HEADERS.filter(
            (header) => !columns.has(normalizeHeader(header)),
        );

        if (missing.length) {
            throw new Error(`Eksik Excel başlıkları: ${missing.join(", ")}`);
        }

        const rows: ParsedImportedDeclarationRow[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            const read = (header: Header) =>
                cellText(row.getCell(columns.get(normalizeHeader(header))!).value);

            const externalCompanyId = positiveInteger(read("Firma ID"));
            const externalDocumentId = positiveInteger(read("Belge ID"));
            const sourceRowId = read("Satır ID");
            const declarationNumber = read("Beyanname Numarası");
            const declarationDate = read("Beyanname Tarihi") || null;
            const declarationAmount = read("Tutar").replace(",", ".") || null;
            const errors: string[] = [];

            if (externalCompanyId === null) errors.push("Firma ID geçersiz.");
            if (externalDocumentId === null) errors.push("Belge ID geçersiz.");
            if (!/^\d+$/.test(sourceRowId)) errors.push("Satır ID geçersiz.");
            if (!declarationNumber) errors.push("Beyanname numarası boş.");

            if (declarationAmount !== null && !/^-?\d+(\.\d+)?$/.test(declarationAmount)) {
                errors.push("Beyanname tutarı geçersiz.");
            }

            rows.push({
                rowNumber,
                externalCompanyId,
                externalDocumentId,
                externalRowId:
                    /^\d+$/.test(sourceRowId) && declarationNumber
                        ? `${sourceRowId}:${declarationNumber}`
                        : null,
                declarationDate,
                declarationAmount,
                errorMessage: errors.length ? errors.join(" ") : null,
            });
        });

        return rows;
    }
}

function normalizeHeader(value: string): string {
    return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

function positiveInteger(value: string): number | null {
    if (!/^\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function cellText(value: ExcelJS.CellValue): string {
    if (value == null) return "";

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
    }

    if (typeof value === "object") {
        if ("result" in value) return cellText(value.result);
        if ("text" in value) return String(value.text).trim();
        if ("richText" in value) {
            return value.richText.map((part) => part.text).join("").trim();
        }
    }

    return String(value).trim();
}