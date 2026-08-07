import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { ApprovalService } from "../services/approval.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  approve = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const result = await this.approvalService.approve(
      Number(req.params.id),
      req.user.id,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import approved successfully.",
      data: result,
    });
  };
}
