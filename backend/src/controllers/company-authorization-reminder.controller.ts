import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { CompanyAuthorizationReminderPreviewService } from "../services/company-authorization-reminder-preview.service.js";
import { CompanyAuthorizationReminderQueueService } from "../services/company-authorization-reminder-queue.service.js";
import { CompanyAuthorizationReminderWorkerService } from "../services/company-authorization-reminder-worker.service.js";
import { EmailService } from "../services/email.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyAuthorizationReminderController {
  constructor(
    private readonly previewService =
      new CompanyAuthorizationReminderPreviewService(),
    private readonly queueService =
      new CompanyAuthorizationReminderQueueService(),
    private readonly workerService =
      new CompanyAuthorizationReminderWorkerService(),
    private readonly emailService = new EmailService(),
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

  listCandidates = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    const candidates = await this.previewService.createPreviews();

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Yetki süresi bildirim adayları listelendi.",
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
  };

  sendTestEmail = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    const authorizationId = Number(req.body?.authorizationId);

    if (
      !Number.isInteger(authorizationId) ||
      authorizationId <= 0
    ) {
      throw new AppError(
        "Geçerli bir authorizationId gönderilmelidir.",
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "INVALID_AUTHORIZATION_ID",
        },
      );
    }

    const previews = await this.previewService.createPreviews();

    const preview = previews.find(
      (item) => item.authorizationId === authorizationId,
    );

    if (!preview) {
      throw new AppError(
        "Seçilen firma için uygun yetki süresi bildirim adayı bulunamadı.",
        {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "AUTHORIZATION_REMINDER_CANDIDATE_NOT_FOUND",
        },
      );
    }

    if (!preview.canSend) {
      throw new AppError(
        `Eksik bilgiler nedeniyle test e-postası gönderilemez: ${preview.warnings.join(
          ", ",
        )}`,
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "AUTHORIZATION_REMINDER_HAS_MISSING_DATA",
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
        "Yetki süresi test e-postası yalnızca tanımlı test alıcısına gönderildi.",
      data: {
        authorizationId: preview.authorizationId,
        companyId: preview.companyId,
        companyName: preview.companyName,
        reminderMonth: preview.reminderMonth,
        targetDate: preview.targetDate,
        testRecipient: result.testRecipient,
        cc: preview.cc,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      },
    });
  };

  enqueueCandidates = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    const result = await this.queueService.enqueueDueReminders();

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message:
        "Uygun yetki süresi bildirimleri PENDING kuyruğuna kaydedildi.",
      data: {
        ...result,
        emailSent: false,
      },
    });
  };

  listPendingReminders = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    const requestedLimit = Number(req.query.limit);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;

    const result =
      await this.queueService.listPendingReminders(limit);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "PENDING yetki süresi bildirimleri listelendi.",
      data: result,
    });
  };

  processPendingReminders = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    this.checkAdmin(req);

    const result =
      await this.workerService.processPendingReminders();

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: result.processed
        ? "PENDING yetki süresi bildirimleri işlendi."
        : `Kuyruk işlenmedi: ${result.reason ?? "Bilinmeyen neden"}`,
      data: result,
    });
  };
}

export const companyAuthorizationReminderController =
  new CompanyAuthorizationReminderController();