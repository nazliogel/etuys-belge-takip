import ExcelJS from "exceljs";

export type ParsedCompanyIdentityRow = {
  rowNumber: number;
  externalCompanyId: number;
  investorStatus: string | null;
  taxNumber: string | null;
  mersisNumber: string | null;
  investorAddress: string | null;
  registrationDate: Date | null;
  tradeRegistryNumber: string | null;
  nationalId: string | null;
  city: string | null;
  district: string | null;
  investorType: string | null;
  mainActivity: string | null;
};

const EXPECTED_HEADERS = [
  "Firma ID",
  "Yatırımcı Durumu",
  "Vergi No",
  "Mersis No",
  "Yatırımcı Adresi",
  "Tescil Tarihi",
  "Ticaret Sicil No",
  "Kimlik No",
  "İl",
  "İlçe (Mernis)",
  "Yatırımcı Türü",
  "Ana Faaliyet Konusu",
];

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value).trim() || null;
}

function normalizeNumberString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export class CompanyIdentityExcelParserService {
  async parse(filePath: string): Promise<ParsedCompanyIdentityRow[]> {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");
    }

    const headerRow = worksheet.getRow(1);

    const headers = EXPECTED_HEADERS.map((_, index) =>
      normalizeValue(headerRow.getCell(index + 1).value),
    );

    EXPECTED_HEADERS.forEach((expectedHeader, index) => {
      if (headers[index] !== expectedHeader) {
        throw new Error(
          `Geçersiz Excel başlığı. Beklenen: "${expectedHeader}", Gelen: "${headers[index] ?? ""}"`,
        );
      }
    });

    const rows: ParsedCompanyIdentityRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const externalCompanyIdValue = row.getCell(1).value;

      if (
        externalCompanyIdValue === null ||
        externalCompanyIdValue === undefined ||
        externalCompanyIdValue === ""
      ) {
        continue;
      }

      const externalCompanyId = Number(externalCompanyIdValue);

      if (!Number.isInteger(externalCompanyId)) {
        throw new Error(
          `${rowNumber}. satırdaki Firma ID geçersiz: ${String(
            externalCompanyIdValue,
          )}`,
        );
      }

      rows.push({
        rowNumber,
        externalCompanyId,

        investorStatus: normalizeValue(row.getCell(2).value),

        taxNumber: normalizeNumberString(row.getCell(3).value),

        mersisNumber: normalizeNumberString(row.getCell(4).value),

        investorAddress: normalizeValue(row.getCell(5).value),

        registrationDate: normalizeDate(row.getCell(6).value),

        tradeRegistryNumber: normalizeValue(row.getCell(7).value),

        nationalId: normalizeNumberString(row.getCell(8).value),

        city: normalizeValue(row.getCell(9).value),

        district: normalizeValue(row.getCell(10).value),

        investorType: normalizeValue(row.getCell(11).value),

        mainActivity: normalizeValue(row.getCell(12).value),
      });
    }

    return rows;
  }
}
