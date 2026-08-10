import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { ImportService } from "../services/import.service.js";
import type { ApiResponse } from "../types/api-response.js";
import type { ImportBatchListResponse } from "../types/import.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

interface UploadImportBody {
  uploadedById: number | string;
  isFullSnapshot?: boolean | string;
}

export class ImportController {
  constructor(private readonly service: ImportService) {}

  list = async (
    req: Request,
    res: Response<ApiResponse<ImportBatchListResponse>>,
  ) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const data = await this.service.getImportBatches({
      page,
      limit,
      status: status as
        | "UPLOADED"
        | "PROCESSING"
        | "WAITING_APPROVAL"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
        | undefined,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import batches fetched successfully.",
      data,
    });
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const data = await this.service.getImportBatch(Number(req.params.id));

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import batch fetched successfully.",
      data,
    });
  };

  upload = async (
    req: Request<Record<string, never>, unknown, UploadImportBody>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.file) {
      throw new AppError("Excel file is required.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "IMPORT_FILE_REQUIRED",
      });
    }

    const uploadedById = Number(req.body.uploadedById);

    const isFullSnapshot =
      req.body.isFullSnapshot === undefined
        ? true
        : req.body.isFullSnapshot === true ||
          req.body.isFullSnapshot === "true";

    const data = await this.service.createImportBatch({
      file: req.file,
      uploadedById,
      isFullSnapshot,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: "Import file uploaded successfully.",
      data,
    });
  };

  getChanges = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const importBatchId = Number(req.params.id);

    const data = await this.service.getImportChanges(importBatchId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import changes fetched successfully.",
      data,
    });
  };

  getRows = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const importBatchId = Number(req.params.id);

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const data = await this.service.getImportRows(
      importBatchId,
      status as
        | "NEW"
        | "CHANGED"
        | "UNCHANGED"
        | "INVALID"
        | "PENDING"
        | undefined,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import rows fetched successfully.",
      data,
    });
  };
}
