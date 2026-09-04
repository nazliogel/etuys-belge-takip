import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { DocumentReminderPreviewService } from "../services/document-reminder-preview.service.js";
import { EmailService } from "../services/email.service.js";
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
    private readonly emailService =
      new EmailService(),
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
      ? previews.filter(
          (preview) => preview.type === type,
        )
      : previews;

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message:
        "Bildirim adayları ön izleme amacıyla listelendi.",
      data: {
        total: candidates.length,
        sendableCount: candidates.filter(
          (candidate) => candidate.canSend,
        ).length,
        warningCount: candidates.filter(
          (candidate) =>
            candidate.warnings.length > 0,
        ).length,
        emailSendingEnabled: false,
        candidates,
      },
    });
  }

  private async sendTestEmail(
    req: Request,
    res: Response<ApiResponse<unknown>>,
    expectedType: ReminderType,
  ) {
    this.checkAdmin(req);

    const documentId = Number(req.body?.documentId);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      throw new AppError(
        "Geçerli bir documentId gönderilmelidir.",
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "INVALID_DOCUMENT_ID",
        },
      );
    }

    const previews =
      await this.previewService.createPreviews();

    const preview = previews.find(
      (item) =>
        item.documentId === documentId &&
        item.type === expectedType,
    );

    if (!preview) {
      throw new AppError(
        "Seçilen belge için uygun bildirim adayı bulunamadı.",
        {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "REMINDER_CANDIDATE_NOT_FOUND",
        },
      );
    }

    if (!preview.canSend) {
      throw new AppError(
        `Eksik bilgiler nedeniyle test maili gönderilemez: ${preview.warnings.join(
          ", ",
        )}`,
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "REMINDER_HAS_MISSING_DATA",
        },
      );
    }

    const result = await this.emailService.sendTest({
      to: preview.recipient,
      cc: preview.cc,
      subject: preview.subject,
      text: preview.text,
      html: preview.html,
      attachments: preview.attachments,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message:
        "Test e-postası yalnızca tanımlı test alıcısına gönderildi.",
      data: {
        documentId: preview.documentId,
        companyName: preview.companyName,
        type: preview.type,
        testRecipient: result.testRecipient,
        cc: preview.cc,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
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

  sendExtensionTest = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    return this.sendTestEmail(
      req,
      res,
      "EXTENSION_APPLICATION",
    );
  };

  sendClosureTest = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    return this.sendTestEmail(
      req,
      res,
      "CLOSURE_APPLICATION",
    );
  };
}

export const documentReminderController =
  new DocumentReminderController();