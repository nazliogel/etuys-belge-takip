import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { CompanyIdentityImportService } from "../services/company-identity-import.service.js";
import type { CompanyIdentityService } from "../services/company-identity.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyIdentityController {
  constructor(
    private readonly service: CompanyIdentityService,
    private readonly importService: CompanyIdentityImportService,
  ) {}

  getByCompanyId = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const companyId = Number(req.params.companyId);

    const data = await this.service.getByCompanyId(companyId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company identity fetched successfully.",
      data,
    });
  };

  updateConsultant = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    const companyId = Number(req.params.companyId);
    const { consultant } = req.body;

    if (!consultant || typeof consultant !== "string") {
      throw new AppError("Consultant is required.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "CONSULTANT_REQUIRED",
      });
    }

    const data = await this.service.updateConsultant(
      companyId,
      consultant.trim(),
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company consultant updated successfully.",
      data,
    });
  };

  importExcel = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    if (!req.file) {
      throw new AppError("Excel file is required.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "COMPANY_IDENTITY_FILE_REQUIRED",
      });
    }

    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const data = await this.importService.import({
      file: req.file,
      uploadedById: req.user.id,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company identity import completed successfully.",
      data,
    });
  };
}
