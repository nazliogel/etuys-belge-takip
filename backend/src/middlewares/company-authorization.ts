import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { CompanyRepository } from "../repositories/company.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";

const companyRepository = new CompanyRepository();

function normalizeDate(date: Date): Date {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
}

export const requireActiveCompanyAuthorization = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "COMPANY") {
      next();
      return;
    }

    const company = await companyRepository.findByUserId(req.user.id);

    if (!company) {
      throw new AppError("Company is not assigned to this user.", {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: "USER_COMPANY_NOT_FOUND",
      });
    }

    const authorizationEndDate =
      company.authorization?.authorizationEndDate ?? null;

    const today = normalizeDate(new Date());

    if (
      !authorizationEndDate ||
      normalizeDate(authorizationEndDate) < today
    ) {
      throw new AppError("Firmanızın yetki süresi dolmuştur.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "COMPANY_AUTHORIZATION_EXPIRED",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};