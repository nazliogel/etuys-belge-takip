import fs from "node:fs/promises";
import { Router } from "express";
import { prisma } from "../config/env.js";
import { importUpload } from "../config/upload.js";
import { authenticate } from "../middlewares/auth.js";
import { ImportedRealizationImportService } from "../services/imported-realization-import.service.js";
import { ImportedDeclarationImportService } from "../services/imported-declaration-import.service.js";
import { DomesticRealizationImportService } from "../services/domestic-realization-import.service.js";
import { validate } from "../middlewares/validate.js";
import {
  compareController,
  importController,
  importProcessController,
} from "../modules/import/import.module.js";
import {
  importBatchIdSchema,
  importBatchListSchema,
  importBatchUploadSchema,
} from "../schemas/import.schema.js";

export const importRouter = Router();

const importedRealizationImportService =
  new ImportedRealizationImportService();

const importedDeclarationImportService =
  new ImportedDeclarationImportService();
const domesticRealizationImportService =
  new DomesticRealizationImportService();

importRouter.use(authenticate);

importRouter.use((req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Bu işlem için yetkiniz bulunmuyor.",
    });
  }

  return next();
});

importRouter.get("/", validate(importBatchListSchema), importController.list);

importRouter.post(
  "/upload",
  importUpload.single("file"),
  validate(importBatchUploadSchema),
  importController.upload,
);

importRouter.post(
  "/imported-declarations",
  importUpload.single("file"),
  async (req, res, next) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "Excel dosyası yüklenmedi.",
      });
      return;
    }

    let batchId: number | undefined;

    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Oturum bulunamadı.",
        });
        return;
      }

      if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
        res.status(400).json({
          success: false,
          message: "Yalnızca .xlsx dosyaları desteklenir.",
        });
        return;
      }

      const batch = await prisma.importBatch.create({
        data: {
          fileName: file.originalname,
          uploadedById: req.user.id,
          importType: "IMPORTED_DECLARATION",
          isFullSnapshot: false,
          status: "PROCESSING",
        },
      });

      batchId = batch.id;

      const result = await importedDeclarationImportService.import(file.path);

      await prisma.$transaction(async (tx) => {
        // Değişen satırları rapor ekranında eski → yeni olarak göstermek için kaydet.
        // Veriler zaten yazıldığı için değişiklikler "APPLIED" durumunda; onay beklemez.
        if (result.changes.length > 0) {
          const changedRows = await tx.importRow.createManyAndReturn({
            data: result.changes.map((change) => ({
              importBatchId: batch.id,
              sheetName: "MAIN",
              rowNumber: change.rowNumber,
              status: "CHANGED" as const,
              externalCompanyId: change.externalCompanyId,
              companyName: change.companyName,
              taxNumber: change.taxNumber,
              authorizationEndDate: change.authorizationEndDate,
              externalDocumentId: change.externalDocumentId,
              documentNumber: change.documentNumber,
              companyId: change.companyId,
            })),
            select: { id: true, rowNumber: true },
          });

          const rowIdByNumber = new Map(
            changedRows.map((row) => [row.rowNumber, row.id]),
          );

          await tx.importChange.createMany({
            data: result.changes.flatMap((change) =>
              change.fields.map((field) => ({
                importBatchId: batch.id,
                importRowId: rowIdByNumber.get(change.rowNumber) ?? null,
                companyId: change.companyId,
                entityType: change.closedDocument
                  ? ("CLOSED_INCENTIVE_DOCUMENT" as const)
                  : ("INCENTIVE_DOCUMENT" as const),
                changeType: "UPDATED" as const,
                fieldName: field.fieldName,
                oldValue: field.oldValue,
                newValue: field.newValue,
                status: "APPLIED" as const,
              })),
            ),
          });
        }

        if (result.errors.length > 0) {
          await tx.importRow.createMany({
            data: result.errors.map((error) => ({
              importBatchId: batch.id,
              sheetName: "MAIN",
              rowNumber: error.rowNumber,
              externalCompanyId: error.externalCompanyId,
              externalDocumentId: error.externalDocumentId,
              status: "INVALID" as const,
              errorMessage: error.message,
            })),
          });
        }

        await tx.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            totalRowCount: result.totalRowCount,
            validRowCount: result.totalRowCount - result.invalidRowCount,
            invalidRowCount: result.invalidRowCount,
            newRowCount: 0,
            changedRowCount: result.changedRowCount,
            unchangedRowCount: result.unchangedRowCount,
          },
        });
      }, { timeout: 60_000 });

      res.json({
        success: true,
        message: "Beyanname tarihi ve tutar aktarımı tamamlandı.",
        data: {
          totalRowCount: result.totalRowCount,
          changedRowCount: result.changedRowCount,
          unchangedRowCount: result.unchangedRowCount,
          invalidRowCount: result.invalidRowCount,
          errors: result.errors,
          importBatchId: batch.id,
        },
      });
    } catch (error) {
      if (batchId !== undefined) {
        try {
          await prisma.importBatch.update({
            where: { id: batchId },
            data: { status: "FAILED", completedAt: new Date() },
          });
        } catch (historyError) {
          console.error("Beyanname aktarım geçmişi güncellenemedi.", historyError);
        }
      }

      next(error);
    } finally {
      await fs.rm(file.path, { force: true }).catch((error) => {
        console.error("Geçici beyanname dosyası silinemedi.", error);
      });
    }
  },
);
importRouter.post(
  "/imported-realizations",
  importUpload.single("file"),
  async (req, res, next) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "Excel dosyası yüklenmedi.",
      });
      return;
    }

    let batchId: number | undefined;

    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Oturum bulunamadı.",
        });
        return;
      }

      if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
        res.status(400).json({
          success: false,
          message: "Yalnızca .xlsx dosyaları desteklenir.",
        });
        return;
      }

      const batch = await prisma.importBatch.create({
        data: {
          fileName: file.originalname,
          uploadedById: req.user.id,
          importType: "IMPORTED_REALIZATION",
          isFullSnapshot: false,
          status: "PROCESSING",
        },
      });

      batchId = batch.id;

      const result = await importedRealizationImportService.import(
        file.path,
      );

      await prisma.$transaction(async (tx) => {
        if (result.errors.length > 0) {
          await tx.importRow.createMany({
            data: result.errors.map((error) => ({
              importBatchId: batch.id,
              sheetName: "MAIN",
              rowNumber: error.rowNumber,
              externalCompanyId: error.externalCompanyId,
              externalDocumentId: error.externalDocumentId,
              status: "INVALID" as const,
              errorMessage: error.message,
            })),
          });
        }

        await tx.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            totalRowCount: result.totalRowCount,
            validRowCount:
              result.totalRowCount - result.invalidRowCount,
            invalidRowCount: result.invalidRowCount,
            newRowCount: result.newRowCount,
            changedRowCount: result.changedRowCount,
            unchangedRowCount: result.unchangedRowCount,
          },
        });
      });

      res.status(200).json({
        success: true,
        message: "İthal Gerçekleşme Excel aktarımı tamamlandı.",
        data: {
          ...result,
          importBatchId: batch.id,
        },
      });
    } catch (error) {
      if (batchId !== undefined) {
        try {
          await prisma.importBatch.update({
            where: { id: batchId },
            data: {
              status: "FAILED",
              completedAt: new Date(),
            },
          });
        } catch (historyError) {
          console.error(
            "Aktarım geçmişinin hata durumu kaydedilemedi:",
            historyError,
          );
        }
      }

      next(error);
    } finally {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(
          "Geçici Excel dosyası silinemedi:",
          error,
        );
      }
    }
  },
);

