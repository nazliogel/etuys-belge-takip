import type { Request, Response } from "express";

import type { CompanyContactService } from "../services/company-contact.service.js";
import type { ApiResponse } from "../types/api-response.js";
import { sendSuccessResponse } from "../utils/api-response.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import { AppError } from "../errors/app-error.js";

export class CompanyContactController {
  constructor(private readonly service: CompanyContactService) {}

  list = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);

    const data = await this.service.list(companyId);

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company contacts fetched successfully.",
      data,
    });
  };

  create = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);
    const { fullName, email, phone, position } = req.body;

    const data = await this.service.create(companyId, {
      fullName,
      email,
      phone,
      position,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: "Company contact created successfully.",
      data,
    });
  };

  update = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);
    const contactId = Number(req.params.contactId);
    const { fullName, email, phone, position } = req.body;

    const data = await this.service.update(companyId, contactId, {
      fullName,
      email,
      phone,
      position,
    });

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "Company contact updated successfully.",
      data,
    });
  };
  updateStatus = async (req: Request, res: Response<ApiResponse<unknown>>) => {
    const companyId = Number(req.params.companyId);
    const contactId = Number(req.params.contactId);

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0 ||
      !Number.isSafeInteger(contactId) ||
      contactId <= 0
    ) {
      throw new AppError("Firma veya iletişim kişisi ID'si geçersiz.", {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: "INVALID_CONTACT_PARAMS",
      });
    }

    const data = await this.service.updateStatus(
      companyId,
      contactId,
      req.body?.isActive,
    );

    return sendSuccessResponse(res, {
      statusCode: HTTP_STATUS.OK,
      message: "İletişim kişisinin durumu güncellendi.",
      data,
    });
  };
}
