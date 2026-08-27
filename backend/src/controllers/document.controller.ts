import type { Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { DocumentService } from "../services/document.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class DocumentController {
  constructor(private readonly service: DocumentService) {}

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = 20;
    const search =
      typeof req.query.search === "string" ? req.query.search : undefined;

    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;

    const allowedStatuses = [
      "ACTIVE",
      "EXPIRING",
      "EXPIRED",
      "INACTIVE",
    ] as const;

    type DocumentStatus = (typeof allowedStatuses)[number];

    const requestedStatus =
      typeof req.query.status === "string"
        ? req.query.status.toUpperCase()
        : undefined;

    const status =
      requestedStatus &&
      allowedStatuses.includes(requestedStatus as DocumentStatus)
        ? (requestedStatus as DocumentStatus)
        : undefined;

    const data = await this.service.getDocuments(
      {
        page,
        limit,
        search,
        isActive,
        status,
      },
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Documents fetched successfully.",
      data,
    });
  };

  extensionEligible = async (
    req: Request,
    res: Response<ApiResponse<unknown>>,
  ) => {
    if (!req.user) {
      throw new AppError("Authentication required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_REQUIRED",
      });
    }

    const data = await this.service.getExtensionEligibleDocuments(
      req.user.id,
      req.user.role,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Extension eligible documents fetched successfully.",
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
      message: "Document fetched successfully.",
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
      message: "Document products fetched successfully.",
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
      message: "Document supports fetched successfully.",
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
      message: "Document financial info fetched successfully.",
      data,
    });
  };
}
