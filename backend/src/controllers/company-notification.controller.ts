import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { CompanyNotificationService } from "../services/company-notification.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyNotificationController {
  constructor(private readonly service = new CompanyNotificationService()) {}

  private getUserId(req: Request): number {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    return req.user.id;
  }

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const result = await this.service.listForUser(
      this.getUserId(req),
      Number(req.query.limit ?? 50),
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Firma bildirimleri listelendi.",
      data: result,
    });
  };

  markAsRead = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const userId = this.getUserId(req);
    const notificationId = Number(req.params.id);

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      throw new AppError("Geçerli bir bildirim kimliği gönderilmelidir.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_NOTIFICATION_ID",
      });
    }

    const updated = await this.service.markAsRead(notificationId, userId);

    if (!updated) {
      throw new AppError("Bildirim bulunamadı veya daha önce okunmuş.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "COMPANY_NOTIFICATION_NOT_FOUND",
      });
    }

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Firma bildirimi okundu olarak işaretlendi.",
      data: {
        notificationId,
        isRead: true,
      },
    });
  };

  markAsUnread = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const userId = this.getUserId(req);
    const notificationId = Number(req.params.id);

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
      throw new AppError("Geçerli bir bildirim kimliği gönderilmelidir.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_NOTIFICATION_ID",
      });
    }

    const result = await this.service.markAsUnread(notificationId, userId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Firma bildirimi okunmadı olarak işaretlendi.",
      data: result,
    });
  };

  markAllAsRead = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const updatedCount = await this.service.markAllAsRead(this.getUserId(req));

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Firma bildirimleri okundu olarak işaretlendi.",
      data: { updatedCount },
    });
  };
}

export const companyNotificationController =
  new CompanyNotificationController();
