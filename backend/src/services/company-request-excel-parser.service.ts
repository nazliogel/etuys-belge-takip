import ExcelJS from "exceljs";

export interface ParsedCompanyRequestRow {
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  requestNumber: number | null;
  note: string | null;
  externalDocumentId: number | null;
  documentNumber: string | null;
  requestType: string | null;
  requestStatus: string | null;
  department: string | null;
  assignedPersonnel: string | null;
  informationPerson: string | null;
  applicationDate: Date | null;
  completionDate: Date | null;
  rawData: Record<string, unknown>;
  errorMessage: string | null;
}

export interface CompanyRequestParseResult {
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  rows: ParsedCompanyRequestRow[];
}

const EXPECTED_HEADERS = {
  externalCompanyId: ["Firma ID", "Firma Id"],
  companyName: ["Firma Adı"],
  requestNumber: ["Talep No", "Talep Numarası"],
  note: ["Not"],
  documentNumber: ["Belge No", "Belge Numarası"],
  externalDocumentId: ["Belge ID", "Belge Id"],
  requestType: ["Talep Tipi"],
  requestStatus: ["Durum", "Talep Durumu"],
  department: ["Daire", "Birim"],
  assignedPersonnel: ["İlgilenen Personel", "İlgili Uzman", "Atanan Personel"],
  informationPerson: ["Bilgi İçin", "Talebi Veren", "Bilgilendirilecek Kişi"],
  applicationDate: ["Başvuru Tarihi", "Talep Zamanı"],
  completionDate: ["Sonuçlandırma Tarihi", "Tamamlanma Tarihi"],
} as const;

type HeaderKey = keyof typeof EXPECTED_HEADERS;

export class CompanyRequestExcelParserService {
  async parse(filePath: string): Promise<CompanyRequestParseResult> {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");
    }

    const headerRow = worksheet.getRow(1);
    const headerMap = this.createHeaderMap(headerRow);

    this.validateHeaders(headerMap);

    const rows: ParsedCompanyRequestRow[] = [];

    let validRowCount = 0;
    let invalidRowCount = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      if (this.isEmptyRow(row)) {
        continue;
      }

      const parsedRow = this.parseRow(rowNumber, row, headerMap);

      /*
       * Talep bilgisi bulunmayan firma durum satırlarını atla.
       * Örnek: "Yetki süresi dolmuş", "Yetkisi var, belgesi yok".
       */
      const isStatusOnlyRow =
        parsedRow.requestNumber === null &&
        parsedRow.externalDocumentId === null &&
        !parsedRow.documentNumber;

      if (isStatusOnlyRow) {
        continue;
      }

      if (parsedRow.errorMessage) {
        invalidRowCount += 1;
      } else {
        validRowCount += 1;
      }

