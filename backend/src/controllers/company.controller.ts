import type { NextFunction, Request, Response } from "express";

import type { CompanyService } from "../services/company.service.js";
import type { CompanyListQuery, UpdateCompanyInput } from "../types/company.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  getCompanies = async (
    req: Request<
      Record<string, never>,
      unknown,
      Record<string, never>,
      CompanyListQuery
    >,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.companyService.getCompanies(req.query);

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  getCompanyById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.companyService.getCompanyById(
        Number(req.params.id),
      );

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  updateCompany = async (
    req: Request<{ id: string }, unknown, UpdateCompanyInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.companyService.updateCompany(
        Number(req.params.id),
        req.body,
      );

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}
