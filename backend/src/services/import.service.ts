import fs from "node:fs/promises";

import { AppError } from "../errors/app-error.js";
import type { ImportRepository } from "../repositories/import.repository.js";
import type {
  ImportBatchListQuery,
  ImportBatchListResponse,
} from "../types/import.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ImportService {
  constructor(private readonly repository: ImportRepository) {}

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

    try {
      return await this.repository.createBatch({
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
