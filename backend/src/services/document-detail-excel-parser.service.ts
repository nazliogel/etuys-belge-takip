import ExcelJS from "exceljs";

export type RawExcelData = Record<string, unknown>;

export type ParsedDocumentRow = {
  sheetName: "Belgeler";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;
  investmentType: string | null;
  rawData: RawExcelData;
};

export type ParsedProductRow = {
  sheetName: "Urunler";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  productName: string | null;
  us97Code: string | null;
  us97Description: string | null;
  naceCode: string | null;
  naceDescription: string | null;
  unit: string | null;

  existingCapacity: number | null;
  additionalCapacity: number | null;
  totalCapacity: number | null;

  rawData: RawExcelData;
};

export type ParsedSupportRow = {
  sheetName: "Destek Unsurlari";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  supportType: string | null;
  supportTypeCode: string | null;
  supportRate: string | null;
  supportRateCode: string | null;
  supportDescription: string | null;

  rawData: RawExcelData;
};

export type ParsedFinancialInfoRow = {
  sheetName: "Finansal Bilgiler";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  externalFinancialInfoId: string | null;

  totalInvestment: number | null;
  totalFinancing: number | null;
  equity: number | null;
  equityRate: number | null;
  foreignResources: number | null;
  foreignResourcesRate: number | null;

  tlLoan: number | null;
  foreignCurrencyLoan: number | null;
  foreignCurrencyIndexedLoan: number | null;
  domesticLoan: number | null;
  foreignLoan: number | null;
  otherLoans: number | null;
  financialLeasing: number | null;

  domesticMachinery: number | null;
  importedMachinery: number | null;
  totalMachineryExpenses: number | null;

  newMachinery: number | null;
  usedMachinery: number | null;
  importedMachineryUsd: number | null;

  totalBuildingConstructionExpenses: number | null;
  mainBuilding: number | null;
  auxiliaryEnterpriseEquipment: number | null;
  auxiliaryFacilities: number | null;

  otherInvestmentExpenses: number | null;
  landCost: number | null;
  landArrangement: number | null;
  importCustoms: number | null;
  transportInsurance: number | null;
  assembly: number | null;
  studyProject: number | null;
  otherExpenses: number | null;
  generalExpenses: number | null;

  fixedInvestmentUsd: number | null;
  fixedInvestmentCpi: number | null;
  fixedInvestmentUsdFirstCopy: number | null;
  fixedInvestmentCpiFirstCopy: number | null;

  rawData: RawExcelData;
};

export type ParsedDomesticMachineRow = {
  sheetName: "Yerli Liste";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  externalMachineId: number | null;
  sequenceNumber: number | null;

  name: string | null;
  quantity: number | null;
  unitPriceTl: number | null;
  totalTl: number | null;
  unit: string | null;

  vatExemption: string | null;
  vatExemptionDescription: string | null;

  transferRealizedValue: number | null;
  transferRealizedQuantity: number | null;
  transferOutgoingValue: number | null;
  transferOutgoingQuantity: number | null;

  leasingOutgoingValue: number | null;
  leasingOutgoingQuantity: number | null;
  leasingPermittedValue: number | null;
  leasingPermittedQuantity: number | null;

  invoiceRealizedValue: number | null;
  invoiceRealizedQuantity: number | null;

  customsRealizedValue: number | null;
  customsRealizedQuantity: number | null;
  customsPermittedValue: number | null;
  customsPermittedQuantity: number | null;

  exportOutgoingValue: number | null;
  exportOutgoingQuantity: number | null;
  exportPermittedValue: number | null;
  exportPermittedQuantity: number | null;

  financialLeasingRealizedValue: number | null;
  financialLeasingRealizedQuantity: number | null;
  financialLeasingPermittedValue: number | null;
  financialLeasingPermittedQuantity: number | null;

  saleOutgoingValue: number | null;
  saleOutgoingQuantity: number | null;
  salePermittedValue: number | null;
  salePermittedQuantity: number | null;
  saleRealizedQuantity: number | null;
  saleRealizedValue: number | null;

  gtipCode: string | null;
  gtipDescription: string | null;

  transferDocumentNumber: string | null;
  transferIncomingQuantity: number | null;
  transferIncomingAmount: number | null;

  barcode: string | null;
  sellerTaxNumber: string | null;
  sellerEmail: string | null;
  financialLeasingCompany: string | null;
  machineryEquipmentType: string | null;

  rawData: RawExcelData;
};

