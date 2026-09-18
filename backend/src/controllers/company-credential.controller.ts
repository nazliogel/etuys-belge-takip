import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { CompanyCredentialService } from "../services/company-credential.service.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyCredentialController {
  constructor(
    private readonly companyCredentialService: CompanyCredentialService,
  ) {}

  createEmailDraft = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = Number(req.params.companyId);
      const requesterUserId = req.user?.id;
      const requesterRole = req.user?.role;

      if (!Number.isInteger(companyId) || companyId <= 0) {
        throw new AppError("Geçerli bir firma ID bilgisi gereklidir.", {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "INVALID_COMPANY_ID",
        });
      }

      if (!requesterUserId || !requesterRole) {
        throw new AppError("Kullanıcı bilgisi bulunamadı.", {
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          code: "UNAUTHORIZED",
        });
      }

      const result = await this.companyCredentialService.createEmailDraft(
        companyId,
        requesterUserId,
        requesterRole,
      );

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
  checkStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const companyId = Number(req.params.companyId);
      const requesterUserId = req.user?.id;
      const requesterRole = req.user?.role;

      if (!Number.isInteger(companyId) || companyId <= 0) {
        throw new AppError("Geçerli bir firma ID bilgisi gereklidir.", {
          statusCode: HTTP_STATUS.BAD_REQUEST,
          code: "INVALID_COMPANY_ID",
        });
      }

      if (!requesterUserId || !requesterRole) {
        throw new AppError("Kullanıcı bilgisi bulunamadı.", {
          statusCode: HTTP_STATUS.UNAUTHORIZED,
          code: "UNAUTHORIZED",
        });
      }

      const result = await this.companyCredentialService.checkCredentialStatus(
        companyId,
        requesterUserId,
        requesterRole,
      );

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}
