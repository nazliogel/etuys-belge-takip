import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { CompanyRequestService } from "../services/company-request.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyRequestController {
  constructor(
    private readonly service: CompanyRequestService,
  ) {}

  list = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);

    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim() || undefined
        : undefined;

    const requestStatus =
      typeof req.query.requestStatus === "string"
        ? req.query.requestStatus.trim() || undefined
        : undefined;

    const requestedCompanyId =
      typeof req.query.companyId === "string"
        ? Number(req.query.companyId)
        : undefined;

    const companyId =
      requestedCompanyId &&
      Number.isSafeInteger(requestedCompanyId) &&
      requestedCompanyId > 0
        ? requestedCompanyId
        : undefined;

    const data = await this.service.getRequests(
      {
        page,
        limit,
        search,
        requestStatus,
        companyId,
      },
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company requests fetched successfully.",
      data,
    });
  };
}