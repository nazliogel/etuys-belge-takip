import ExcelJS from "exceljs";

import { prisma } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";

type ImportInput = {
  filePath: string;
  fileName: string;
  storedFileName?: string | null;
  uploadedById: number;
};

const FIELDS = {
  landRealization: "Arazi-Arsa Gerçekleşmesi",
  totalLandRealization: "Toplam Arazi-Arsa Gerçekleşmesi",

  mainBuildingRealization: "Ana bina ve tesisleri",
  auxiliaryFacilitiesRealization: "Yardımcı işletmeler bina ve tesisleri",
  administrativeBuildingsRealization: "İdare binaları",
  undergroundGalleriesRealization: "Yeraltı ana galerileri",
  totalBuildingRealization: "Toplam Bina Gerçekleşmesi",

  auxiliaryMachineryRealization: "Yardımcı makine teçhizat giderleri",
  importCustomsRealization: "İthalat ve gümrükleme giderleri",
  transportInsuranceRealization: "Taşıma ve sigorta giderleri",
  assemblyRealization: "Montaj giderleri",
  studyProjectRealization: "Etüt ve proje giderleri",
  otherExpensesRealization: "Diğer giderler",
  expenseDocumentRealization: "Harcama belgesi giderleri",
  totalOtherInvestmentRealization: "Toplam Diğer Yatırım Giderleri",

  domesticRealization: "Yerli Gerçekleşmesi",
  importedRealization: "İthal Gerçekleşmesi",
  exchangeDifferenceRealization: "Kur Farkı Faturası Gerçekleşmesi",
  totalRealizedAmount: "Toplam Gerçekleşen Son Tutar",

  updatedTotalLandRealization: "Güncellenmiş Arazi-Arsa Toplamı",
  updatedTotalBuildingRealization: "Güncellenmiş Bina Toplamı",
  updatedTotalOtherInvestmentRealization: "Güncellenmiş Diğer Yatırım Toplamı",
} as const;

type RealizationField = keyof typeof FIELDS;

type ImportError = {
  rowNumber: number;
  externalDocumentId: number | null;
  message: string;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result);
    if ("richText" in value) {
      return value.richText.map((item) => item.text).join("");
    }
    if ("text" in value) return String(value.text);
    if (value instanceof Date) return value.toISOString();

    throw new Error("Desteklenmeyen Excel hücre biçimi.");
  }

  return String(value).trim();
}