export type ParsedImportedMachineRow = {
  sheetName: "Ithal Liste";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  externalMachineId: number | null;
  sequenceNumber: number | null;
  name: string | null;
  quantity: number | null;
  unit: string | null;

  gtipCode: string | null;
  gtipDescription: string | null;

  currency: string | null;
  fobAmount: number | null;
  fobAmountTl: number | null;
  cifAmountTl: number | null;

  usedMachine: string | null;

  rawData: RawExcelData;
};

export type ParsedSpecialConditionRow = {
  sheetName: "Ozel Sartlar";
  rowNumber: number;
  externalCompanyId: number | null;
  companyName: string | null;
  externalDocumentId: number;
  documentNumber: string | null;

  conditionCode: string | null;
  conditionName: string | null;
  description: string | null;

  rawData: RawExcelData;
};

export type ParsedDocumentDetailResult = {
  documents: ParsedDocumentRow[];
  products: ParsedProductRow[];
  supports: ParsedSupportRow[];
  financialInfos: ParsedFinancialInfoRow[];
  domesticMachines: ParsedDomesticMachineRow[];
  importedMachines: ParsedImportedMachineRow[];
  specialConditions: ParsedSpecialConditionRow[];

  totalRowCount: number;
};

type HeaderMap = Map<string, number>;

function unwrapCellValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  const objectValue = value as Record<string, unknown>;

  if ("result" in objectValue) {
    return unwrapCellValue(objectValue.result);
  }

  if ("text" in objectValue && typeof objectValue.text === "string") {
    return objectValue.text;
  }

  if ("richText" in objectValue && Array.isArray(objectValue.richText)) {
    return objectValue.richText
      .map((item) => {
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }

        return "";
      })
      .join("");
  }

  if ("hyperlink" in objectValue && "text" in objectValue) {
    return objectValue.text;
  }

  return value;
}

function normalizeValue(value: unknown): string | null {
  const unwrapped = unwrapCellValue(value);

  if (unwrapped === null || unwrapped === undefined || unwrapped === "") {
    return null;
  }

  if (unwrapped instanceof Date) {
    return unwrapped.toISOString();
  }

  const normalized = String(unwrapped).trim();

  return normalized || null;
}

function normalizeInteger(value: unknown): number | null {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return null;
  }

  const cleaned = normalized.replace(/\s/g, "").replace(/\.0+$/, "");

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function normalizeDecimal(value: unknown): number | null {
  const unwrapped = unwrapCellValue(value);

  if (unwrapped === null || unwrapped === undefined || unwrapped === "") {
    return null;
  }

  if (typeof unwrapped === "number") {
    return Number.isFinite(unwrapped) ? unwrapped : null;
  }

  let normalized = String(unwrapped)
    .trim()
    .replace(/\s/g, "")
    .replace(/₺/g, "")
    .replace(/TL/gi, "");

  if (!normalized) {
    return null;
  }

  /*
   * Örnekler:
   * 1.234.567,89 -> 1234567.89
   * 1,234,567.89 -> 1234567.89
   * 1234,56      -> 1234.56
   */
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma > lastDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    normalized = normalized.replace(/,/g, "");
  } else if (lastComma !== -1 && lastDot === -1) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function toJsonValue(value: unknown): unknown {
  const unwrapped = unwrapCellValue(value);

  if (unwrapped === null || unwrapped === undefined) {
    return null;
  }

  if (unwrapped instanceof Date) {
    return unwrapped.toISOString();
  }

  if (
    typeof unwrapped === "string" ||
    typeof unwrapped === "number" ||
    typeof unwrapped === "boolean"
  ) {
    return unwrapped;
  }

  return String(unwrapped);
}

