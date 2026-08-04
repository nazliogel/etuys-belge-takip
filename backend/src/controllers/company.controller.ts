import type { Request, Response } from "express";

import type { CompanyService } from "../services/company.service.js";
import type {
  CompanyDetail,
  CompanyListResponse,
  UpdateCompanyInput,
} from "../types/company.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  list = async (
    req: Request,
    res: Response<ApiResponse<CompanyListResponse>>,
  ) => {
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

    const data = await this.service.getCompanies({
      page,
      limit,
      search,
      isActive,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Companies fetched successfully.",
      data,
    });
  };

  getById = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<CompanyDetail>>,
  ) => {
    const data = await this.service.getCompanyById(Number(req.params.id));

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company fetched successfully.",
      data,
    });
  };

  update = async (
    req: Request<
      { id: string },
      ApiResponse<CompanyDetail>,
      UpdateCompanyInput
    >,
    res: Response<ApiResponse<CompanyDetail>>,
  ) => {
    const data = await this.service.updateCompany(
      Number(req.params.id),
      req.body,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company updated successfully.",
      data,
    });
  };
}
