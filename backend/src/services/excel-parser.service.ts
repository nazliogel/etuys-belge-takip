import path from "node:path";

import ExcelJS from "exceljs";

import { DocumentStatus } from "../generated/prisma/client.js";

export interface ParsedImportRow {
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  taxNumber: string | null;
  authorizationEndDate: Date | null;
  externalDocumentId: number | null;
  documentNumber: string | null;
  documentStartDate: Date | null;
  documentEndDate: Date | null;
  extensionDate: Date | null;
  supportClass: string | null;
  documentStatus: DocumentStatus | null;
  processStatus: string | null;
  rawData: Record<string, unknown>;
  errorMessage: string | null;
}

export interface ParseExcelResult {
  totalRowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  rows: ParsedImportRow[];
}

const EXPECTED_HEADERS = {
  externalCompanyId: ["Firma ID"],
  companyName: ["Firma Adı"],
  taxNumber: ["VKN"],
  authorizationEndDate: ["Yetki Bitiş"],
  externalDocumentId: ["Belge ID"],
  documentNumber: ["Belge No"],
  documentStartDate: ["Belge Başlangıç"],
  documentEndDate: ["Belge Bitiş"],
  extensionDate: ["Süre Uzatım", "Süre Uzatım Tarihi"],
  supportClass: ["Destekleme Sınıfı"],
  processStatus: ["Belge Durumu", "İşlem Durumu"],
} as const;

type HeaderKey = keyof typeof EXPECTED_HEADERS;

export class ExcelParserService {
  async parse(storedFileName: string): Promise<ParseExcelResult> {
    const filePath = path.resolve(
      process.cwd(),
      "uploads",
      "imports",
      storedFileName,
    );

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");
    }

    const headerRow = worksheet.getRow(1);
    const headerMap = this.createHeaderMap(headerRow);

    this.validateHeaders(headerMap);

    const rows: ParsedImportRow[] = [];

    let validRowCount = 0;
    let invalidRowCount = 0;

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      if (this.isEmptyRow(row)) {
        continue;
      }

      const parsedRow = this.parseRow(rowNumber, row, headerMap);

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
      const cellValue = this.normalizeHeader(this.getStringValue(cell.value));

      for (const [key, expectedHeaders] of Object.entries(EXPECTED_HEADERS)) {
        const isMatch = expectedHeaders.some(
          (header) => this.normalizeHeader(header) === cellValue,
        );

        if (isMatch) {
          headerMap[key as HeaderKey] = columnNumber;
        }
      }
    });

    return headerMap;
  }

  private validateHeaders(headerMap: Partial<Record<HeaderKey, number>>): void {
    const missingHeaders = Object.entries(EXPECTED_HEADERS)
      .filter(([key]) => !headerMap[key as HeaderKey])
      .map(([, headers]) => headers[0]);

    if (missingHeaders.length > 0) {
      throw new Error(
        `Excel dosyasında eksik başlıklar var: ${missingHeaders.join(", ")}`,
      );
    }
  }

  private parseRow(
    rowNumber: number,
    row: ExcelJS.Row,
    headerMap: Partial<Record<HeaderKey, number>>,
  ): ParsedImportRow {
    const rawData = this.buildRawData(row, headerMap);

    const externalCompanyId = this.getNumberValue(
      row.getCell(headerMap.externalCompanyId!).value,
    );

    const companyName = this.getNullableStringValue(
      row.getCell(headerMap.companyName!).value,
    );

    const taxNumber = this.getNullableStringValue(
      row.getCell(headerMap.taxNumber!).value,
    );

    const authorizationEndDate = this.getDateValue(
      row.getCell(headerMap.authorizationEndDate!).value,
    );

    const externalDocumentId = this.getNumberValue(
      row.getCell(headerMap.externalDocumentId!).value,
    );

    const documentNumber = this.getNullableStringValue(
      row.getCell(headerMap.documentNumber!).value,
    );

    const documentStartDate = this.getDateValue(
      row.getCell(headerMap.documentStartDate!).value,
    );

    const documentEndDate = this.getDateValue(
      row.getCell(headerMap.documentEndDate!).value,
    );

    const extensionDate = this.getDateValue(
      row.getCell(headerMap.extensionDate!).value,
    );

    const supportClass = this.getNullableStringValue(
      row.getCell(headerMap.supportClass!).value,
    );

    const processStatus = this.getNullableStringValue(
      row.getCell(headerMap.processStatus!).value,
    );

    const errors: string[] = [];

    if (!externalCompanyId) {
      errors.push("Firma ID zorunludur.");
    }

    if (!companyName) {
      errors.push("Firma Adı zorunludur.");
    }

    return {
      rowNumber,
      externalCompanyId,
      companyName,
      taxNumber,
      authorizationEndDate,
      externalDocumentId,
      documentNumber,
      documentStartDate,
      documentEndDate,
      extensionDate,
      supportClass,
      documentStatus: DocumentStatus.OPEN,
      processStatus,
      rawData,
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

      const header = headers[0];

      rawData[header] = columnNumber
        ? this.serializeCellValue(row.getCell(columnNumber).value)
        : null;
    }

    return rawData;
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
    return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
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
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }

    const normalized = this.getStringValue(value).trim().replace(/\s+/g, "");

    if (!/^\d+$/.test(normalized)) {
      return null;
    }

    const parsedValue = Number(normalized);

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

    const turkishDateMatch = rawValue.match(
      /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
    );

    if (turkishDateMatch) {
      const [, day, month, year] = turkishDateMatch;

      const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    const parsedDate = new Date(rawValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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
