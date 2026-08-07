import type { Request, Response } from "express";

import type { CompareService } from "../services/compare.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompareController {
  constructor(private readonly compareService: CompareService) {}

  compare = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const result = await this.compareService.compare(Number(req.params.id));

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import comparison completed successfully.",
      data: result,
    });
  };
}
