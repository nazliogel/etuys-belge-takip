import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { ClosedDocumentService } from "../services/closed-document.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class ClosedDocumentController {
  constructor(private readonly service: ClosedDocumentService) {}

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

    const data = await this.service.getDocuments(
      {
        page,
        limit,
        search,
      },
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed documents fetched successfully.",
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

    const data = await this.service.getDocumentById(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document fetched successfully.",
      data,
    });
  };

  getProducts = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentProducts(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document products fetched successfully.",
      data,
    });
  };

  getSupports = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentSupports(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document supports fetched successfully.",
      data,
    });
  };

  getFinancialInfo = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentFinancialInfo(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document financial info fetched successfully.",
      data,
    });
  };

  getDomesticMachines = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentDomesticMachines(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document domestic machines fetched successfully.",
      data,
    });
  };

  getImportedMachines = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentImportedMachines(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document imported machines fetched successfully.",
      data,
    });
  };

  getSpecialConditions = async (
    req: Request<{ id: string }>,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getDocumentSpecialConditions(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Closed document special conditions fetched successfully.",
      data,
    });
  };
}
