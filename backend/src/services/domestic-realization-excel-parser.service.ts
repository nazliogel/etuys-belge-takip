import ExcelJS from "exceljs";

export interface ParsedDomesticRealizationRow {
    rowNumber: number;
    externalCompanyId: number | null;
    companyName: string | null;
    externalDocumentId: number | null;
    documentNumber: string | null;
    externalMachineId: number | null;
    sequenceNumber: number | null;
    externalInvoiceLineId: number | null;
    externalInvoiceId: number | null;
    invoiceNumber: string | null;
    sellerName: string | null;
    invoiceValue: string | null;
    realizedQuantity: string | null;
    itemName: string | null;
    sellerTaxNumber: string | null;
    invoiceDate: Date | null;
    invoiceType: string | null;
    recordStatus: string | null;
    errorMessage: string | null;
}

export interface DomesticRealizationParseResult {
    totalRowCount: number;
    validRowCount: number;
    invalidRowCount: number;
    rows: ParsedDomesticRealizationRow[];
}

const REQUIRED_HEADERS = [
    "Firma ID", "Belge ID", "Yerli Makine ID", "Fatura Kalem ID",
    "Fatura No", "Satıcı Unvanı", "Fatura Değeri",
] as const;

export class DomesticRealizationExcelParserService {
    async parse(filePath: string): Promise<DomesticRealizationParseResult> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet("Yerli Fatura Kalemleri") ?? workbook.worksheets[0];
        if (!worksheet) throw new Error("Excel çalışma sayfası bulunamadı.");

        const headerMap = new Map<string, number>();
        worksheet.getRow(1).eachCell((cell, column) => {
            headerMap.set(this.normalize(this.text(cell.value)), column);
        });
        const missing = REQUIRED_HEADERS.filter(h => !headerMap.has(this.normalize(h)));
        if (missing.length) throw new Error(`Eksik Excel başlıkları: ${missing.join(", ")}`);

        const rows: ParsedDomesticRealizationRow[] = [];
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            if (!row.hasValues) continue;
            const value = (header: string): string => {
                const column = headerMap.get(this.normalize(header));
                return column ? this.text(row.getCell(column).value) : "";
            };
            const integer = (raw: string): number | null => {
                if (!/^\d+$/.test(raw)) return null;
                const num = Number(raw);
                return Number.isSafeInteger(num) && num > 0 ? num : null;
            };
            const externalCompanyId = integer(value("Firma ID"));
            const externalDocumentId = integer(value("Belge ID"));
            const externalMachineId = integer(value("Yerli Makine ID"));
            const externalInvoiceLineId = integer(value("Fatura Kalem ID"));
            const invoiceNumber = value("Fatura No") || null;
            const sellerName = value("Satıcı Unvanı") || null;
            const rawInvoiceValue = value("Fatura Değeri");
            const invoiceValue = this.decimal(rawInvoiceValue);
            const rawQuantity = value("Gerçekleşen Miktar");
            const realizedQuantity = rawQuantity ? this.decimal(rawQuantity) : null;
            const rawDate = value("Fatura Tarihi");
            const invoiceDate = rawDate ? this.date(row.getCell(headerMap.get(this.normalize("Fatura Tarihi")) ?? 1).value) : null;
            const errors: string[] = [];
            if (!externalCompanyId) errors.push("Firma ID geçersiz.");
            if (!externalDocumentId) errors.push("Belge ID geçersiz.");
            if (!externalMachineId) errors.push("Yerli Makine ID geçersiz.");
            if (!externalInvoiceLineId) errors.push("Fatura Kalem ID geçersiz.");
            if (!invoiceNumber) errors.push("Fatura No boş.");
            if (!sellerName) errors.push("Satıcı Unvanı boş.");
            if (invoiceValue === null) errors.push("Fatura Değeri geçersiz.");
            if (rawQuantity && realizedQuantity === null) errors.push("Gerçekleşen Miktar geçersiz.");
            if (rawDate && !invoiceDate) errors.push("Fatura Tarihi geçersiz.");
            rows.push({
                rowNumber, externalCompanyId, externalDocumentId, externalMachineId,
                externalInvoiceLineId, invoiceNumber, sellerName, invoiceValue,
                companyName: value("Firma Adı") || null,
                documentNumber: value("Belge No") || null,
                sequenceNumber: integer(value("Sıra No")),
                externalInvoiceId: integer(value("Fatura ID")),
                realizedQuantity, itemName: value("Makine Adı / Özelliği") || null,
                sellerTaxNumber: value("Satıcı VKN") || null, invoiceDate,
                invoiceType: value("Fatura Tipi") || null,
                recordStatus: value("Durum") || null,
                errorMessage: errors.length ? errors.join(" ") : null,
            });
        }
        return {
            totalRowCount: rows.length,
            validRowCount: rows.filter(r => !r.errorMessage).length,
            invalidRowCount: rows.filter(r => !!r.errorMessage).length,
            rows,
        };
    }

    private normalize(value: string): string {
        return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
    }

    private text(value: ExcelJS.CellValue): string {
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        if (typeof value === "object") {
            if ("result" in value) return this.text(value.result);
            if ("text" in value) return String(value.text).trim();
            if ("richText" in value) return value.richText.map(x => x.text).join("").trim();
        }
        return String(value).trim();
    }

    private decimal(raw: string): string | null {
        const s = raw.replace(/\s/g, "").replace(/₺|TL/gi, "");
        if (!s) return null;
        let normalized = s;
        if (s.includes(",") && s.includes(".")) {
            normalized = s.lastIndexOf(",") > s.lastIndexOf(".")
                ? s.replace(/\./g, "").replace(",", ".")
                : s.replace(/,/g, "");
        } else if (s.includes(",")) {
            normalized = s.replace(",", ".");
        }
        if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
        return Number.isFinite(Number(normalized)) ? normalized : null;
    }

    private date(value: ExcelJS.CellValue): Date | null {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
        const raw = this.text(value);
        const tr = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
        const candidate = tr
            ? new Date(Date.UTC(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1])))
            : new Date(raw);
        return Number.isNaN(candidate.getTime()) ? null : candidate;
    }
}
