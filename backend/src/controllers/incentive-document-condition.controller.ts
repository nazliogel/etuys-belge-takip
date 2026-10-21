import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { IncentiveDocumentConditionService } from "../services/incentive-document-condition.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class IncentiveDocumentConditionController {
  constructor(private readonly service: IncentiveDocumentConditionService) {}

  private getUser(req: Request) {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    return req.user;
  }

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const user = this.getUser(req);
    const data = await this.service.list(user.role, {
      status:
        req.query.status === "DRAFT" || req.query.status === "PUBLISHED"
          ? req.query.status
          : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Teşvik belgesi şart maddeleri listelendi.",
      data,
    });
  };

  create = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const data = await this.service.create(req.body);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: "Şart maddesi oluşturuldu.",
      data,
    });
  };

  update = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const id = Number(req.params.id);
    const data = await this.service.update(id, req.body);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Şart maddesi güncellendi.",
      data,
    });
  };

  setStatus = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const id = Number(req.params.id);
    const data = await this.service.setStatus(id, req.body.status);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Şart maddesinin yayın durumu güncellendi.",
      data,
    });
  };

  reorder = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const data = await this.service.reorder(req.body.items);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Şart maddelerinin sıralaması güncellendi.",
      data,
    });
  };

  deactivate = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const id = Number(req.params.id);
    const data = await this.service.deactivate(id);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Şart maddesi pasife alındı.",
      data,
    });
  };
}