function positiveId(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} geçerli bir sayı olmalıdır.`);
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    throw new Error(`${label} geçersiz.`);
  }

  return id;
}

function decimalValue(
  value: ExcelJS.CellValue,
  label: string,
): Prisma.Decimal | undefined {
  const text = cellText(value).trim();

  // Boş hücre mevcut değeri değiştirmez.
  if (!text) return undefined;

  let normalized = text.replace(/\s/g, "");

  if (typeof value !== "number") {
    if (normalized.includes(",")) {
      // Türkçe sayı: 1.234.567,89 veya 1234567,89
      if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d+$/.test(normalized)) {
        throw new Error(`${label}: geçersiz tutar "${text}".`);
      }

      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
      throw new Error(`${label}: geçersiz tutar "${text}".`);
    }
  }

  const decimal = new Prisma.Decimal(normalized);

  if (!decimal.isFinite()) {
    throw new Error(`${label}: geçersiz tutar.`);
  }

  return decimal;
}

export class DocumentRealizationImportService {
  async import(input: ImportInput) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(input.filePath);

    const worksheet = workbook.worksheets.find(
      (sheet) => normalize(sheet.name) === normalize("Gerçekleşme Bilgileri"),
    );

    if (!worksheet) {
      throw new Error('Excel’de "Gerçekleşme Bilgileri" sayfası bulunamadı.');
    }

    const headers = new Map<string, number>();

    worksheet.getRow(1).eachCell((cell, column) => {
      const header = normalize(cellText(cell.value));

      if (!header) return;

      if (headers.has(header)) {
        throw new Error(`Tekrarlanan Excel başlığı: ${cellText(cell.value)}`);
      }

      headers.set(header, column);
    });

    const requiredHeaders = [
      "Firma ID",
      "Belge ID",
      "Belge Durumu",
      "Veri Durumu",
      ...Object.values(FIELDS),
    ];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.has(normalize(header)),
    );

    if (missingHeaders.length) {
      throw new Error(`Eksik Excel başlıkları: ${missingHeaders.join(", ")}`);
    }

    const getValue = (row: ExcelJS.Row, header: string) => {
      const column = headers.get(normalize(header));
      return column ? row.getCell(column).value : null;
    };

    const getText = (row: ExcelJS.Row, header: string) =>
      cellText(getValue(row, header)).trim();

    const batch = await prisma.importBatch.create({
      data: {
        fileName: input.fileName,
        storedFileName: input.storedFileName ?? null,
        uploadedById: input.uploadedById,
        importType: "DOCUMENT_DETAIL",
        status: "PROCESSING",
        isFullSnapshot: false,
      },
    });

    let totalRowCount = 0;
    let newRowCount = 0;
    let changedRowCount = 0;
    let unchangedRowCount = 0;

    const errors: ImportError[] = [];
    const seen = new Set<string>();

    try {
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);

        if (!row.hasValues) continue;

        totalRowCount += 1;

        let externalDocumentId: number | null = null;

        try {
          const externalCompanyId = positiveId(
            getText(row, "Firma ID"),
            "Firma ID",
          );

          externalDocumentId = positiveId(getText(row, "Belge ID"), "Belge ID");

          const sourceStatus = normalize(getText(row, "Veri Durumu"));

          if (sourceStatus !== normalize("Başarılı")) {
            throw new Error(
              getText(row, "Hata") ||
                `Kaynak veri durumu: ${sourceStatus || "boş"}.`,
            );
          }

          const documentStatus = normalize(getText(row, "Belge Durumu"));

          const isOpen =
            documentStatus === normalize("Açık") || documentStatus === "open";

          const isClosed = /kapal|iptal|closed|cancelled/.test(documentStatus);

          if (!isOpen && !isClosed) {
            throw new Error(
              `Belge durumu tanınmadı: ${getText(row, "Belge Durumu")}`,
            );
          }

          const uniqueKey = `${isOpen ? "OPEN" : "CLOSED"}:${externalDocumentId}`;

          if (seen.has(uniqueKey)) {
            throw new Error("Aynı belge Excel’de birden fazla kez bulunuyor.");
          }

          seen.add(uniqueKey);

          const values: Partial<
            Record<RealizationField, Prisma.Decimal | null>
          > = {};

          const rawData: Record<string, string> = {};

          row.eachCell((cell, column) => {
            const header = cellText(worksheet.getRow(1).getCell(column).value);
            if (header) rawData[header] = cellText(cell.value);
          });

          for (const [field, header] of Object.entries(FIELDS)) {
            const key = field as RealizationField;
            const value = getValue(row, header);
            const text = cellText(value).trim();

            if (
              key.startsWith("updated") &&
              normalize(text) === normalize("Güncellenen Kayıt Yok!")
            ) {
              values[key] = null;
              continue;
            }

            const decimal = decimalValue(value, header);

            if (decimal !== undefined) {
              values[key] = decimal;
            }
          }

          const missingBaseFields = Object.keys(FIELDS).filter(
            (field) =>
              !field.startsWith("updated") &&
              values[field as RealizationField] === undefined,
          );

          if (missingBaseFields.length) {
            throw new Error(
              "Başarılı satırda zorunlu gerçekleşme tutarları boş: " +
                missingBaseFields
                  .map((field) => FIELDS[field as RealizationField])
                  .join(", "),
            );
          }

          const result = await prisma.$transaction(async (tx) => {
            const document = isOpen
              ? await tx.incentiveDocument.findUnique({
                  where: { externalDocumentId: externalDocumentId! },
                  include: { company: true },
                })
              : await tx.closedIncentiveDocument.findUnique({
                  where: { externalDocumentId: externalDocumentId! },
                  include: { company: true },
                });

            if (!document) {
              throw new Error(
                `Belge ${externalDocumentId}, ${isOpen ? "açık" : "kapalı/iptal"} belgelerde bulunamadı.`,
              );
            }

            if (document.company.externalCompanyId !== externalCompanyId) {
              throw new Error(
                "Firma ID ile belgenin bağlı olduğu firma uyuşmuyor.",
              );
            }

            const detail = isOpen
              ? await tx.documentDetail.upsert({
                  where: { documentId: document.id },
                  create: { documentId: document.id },
                  update: {},
                })
              : await tx.documentDetail.upsert({
                  where: { closedDocumentId: document.id },
                  create: { closedDocumentId: document.id },
                  update: {},
                });

            const existing = await tx.documentRealizationInfo.findUnique({
              where: { detailId: detail.id },
            });

            const changed =
              !existing ||
              (
                Object.entries(values) as [
                  RealizationField,
                  Prisma.Decimal | null,
                ][]
              ).some(([field, value]) => {
                const previous = existing[field];

                if (value === null) return previous !== null;
                return previous === null || !value.equals(previous);
              });

            if (changed) {
              await tx.documentRealizationInfo.upsert({
                where: { detailId: detail.id },
                create: {
                  detailId: detail.id,
                  ...values,
                  rawData,
                },
                update: {
                  ...values,
                  rawData,
                },
              });
            }

            const status = !existing
              ? "NEW"
              : changed
                ? "CHANGED"
                : "UNCHANGED";

            await tx.importRow.create({
              data: {
                importBatchId: batch.id,
                sheetName: worksheet.name,
                rowNumber,
                status,
                externalCompanyId,
                companyName: getText(row, "Firma Adı") || null,
                externalDocumentId,
                documentNumber: getText(row, "Belge No") || null,
                companyId: document.companyId,
                documentId: isOpen ? document.id : null,
                rawData,
              },
            });

            return status;
          });

          if (result === "NEW") newRowCount += 1;
          else if (result === "CHANGED") changedRowCount += 1;
          else unchangedRowCount += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          errors.push({
            rowNumber,
            externalDocumentId,
            message,
          });

          await prisma.importRow.create({
            data: {
              importBatchId: batch.id,
              sheetName: worksheet.name,
              rowNumber,
              status: "INVALID",
              externalDocumentId,
              errorMessage: message,
            },
          });
        }
      }

      const validRowCount = newRowCount + changedRowCount + unchangedRowCount;
      const invalidRowCount = errors.length;

      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: validRowCount > 0 ? "COMPLETED" : "FAILED",
          completedAt: new Date(),
          totalRowCount,
          validRowCount,
          invalidRowCount,
          newRowCount,
          changedRowCount,
          unchangedRowCount,
        },
      });

      return {
        batchId: batch.id,
        totalRowCount,
        validRowCount,
        invalidRowCount,
        newRowCount,
        changedRowCount,
        unchangedRowCount,
        errors,
      };
    } catch (error) {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          totalRowCount,
          validRowCount: newRowCount + changedRowCount + unchangedRowCount,
          invalidRowCount: errors.length,
          newRowCount,
          changedRowCount,
          unchangedRowCount,
        },
      });

      throw error;
    }
  }
}
