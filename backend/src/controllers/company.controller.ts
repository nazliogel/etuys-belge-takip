import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { CompanyService } from "../services/company.service.js";
import type { UpdateCompanyInput } from "../types/company.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;

    const data = await this.service.getCompanies(
      {
        page,
        limit,
        search,
        isActive,
      },
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Companies fetched successfully.",
      data,
    });
  };

  authorizationRequired = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getAuthorizationRequiredCompanies(
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Authorization required companies fetched successfully.",
      data,
    });
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getCompanyById(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company fetched successfully.",
      data,
    });
  };

  update = async (
    req: Request<{ id: string }, ApiResponse<unknown>, UpdateCompanyInput>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.updateCompany(
      Number(req.params.id),
      req.body,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company updated successfully.",
      data,
    });
  };
}