      rows.push(parsedRow);
    }

    return {
      totalRowCount: rows.length,
      validRowCount,
      invalidRowCount,
      rows,
    };
  }

  private createHeaderMap(
    row: ExcelJS.Row,
  ): Partial<Record<HeaderKey, number>> {
    const headerMap: Partial<Record<HeaderKey, number>> = {};

    row.eachCell((cell, columnNumber) => {
      const currentHeader = this.normalizeHeader(
        this.getStringValue(cell.value),
      );

      for (const [key, expectedHeaders] of Object.entries(EXPECTED_HEADERS)) {
        const isMatch = expectedHeaders.some(
          (header) => this.normalizeHeader(header) === currentHeader,
        );

        if (isMatch) {
          headerMap[key as HeaderKey] = columnNumber;
        }
      }
    });

    return headerMap;
  }

  private validateHeaders(headerMap: Partial<Record<HeaderKey, number>>): void {
    const requiredHeaders: HeaderKey[] = ["externalCompanyId", "requestNumber"];

    const missingHeaders = requiredHeaders
      .filter((key) => !headerMap[key])
      .map((key) => EXPECTED_HEADERS[key][0]);

    if (missingHeaders.length > 0) {
      throw new Error(
        `Zorunlu Excel sütunları bulunamadı: ${missingHeaders.join(", ")}`,
      );
    }
  }

  private parseRow(
    rowNumber: number,
    row: ExcelJS.Row,
    headerMap: Partial<Record<HeaderKey, number>>,
  ): ParsedCompanyRequestRow {
    const externalCompanyId = this.getNumberFromColumn(
      row,
      headerMap.externalCompanyId,
    );

    const companyName = this.getStringFromColumn(row, headerMap.companyName);

    const requestNumber = this.getNumberFromColumn(
      row,
      headerMap.requestNumber,
    );

    const note = this.getStringFromColumn(row, headerMap.note);

    const externalDocumentId = this.getNumberFromColumn(
      row,
      headerMap.externalDocumentId,
    );

    const documentNumber = this.getStringFromColumn(
      row,
      headerMap.documentNumber,
    );

    const requestType = this.getStringFromColumn(row, headerMap.requestType);

    const requestStatus = this.getStringFromColumn(
      row,
      headerMap.requestStatus,
    );

    const department = this.getStringFromColumn(row, headerMap.department);

    const assignedPersonnel = this.getStringFromColumn(
      row,
      headerMap.assignedPersonnel,
    );

    const informationPerson = this.getStringFromColumn(
      row,
      headerMap.informationPerson,
    );

    const applicationDate = this.getDateFromColumn(
      row,
      headerMap.applicationDate,
    );

    const completionDate = this.getDateFromColumn(
      row,
      headerMap.completionDate,
    );

    const errors: string[] = [];

    if (!externalCompanyId) {
      errors.push("Firma ID zorunludur.");
    }

    if (!requestNumber) {
      errors.push("Talep No zorunludur.");
    }

    return {
      rowNumber,
      externalCompanyId,
      companyName,
      requestNumber,
      note,
      externalDocumentId,
      documentNumber,
      requestType,
      requestStatus,
      department,
      assignedPersonnel,
      informationPerson,
      applicationDate,
      completionDate,
      rawData: this.buildRawData(row, headerMap),
      errorMessage: errors.length > 0 ? errors.join(" ") : null,
    };
  }

  private buildRawData(
    row: ExcelJS.Row,
    headerMap: Partial<Record<HeaderKey, number>>,
  ): Record<string, unknown> {
    const rawData: Record<string, unknown> = {};

    for (const [key, headers] of Object.entries(EXPECTED_HEADERS)) {
      const columnNumber = headerMap[key as HeaderKey];

      rawData[headers[0]] = columnNumber
        ? this.serializeCellValue(row.getCell(columnNumber).value)
        : null;
    }

    return rawData;
  }

  private getStringFromColumn(
    row: ExcelJS.Row,
    columnNumber?: number,
  ): string | null {
    if (!columnNumber) {
      return null;
    }

    return this.getNullableStringValue(row.getCell(columnNumber).value);
  }

  private getNumberFromColumn(
    row: ExcelJS.Row,
    columnNumber?: number,
  ): number | null {
    if (!columnNumber) {
      return null;
    }

    return this.getNumberValue(row.getCell(columnNumber).value);
  }

  private getDateFromColumn(
    row: ExcelJS.Row,
    columnNumber?: number,
  ): Date | null {
    if (!columnNumber) {
      return null;
    }

    return this.getDateValue(row.getCell(columnNumber).value);
  }

  private isEmptyRow(row: ExcelJS.Row): boolean {
    let isEmpty = true;

    row.eachCell({ includeEmpty: true }, (cell) => {
      if (this.getStringValue(cell.value).trim() !== "") {
        isEmpty = false;
      }
    });

    return isEmpty;
  }

  private normalizeHeader(value: string): string {
    return value
      .replace(/^\uFEFF/, "")
      .trim()
      .toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ");
  }

  private getStringValue(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "object") {
      if ("text" in value) {
        return String(value.text);
      }

      if ("result" in value) {
        return this.getStringValue(value.result);
      }

      if ("richText" in value) {
        return value.richText.map((item) => item.text).join("");
      }
    }

    return String(value);
  }

  private getNullableStringValue(value: ExcelJS.CellValue): string | null {
    const stringValue = this.getStringValue(value).trim();

    return stringValue === "" ? null : stringValue;
  }

  private getNumberValue(value: ExcelJS.CellValue): number | null {
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      return value;
    }

    const normalizedValue = this.getStringValue(value)
      .trim()
      .replace(/\s+/g, "");

    if (!/^\d+$/.test(normalizedValue)) {
      return null;
    }

    const parsedValue = Number(normalizedValue);

    return Number.isSafeInteger(parsedValue) ? parsedValue : null;
  }

  private getDateValue(value: ExcelJS.CellValue): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    const rawValue = this.getStringValue(value).trim();

    if (!rawValue) {
      return null;
    }

    const turkishDateTimeMatch = rawValue.match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
    );

    if (turkishDateTimeMatch) {
      const [, day, month, year, hour, minute, second] = turkishDateTimeMatch;

      const parsedDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour ?? 0),
        Number(minute ?? 0),
        Number(second ?? 0),
      );

      if (
        parsedDate.getFullYear() === Number(year) &&
        parsedDate.getMonth() === Number(month) - 1 &&
        parsedDate.getDate() === Number(day)
      ) {
        return parsedDate;
      }
    }

    const databaseDateTimeMatch = rawValue.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/,
    );

    if (databaseDateTimeMatch) {
      const [, year, month, day, hour, minute, second] = databaseDateTimeMatch;

      const parsedDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour ?? 0),
        Number(minute ?? 0),
        Number(second ?? 0),
      );

      if (
        parsedDate.getFullYear() === Number(year) &&
        parsedDate.getMonth() === Number(month) - 1 &&
        parsedDate.getDate() === Number(day)
      ) {
        return parsedDate;
      }
    }

    return null;
  }

  private serializeCellValue(value: ExcelJS.CellValue): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "object") {
      if ("result" in value) {
        return this.serializeCellValue(value.result);
      }

      if ("text" in value) {
        return String(value.text);
      }

      if ("richText" in value) {
        return value.richText.map((item) => item.text).join("");
      }

      return JSON.parse(JSON.stringify(value)) as unknown;
    }

    return value;
  }
}