importRouter.post(
  "/domestic-realizations",
  importUpload.single("file"),
  async (req, res, next) => {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "Excel dosyası yüklenmedi.",
      });
      return;
    }

    let batchId: number | undefined;

    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Oturum bulunamadı.",
        });
        return;
      }

      if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
        res.status(400).json({
          success: false,
          message: "Yalnızca .xlsx dosyaları desteklenir.",
        });
        return;
      }

      const batch = await prisma.importBatch.create({
        data: {
          fileName: file.originalname,
          uploadedById: req.user.id,
          importType: "DOMESTIC_REALIZATION",
          isFullSnapshot: false,
          status: "PROCESSING",
        },
      });

      batchId = batch.id;

      const result = await domesticRealizationImportService.import(
        file.path,
      );

      await prisma.$transaction(async (tx) => {
        if (result.errors.length > 0) {
          await tx.importRow.createMany({
            data: result.errors.map((error) => ({
              importBatchId: batch.id,
              sheetName: "MAIN",
              rowNumber: error.rowNumber,
              status: "INVALID" as const,
              externalCompanyId: error.externalCompanyId,
              externalDocumentId: error.externalDocumentId,
              errorMessage: error.message,
            })),
          });
        }

        await tx.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            totalRowCount: result.totalRowCount,
            validRowCount:
              result.totalRowCount - result.invalidRowCount,
            invalidRowCount: result.invalidRowCount,
            newRowCount: result.newRowCount,
            changedRowCount: result.changedRowCount,
            unchangedRowCount: result.unchangedRowCount,
          },
        });
      });

      res.status(200).json({
        success: true,
        message: "Yerli Gerçekleşme Excel aktarımı tamamlandı.",
        data: {
          ...result,
          importBatchId: batch.id,
        },
      });
    } catch (error) {
      if (batchId !== undefined) {
        try {
          await prisma.importBatch.update({
            where: { id: batchId },
            data: {
              status: "FAILED",
              completedAt: new Date(),
            },
          });
        } catch (historyError) {
          console.error(
            "Yerli gerçekleşme aktarımının hata durumu kaydedilemedi:",
            historyError,
          );
        }
      }

      next(error);
    } finally {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Geçici Excel dosyası silinemedi:", error);
      }
    }
  },
);
importRouter.post(
  "/:id/process",
  validate(importBatchIdSchema),
  importProcessController.process,
);

importRouter.post(
  "/:id/compare",
  validate(importBatchIdSchema),
  compareController.compare,
);

importRouter.get(
  "/:id/changes",
  validate(importBatchIdSchema),
  importController.getChanges,
);

importRouter.get(
  "/:id/rows",
  validate(importBatchIdSchema),
  importController.getRows,
);

importRouter.get(
  "/:id",
  validate(importBatchIdSchema),
  importController.getById,
);