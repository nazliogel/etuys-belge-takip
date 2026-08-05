import type { Request, Response } from "express";

import type { ImportProcessService } from "../services/import-process.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ImportProcessController {
  constructor(private readonly service: ImportProcessService) {}

  process = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const importBatchId = Number(req.params.id);

    const data = await this.service.process(importBatchId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Import batch processed successfully.",
      data,
    });
  };
}
