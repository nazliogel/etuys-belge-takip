import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { ApprovalService } from "../services/approval.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

type ReviewChangeParams = {
  id: string;
  changeId: string;
};

type ReviewChangeBody = {
  status: "APPROVED" | "REJECTED";
  rejectedReason?: string | null;
};

export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  reviewChange = async (
    req: Request<ReviewChangeParams, unknown, ReviewChangeBody>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const result = await this.approvalService.reviewChange({
      importBatchId: Number(req.params.id),
      changeId: Number(req.params.changeId),
      reviewedById: req.user.id,
      status: req.body.status,
      rejectedReason: req.body.rejectedReason ?? null,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message:
        req.body.status === "APPROVED"
          ? "Change approved successfully."
          : "Change rejected successfully.",
      data: result,
    });
  };
}
