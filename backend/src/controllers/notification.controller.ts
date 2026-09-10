import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { NotificationService } from "../services/notification.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class NotificationController {
  constructor(
    private readonly service =
      new NotificationService(),
  ) {}

  private getUserId(req: Request): number {
    if (!req.user) {
      throw new AppError(
        "Authentication required.",
        {
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          code: "AUTH_REQUIRED",
        },
      );
    }

    return req.user.id;
  }

  list = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const userId = this.getUserId(req);
    const requestedLimit = Number(
      req.query.limit ?? 50,
    );

    const result = await this.service.listForUser(
      userId,
      requestedLimit,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Bildirimler listelendi.",
      data: result,
    });
  };

  markAsRead = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const userId = this.getUserId(req);
    const notificationId = Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      throw new AppError(
        "Geçerli bir bildirim kimliği gönderilmelidir.",
        {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "INVALID_NOTIFICATION_ID",
        },
      );
    }

    const updated = await this.service.markAsRead(
      notificationId,
      userId,
    );

    if (!updated) {
      throw new AppError(
        "Bildirim bulunamadı veya daha önce okunmuş.",
        {
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: "NOTIFICATION_NOT_FOUND",
        },
      );
    }

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Bildirim okundu olarak işaretlendi.",
      data: {
        notificationId,
        isRead: true,
      },
    });
  };

  markAllAsRead = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const userId = this.getUserId(req);

    const updatedCount =
      await this.service.markAllAsRead(userId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message:
        "Okunmamış bildirimler okundu olarak işaretlendi.",
      data: {
        updatedCount,
      },
    });
  };
}

export const notificationController =
  new NotificationController();