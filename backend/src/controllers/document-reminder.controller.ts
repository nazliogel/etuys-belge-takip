import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { DocumentReminderPreviewService } from "../services/document-reminder-preview.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type ReminderType =
  | "EXTENSION_APPLICATION"
  | "CLOSURE_APPLICATION";

export class DocumentReminderController {
  constructor(
    private readonly previewService =
      new DocumentReminderPreviewService(),
  ) {}

  private checkAdmin(req: Request) {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    if (req.user.role !== "ADMIN") {
      throw new AppError(
        "Bu işlem için yönetici yetkisi gereklidir.",
        {
          statusCode: HTTP_STATUS.FORBIDDEN,
          code: "ADMIN_REQUIRED",
        },
      );
    }
  }

  private async createCandidateResponse(
    res: Response<ApiResponse<unknown>>,
    type?: ReminderType,
  ) {
    const previews =
      await this.previewService.createPreviews();

    const candidates = type
      ? previews.filter((preview) => preview.type === type)
      : previews;

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Bildirim adayları ön izleme amacıyla listelendi.",
      data: {
        total: candidates.length,
        sendableCount: candidates.filter(
          (candidate) => candidate.canSend,
        ).length,
        warningCount: candidates.filter(
          (candidate) => candidate.warnings.length > 0,
        ).length,
        emailSendingEnabled: false,
        candidates,
      },
    });
  }

  listCandidates = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    return this.createCandidateResponse(res);
  };

  listExtensionCandidates = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    return this.createCandidateResponse(
      res,
      "EXTENSION_APPLICATION",
    );
  };

  listClosureCandidates = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    return this.createCandidateResponse(
      res,
      "CLOSURE_APPLICATION",
    );
  };
}

export const documentReminderController =
  new DocumentReminderController();