function normalizeHeader(value: unknown): string {
  return (
    normalizeValue(value)
      ?.toLocaleLowerCase("tr-TR")
      .replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

function buildHeaderMap(worksheet: ExcelJS.Worksheet): HeaderMap {
  const map: HeaderMap = new Map();

  const headerRow = worksheet.getRow(1);

  for (
    let columnNumber = 1;
    columnNumber <= worksheet.columnCount;
    columnNumber += 1
  ) {
    const originalHeader = normalizeValue(
      headerRow.getCell(columnNumber).value,
    );

    if (!originalHeader) {
      continue;
    }

    map.set(normalizeHeader(originalHeader), columnNumber);
  }

  return map;
}

function findColumn(headerMap: HeaderMap, aliases: string[]): number | null {
  for (const alias of aliases) {
    const column = headerMap.get(normalizeHeader(alias));

    if (column !== undefined) {
      return column;
    }
  }

  return null;
}

function getCellByAliases(
  row: ExcelJS.Row,
  headerMap: HeaderMap,
  aliases: string[],
): unknown {
  const column = findColumn(headerMap, aliases);

  if (column === null) {
    return null;
  }

  return row.getCell(column).value;
}

function requireColumn(
  worksheet: ExcelJS.Worksheet,
  headerMap: HeaderMap,
  aliases: string[],
  fieldName: string,
): number {
  const column = findColumn(headerMap, aliases);

  if (column === null) {
    throw new Error(
      `"${worksheet.name}" sayfasında "${fieldName}" sütunu bulunamadı. Kabul edilen başlıklar: ${aliases.join(
        ", ",
      )}`,
    );
  }

  return column;
}

function rowToRawData(
  worksheet: ExcelJS.Worksheet,
  row: ExcelJS.Row,
): RawExcelData {
  const rawData: RawExcelData = {};

  const headerRow = worksheet.getRow(1);

  for (
    let columnNumber = 1;
    columnNumber <= worksheet.columnCount;
    columnNumber += 1
  ) {
    const header = normalizeValue(headerRow.getCell(columnNumber).value);

    if (!header) {
      continue;
    }

    rawData[header] = toJsonValue(row.getCell(columnNumber).value);
  }

  return rawData;
}

function getExternalDocumentId(
  worksheet: ExcelJS.Worksheet,
  row: ExcelJS.Row,
  headerMap: HeaderMap,
): number | null {
  const value = getCellByAliases(row, headerMap, [
    "Belge ID",
    "Belge Id",
    "BelgeID",
    "BelgeId",
    "belgeId",
  ]);

  const id = normalizeInteger(value);

  if (id === null) {
    return null;
  }

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      `"${worksheet.name}" sayfasında ${row.number}. satırdaki Belge ID geçersiz: ${String(
        value ?? "",
      )}`,
    );
  }

  return id;
}

function getCommonValues(
  worksheet: ExcelJS.Worksheet,
  row: ExcelJS.Row,
  headerMap: HeaderMap,
) {
  const externalDocumentId = getExternalDocumentId(worksheet, row, headerMap);

  if (externalDocumentId === null) {
    return null;
  }

  return {
    externalCompanyId: normalizeInteger(
      getCellByAliases(row, headerMap, [
        "Firma ID",
        "Firma Id",
        "FirmaID",
        "firmaId",
      ]),
    ),

    companyName: normalizeValue(
      getCellByAliases(row, headerMap, ["Firma Adı", "Firma Adi", "firmaAdi"]),
    ),

    externalDocumentId,

    documentNumber: normalizeValue(
      getCellByAliases(row, headerMap, [
        "Belge No",
        "Belge Numarası",
        "Belge Numarasi",
        "belgeNo",
      ]),
    ),

    rawData: rowToRawData(worksheet, row),
  };
}

export class DocumentDetailExcelParserService {
  async parse(filePath: string): Promise<ParsedDocumentDetailResult> {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(filePath);

    const documentsSheet = this.getRequiredWorksheet(workbook, ["Belgeler"]);

    const productsSheet = this.getRequiredWorksheet(workbook, [
      "Urunler",
      "Ürünler",
    ]);

    const supportsSheet = this.getRequiredWorksheet(workbook, [
      "Destek Unsurlari",
      "Destek Unsurları",
    ]);

    const financialSheet = this.getRequiredWorksheet(workbook, [
      "Finansal Bilgiler",
    ]);

    const domesticSheet = this.getRequiredWorksheet(workbook, ["Yerli Liste"]);

    const importedSheet = this.getRequiredWorksheet(workbook, [
      "Ithal Liste",
      "İthal Liste",
    ]);

    const conditionsSheet = this.getRequiredWorksheet(workbook, [
      "Ozel Sartlar",
      "Özel Şartlar",
    ]);

    const documents = this.parseDocuments(documentsSheet);

    const products = this.parseProducts(productsSheet);

    const supports = this.parseSupports(supportsSheet);

    const financialInfos = this.parseFinancialInfos(financialSheet);

    const domesticMachines = this.parseDomesticMachines(domesticSheet);

    const importedMachines = this.parseImportedMachines(importedSheet);

    const specialConditions = this.parseSpecialConditions(conditionsSheet);

    return {
      documents,
      products,
      supports,
      financialInfos,
      domesticMachines,
      importedMachines,
      specialConditions,

      totalRowCount:
        documents.length +
        products.length +
        supports.length +
        financialInfos.length +
        domesticMachines.length +
        importedMachines.length +
        specialConditions.length,
    };
  }

