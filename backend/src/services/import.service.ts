import fs from "node:fs/promises";

import { AppError } from "../errors/app-error.js";
import type { ImportRepository } from "../repositories/import.repository.js";
import type { ImportProcessService } from "./import-process.service.js";
import type { CompareService } from "./compare.service.js";
import type { ApprovalService } from "./approval.service.js";
import type {
  ImportBatchListQuery,
  ImportBatchListResponse,
} from "../types/import.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ImportService {
  constructor(
    private readonly repository: ImportRepository,
    private readonly importProcessService: ImportProcessService,
    private readonly compareService: CompareService,
    private readonly approvalService: ApprovalService,
  ) {}

  async createImportBatch(input: {
    file: Express.Multer.File;
    uploadedById: number;
    isFullSnapshot?: boolean;
    importType?: "OPEN" | "CLOSED";
  }) {
    const {
      file,
      uploadedById,
      isFullSnapshot = true,
      importType = "OPEN",
    } = input;

    let batch;

    try {
      batch = await this.repository.createBatch({
        fileName: file.originalname,
        storedFileName: file.filename,
        uploadedById,
        isFullSnapshot,
        importType,
      });
    } catch (error) {
      await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }

    /*
     * Excel'i oku ve ImportRow kayıtlarını oluştur.
     */
    await this.importProcessService.process(batch.id);

    /*
     * Excel ile mevcut veritabanını karşılaştır.
     */
    await this.compareService.compare(batch.id);

    /*
     * Bulunan tüm değişiklikleri kullanıcı onayı beklemeden
     * doğrudan canlı veritabanına uygula.
     */
    await this.approvalService.applyAllPendingChanges(batch.id, uploadedById);

    /*
     * En güncel batch bilgisini döndür.
     * Bu noktada batch COMPLETED olmalıdır.
     */
    return this.getImportBatch(batch.id);
  }

  async getImportBatches(
    query: ImportBatchListQuery,
  ): Promise<ImportBatchListResponse> {
    const page = Math.max(query.page, 1);
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      this.repository.findMany({
        skip,
        take: limit,
        status: query.status,
      }),
      this.repository.count(query.status),
    ]);

    return {
      items,
      totalCount,
    };
  }

  async getImportBatch(id: number) {
    const importBatch = await this.repository.findById(id);

    if (!importBatch) {
      throw new AppError("Import batch not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "IMPORT_BATCH_NOT_FOUND",
      });
    }

    return importBatch;
  }

  async getImportChanges(importBatchId: number) {
    const importBatch = await this.repository.findById(importBatchId);

    if (!importBatch) {
      throw new AppError("Import batch not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "IMPORT_BATCH_NOT_FOUND",
      });
    }

    const [changes, fieldSummary] = await Promise.all([
      this.repository.findChangesByBatchId(importBatchId),
      this.repository.getChangeSummary(importBatchId),
    ]);

    return {
      totalChangeCount: changes.length,

      fieldSummary: fieldSummary
        .map((item) => ({
          fieldName: item.fieldName,
          count: item._count._all,
        }))
        .sort((a, b) => b.count - a.count),

      changes,
    };
  }

  async getImportRows(
    importBatchId: number,
    status?: "NEW" | "CHANGED" | "UNCHANGED" | "INVALID" | "PENDING",
  ) {
    const importBatch = await this.repository.findById(importBatchId);

    if (!importBatch) {
      throw new AppError("Import batch not found.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "IMPORT_BATCH_NOT_FOUND",
      });
    }

    return this.repository.findRowsByBatchId(importBatchId, status);
  }
}
