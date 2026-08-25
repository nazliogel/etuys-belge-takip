import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { CompanyNoteService } from "../services/company-note.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyNoteController {
  constructor(private readonly service: CompanyNoteService) {}

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);

    const data = await this.service.list(companyId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company notes fetched successfully.",
      data,
    });
  };

  create = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);
    const { text } = req.body;

    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.create(companyId, text, req.user.id);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: "Company note created successfully.",
      data,
    });
  };

  update = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);
    const noteId = Number(req.params.noteId);
    const { text } = req.body;

    const data = await this.service.update(companyId, noteId, text);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company note updated successfully.",
      data,
    });
  };
}