  private getRequiredWorksheet(
    workbook: ExcelJS.Workbook,
    aliases: string[],
  ): ExcelJS.Worksheet {
    for (const alias of aliases) {
      const direct = workbook.getWorksheet(alias);

      if (direct) {
        return direct;
      }

      const normalizedAlias = normalizeHeader(alias);

      const worksheet = workbook.worksheets.find(
        (item) => normalizeHeader(item.name) === normalizedAlias,
      );

      if (worksheet) {
        return worksheet;
      }
    }

    throw new Error(
      `Excel dosyasında gerekli çalışma sayfası bulunamadı: ${aliases.join(
        " / ",
      )}`,
    );
  }

  private validateBelgeIdColumn(
    worksheet: ExcelJS.Worksheet,
    headerMap: HeaderMap,
  ): void {
    requireColumn(
      worksheet,
      headerMap,
      ["Belge ID", "Belge Id", "BelgeID", "BelgeId", "belgeId"],
      "Belge ID",
    );
  }

  private parseDocuments(worksheet: ExcelJS.Worksheet): ParsedDocumentRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedDocumentRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Belgeler",
        rowNumber,

        ...common,

        investmentType: normalizeValue(
          getCellByAliases(row, headerMap, ["Yatırım Cinsi", "Yatirim Cinsi"]),
        ),
      });
    }

    return result;
  }

  private parseProducts(worksheet: ExcelJS.Worksheet): ParsedProductRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedProductRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Urunler",
        rowNumber,

        ...common,

        productName: normalizeValue(
          getCellByAliases(row, headerMap, ["Ürün Adı", "Urun Adi"]),
        ),

        us97Code: normalizeValue(
          getCellByAliases(row, headerMap, ["US97 Kodu", "US-97 Kodu"]),
        ),

        us97Description: normalizeValue(
          getCellByAliases(row, headerMap, [
            "US97 Açıklaması",
            "US97 Aciklamasi",
            "US-97 Açıklaması",
          ]),
        ),

        naceCode: normalizeValue(
          getCellByAliases(row, headerMap, ["NACE Kodu", "Nace Kodu"]),
        ),

        naceDescription: normalizeValue(
          getCellByAliases(row, headerMap, [
            "NACE Açıklaması",
            "NACE Aciklamasi",
            "Nace Açıklaması",
          ]),
        ),

        unit: normalizeValue(
          getCellByAliases(row, headerMap, ["Kapasite Birimi", "Birim"]),
        ),

        existingCapacity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Mevcut Kapasite"]),
        ),

        additionalCapacity: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "İlave Kapasite",
            "Ilave Kapasite",
          ]),
        ),

        totalCapacity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Toplam Kapasite"]),
        ),
      });
    }

    return result;
  }

  private parseSupports(worksheet: ExcelJS.Worksheet): ParsedSupportRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedSupportRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Destek Unsurlari",
        rowNumber,

        ...common,

        supportType: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Destek Unsuru",
            "Destek Unsuru Adı",
            "Destek Unsuru Adi",
          ]),
        ),

        supportTypeCode: normalizeValue(
          getCellByAliases(row, headerMap, ["Destek Unsuru Kodu"]),
        ),

        supportRate: normalizeValue(
          getCellByAliases(row, headerMap, ["Destek Oranı", "Destek Orani"]),
        ),

        supportRateCode: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Destek Oran Kodu",
            "Destek Oranı Kodu",
          ]),
        ),

        supportDescription: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Destek Oran Açıklaması",
            "Destek Oran Aciklamasi",
            "Destek Açıklaması",
          ]),
        ),
      });
    }

    return result;
  }

  private parseFinancialInfos(
    worksheet: ExcelJS.Worksheet,
  ): ParsedFinancialInfoRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedFinancialInfoRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Finansal Bilgiler",
        rowNumber,

        ...common,

        externalFinancialInfoId: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Finansal Bilgiler ID",
            "Finansal Bilgi ID",
            "Finansal Bilgi Id",
            "Finansal ID",
            "ID",
          ]),
        ),

        totalInvestment: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Toplam Yatırım",
            "Toplam Yatirim",
          ]),
        ),

        totalFinancing: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Toplam Finansman"]),
        ),

        equity: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Öz Kaynaklar",
            "Özkaynaklar",
            "Oz Kaynaklar",
          ]),
        ),

        equityRate: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Öz Kaynak Oranı",
            "Öz Kaynak Orani",
            "Oz Kaynak Orani",
          ]),
        ),

        foreignResources: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Yabancı Kaynaklar",
            "Yabanci Kaynaklar",
          ]),
        ),

        foreignResourcesRate: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Yabancı Kaynak Oranı",
            "Yabancı Kaynak Orani",
            "Yabanci Kaynak Orani",
          ]),
        ),

        tlLoan: normalizeDecimal(
          getCellByAliases(row, headerMap, ["TL Kredisi"]),
        ),

        foreignCurrencyLoan: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Döviz Kredisi", "Doviz Kredisi"]),
        ),

        foreignCurrencyIndexedLoan: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Dövize Endeksli Kredi",
            "Dovize Endeksli Kredi",
          ]),
        ),

        domesticLoan: normalizeDecimal(
          getCellByAliases(row, headerMap, ["İç Kredi", "Ic Kredi"]),
        ),

        foreignLoan: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Dış Kredi", "Dis Kredi"]),
        ),

        otherLoans: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Diğer Krediler",
            "Diger Krediler",
          ]),
        ),

        financialLeasing: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Finansal Kiralama"]),
        ),

        domesticMachinery: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Yerli Makine Teçhizat",
            "Yerli Makine Techizat",
          ]),
        ),

        importedMachinery: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "İthal Makine Teçhizat",
            "Ithal Makine Techizat",
          ]),
        ),

        totalMachineryExpenses: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Toplam Makine Teçhizat Giderleri",
            "Toplam Makine Techizat Giderleri",
          ]),
        ),

        newMachinery: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Yeni Makine"]),
        ),

        usedMachinery: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Kullanılmış Makine",
            "Kullanilmis Makine",
          ]),
        ),

        importedMachineryUsd: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "İthal Makine Dolar",
            "Ithal Makine Dolar",
          ]),
        ),

        totalBuildingConstructionExpenses: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Toplam Bina İnşaat Giderleri",
            "Toplam Bina Insaat Giderleri",
          ]),
        ),

        mainBuilding: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Ana Bina"]),
        ),

        auxiliaryEnterpriseEquipment: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Yardımcı İşletme Teçhizat",
            "Yardimci Isletme Techizat",
          ]),
        ),

        auxiliaryFacilities: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Yardımcı Tesisler",
            "Yardimci Tesisler",
          ]),
        ),

        otherInvestmentExpenses: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Diğer Yatırım Harcamaları",
            "Diger Yatirim Harcamalari",
          ]),
        ),

        landCost: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Arazi Bedeli"]),
        ),

        landArrangement: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Arazi Düzenlemesi",
            "Arazi Duzenlemesi",
          ]),
        ),

        importCustoms: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "İthalat / Gümrükleme",
            "Ithalat / Gumrukleme",
            "İthalat/Gümrükleme",
          ]),
        ),

        transportInsurance: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Taşıma / Sigorta",
            "Tasima / Sigorta",
            "Taşıma/Sigorta",
          ]),
        ),

        assembly: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Montaj"]),
        ),

        studyProject: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Etüt Proje", "Etut Proje"]),
        ),

        otherExpenses: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Diğer Giderler",
            "Diger Giderler",
          ]),
        ),

        generalExpenses: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Genel Giderler"]),
        ),

        fixedInvestmentUsd: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Sabit Yatırım Tutarı Dolar",
            "Sabit Yatirim Tutari Dolar",
          ]),
        ),

        fixedInvestmentCpi: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Sabit Yatırım Tutarı TÜFE",
            "Sabit Yatirim Tutari TUFE",
          ]),
        ),

        fixedInvestmentUsdFirstCopy: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Sabit Yatırım Tutarı Dolar İlk Nüsha",
            "Sabit Yatirim Tutari Dolar Ilk Nusha",
          ]),
        ),

        fixedInvestmentCpiFirstCopy: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "Sabit Yatırım Tutarı TÜFE İlk Nüsha",
            "Sabit Yatirim Tutari TUFE Ilk Nusha",
          ]),
        ),
      });
    }

    return result;
  }

  private parseDomesticMachines(
    worksheet: ExcelJS.Worksheet,
  ): ParsedDomesticMachineRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedDomesticMachineRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Yerli Liste",
        rowNumber,

        ...common,

        sequenceNumber: normalizeInteger(
          getCellByAliases(row, headerMap, [
            "siraNo",
            "Sıra No",
            "Sira No",
            "Sıra",
          ]),
        ),

        externalMachineId: normalizeInteger(
          getCellByAliases(row, headerMap, [
            "yerliMakineId",
            "Makine ID",
            "Makine Id",
            "Liste ID",
            "Liste Id",
            "ID",
          ]),
        ),

        name: normalizeValue(
          getCellByAliases(row, headerMap, [
            "adiOzelligi",
            "Makine Teçhizat Adı",
            "Makine Techizat Adi",
            "Makine Adı",
            "Makine Adi",
          ]),
        ),

        quantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["miktari", "Miktar", "Adet"]),
        ),

        unitPriceTl: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "fiyatiTl",
            "Birim Fiyat TL",
            "Birim Fiyatı TL",
            "Birim Fiyati TL",
          ]),
        ),

        totalTl: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "tutariKdvHaric",
            "Toplam TL",
            "Toplam Tutar TL",
            "Toplam Tutar",
          ]),
        ),

        unit: normalizeValue(
          getCellByAliases(row, headerMap, ["birimCSDETAY", "Birim"]),
        ),

        vatExemption: normalizeValue(
          getCellByAliases(row, headerMap, ["kdvIstisnasi"]),
        ),

        vatExemptionDescription: normalizeValue(
          getCellByAliases(row, headerMap, ["kdvIstisnasiCSDETAY"]),
        ),

        transferRealizedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGerceklesenDeger"]),
        ),

        transferRealizedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGerceklesenMiktar"]),
        ),

        transferOutgoingValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGidenDeger"]),
        ),

        transferOutgoingQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGidenMiktar"]),
        ),

        leasingOutgoingValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["kiralamaGidenDeger"]),
        ),

        leasingOutgoingQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["kiralamaGidenMiktar"]),
        ),

        leasingPermittedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["kiralamaIzinVerilenDeger"]),
        ),

        leasingPermittedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["kiralamaIzinVerilenMiktar"]),
        ),

        invoiceRealizedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["faturaGerceklesenDeger"]),
        ),

        invoiceRealizedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["faturaGerceklesenMiktar"]),
        ),

        customsRealizedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["gumrukGerceklesenDeger"]),
        ),

        customsRealizedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["gumrukGerceklesenMiktar"]),
        ),

        customsPermittedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["gumrukIzinVerilenDeger"]),
        ),

        customsPermittedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["gumrukIzinVerilenMiktar"]),
        ),

        exportOutgoingValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["ihracGidenDeger"]),
        ),

        exportOutgoingQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["ihracGidenMiktar"]),
        ),

        exportPermittedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["ihracIzinVerilenDeger"]),
        ),

        exportPermittedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["ihracIzinVerilenMiktar"]),
        ),

        financialLeasingRealizedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "finansalKiralamaGerceklesenDeger",
          ]),
        ),

        financialLeasingRealizedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "finansalKiralamaGerceklesenMiktar",
          ]),
        ),

        financialLeasingPermittedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "finansalKiralamaIzinVerilenDeger",
          ]),
        ),

        financialLeasingPermittedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "finansalKiralamaIzinVerilenMiktar",
          ]),
        ),

        saleOutgoingValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisGidenDeger"]),
        ),

        saleOutgoingQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisGidenMiktar"]),
        ),

        salePermittedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisIzinVerilenDeger"]),
        ),

        salePermittedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisIzinVerilenMiktar"]),
        ),

        saleRealizedQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisGerceklesenMiktar"]),
        ),

        saleRealizedValue: normalizeDecimal(
          getCellByAliases(row, headerMap, ["satisGerceklesenDeger"]),
        ),

        gtipCode: normalizeValue(
          getCellByAliases(row, headerMap, [
            "gtipNo",
            "GTİP Kodu",
            "GTIP Kodu",
            "GTİP",
            "GTIP",
          ]),
        ),

        gtipDescription: normalizeValue(
          getCellByAliases(row, headerMap, [
            "gtipAciklama",
            "GTİP Açıklaması",
            "GTIP Açıklaması",
            "GTIP Aciklamasi",
          ]),
        ),

        transferDocumentNumber: normalizeValue(
          getCellByAliases(row, headerMap, ["devirBelgeNo"]),
        ),

        transferIncomingQuantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGelenMiktar"]),
        ),

        transferIncomingAmount: normalizeDecimal(
          getCellByAliases(row, headerMap, ["devirGelenTutar"]),
        ),

        barcode: normalizeValue(getCellByAliases(row, headerMap, ["barkod"])),

        sellerTaxNumber: normalizeValue(
          getCellByAliases(row, headerMap, ["saticiVergiNo"]),
        ),

        sellerEmail: normalizeValue(
          getCellByAliases(row, headerMap, ["saticiMailAdresi"]),
        ),

        financialLeasingCompany: normalizeValue(
          getCellByAliases(row, headerMap, ["finansalKiralamaKurumu"]),
        ),

        machineryEquipmentType: normalizeValue(
          getCellByAliases(row, headerMap, ["makineTechizatTipi"]),
        ),
      });
    }

    return result;
  }

  private parseImportedMachines(
    worksheet: ExcelJS.Worksheet,
  ): ParsedImportedMachineRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedImportedMachineRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Ithal Liste",
        rowNumber,

        ...common,

        externalMachineId: normalizeInteger(
          getCellByAliases(row, headerMap, [
            "Makine ID",
            "Makine Id",
            "Liste ID",
            "Liste Id",
            "ID",
          ]),
        ),

        sequenceNumber: normalizeInteger(
          getCellByAliases(row, headerMap, ["Sıra No", "Sira No", "Sıra"]),
        ),

        name: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Makine Teçhizat Adı",
            "Makine Techizat Adi",
            "Makine Adı",
            "Makine Adi",
            "Malzeme Adı",
            "Malzeme Adi",
            "Adı",
            "Adi",
          ]),
        ),

        quantity: normalizeDecimal(
          getCellByAliases(row, headerMap, ["Miktar", "Adet"]),
        ),

        unit: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Birim",
            "Ölçü Birimi",
            "Olcu Birimi",
          ]),
        ),

        gtipCode: normalizeValue(
          getCellByAliases(row, headerMap, [
            "GTİP Kodu",
            "GTIP Kodu",
            "GTİP",
            "GTIP",
          ]),
        ),

        gtipDescription: normalizeValue(
          getCellByAliases(row, headerMap, [
            "GTİP Açıklaması",
            "GTIP Açıklaması",
            "GTIP Aciklamasi",
          ]),
        ),

        currency: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Döviz Cinsi",
            "Doviz Cinsi",
            "Para Birimi",
          ]),
        ),

        fobAmount: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "FOB Tutarı",
            "FOB Tutari",
            "FOB Tutar",
          ]),
        ),

        fobAmountTl: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "FOB Tutarı TL",
            "FOB Tutari TL",
            "FOB TL",
          ]),
        ),

        cifAmountTl: normalizeDecimal(
          getCellByAliases(row, headerMap, [
            "CIF Tutarı TL",
            "CIF Tutari TL",
            "CİF Tutarı TL",
            "CIF TL",
          ]),
        ),

        usedMachine: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Kullanılmış Makine",
            "Kullanilmis Makine",
            "Kullanılmış",
            "Kullanilmis",
          ]),
        ),
      });
    }

    return result;
  }

  private parseSpecialConditions(
    worksheet: ExcelJS.Worksheet,
  ): ParsedSpecialConditionRow[] {
    const headerMap = buildHeaderMap(worksheet);

    this.validateBelgeIdColumn(worksheet, headerMap);

    const result: ParsedSpecialConditionRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const common = getCommonValues(worksheet, row, headerMap);

      if (!common) {
        continue;
      }

      result.push({
        sheetName: "Ozel Sartlar",
        rowNumber,

        ...common,

        conditionCode: normalizeValue(
          getCellByAliases(row, headerMap, ["Şart Kodu", "Sart Kodu"]),
        ),

        conditionName: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Şart Adı",
            "Sart Adi",
            "Özel Şart",
            "Ozel Sart",
          ]),
        ),

        description: normalizeValue(
          getCellByAliases(row, headerMap, [
            "Açıklama",
            "Aciklama",
            "Şart Açıklaması",
            "Sart Aciklamasi",
          ]),
        ),
      });
    }

    return result;
  }
}
