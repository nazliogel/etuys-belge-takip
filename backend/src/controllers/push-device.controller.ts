import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { PushDeviceRepository } from "../repositories/push-device.repository.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class PushDeviceController {
  constructor(private readonly repository = new PushDeviceRepository()) {}

  private getUserId(req: Request): number {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    return req.user.id;
  }

  private getToken(body: unknown): string {
    const token =
      typeof body === "object" && body !== null && "token" in body
        ? body.token
        : undefined;

    if (
      typeof token !== "string" ||
      token.trim().length === 0 ||
      token.trim().length > 4096
    ) {
      throw new AppError("Geçerli bir cihaz tokenı gönderilmelidir.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_PUSH_TOKEN",
      });
    }

    return token.trim();
  }

  register = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const userId = this.getUserId(req);
    const token = this.getToken(req.body);

    const platform =
      typeof req.body?.platform === "string"
        ? req.body.platform.trim().toUpperCase()
        : "";

    if (platform !== "ANDROID" && platform !== "IOS") {
      throw new AppError("Platform ANDROID veya IOS olmalıdır.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_PUSH_PLATFORM",
      });
    }

    const device = await this.repository.register({
      userId,
      token,
      platform,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Push bildirim cihazı kaydedildi.",
      data: {
        id: device.id,
        platform: device.platform,
        isActive: device.isActive,
      },
    });
  };

  deactivate = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const userId = this.getUserId(req);
    const token = this.getToken(req.body);

    await this.repository.deactivate(userId, token);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Push bildirim cihazı pasifleştirildi.",
      data: { isActive: false },
    });
  };
}

export const pushDeviceController = new PushDeviceController();
