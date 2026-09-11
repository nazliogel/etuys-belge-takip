import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { SupportRequestService } from "../services/support-request.service.js";

export class SupportRequestController {
  constructor(private readonly supportRequestService: SupportRequestService) {}

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("Oturum bilgisi bulunamadı.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        });
      }

      const request = await this.supportRequestService.create(
        {
          id: req.user.id,
          role: req.user.role,
        },
        {
          description:
            typeof req.body.description === "string"
              ? req.body.description
              : "",
        },
      );

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("Oturum bilgisi bulunamadı.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        });
      }

      const status =
        req.query.status === "SENT" ||
        req.query.status === "IN_PROGRESS" ||
        req.query.status === "RESOLVED"
          ? req.query.status
          : undefined;

      const requests = await this.supportRequestService.list(
        {
          id: req.user.id,
          role: req.user.role,
        },
        status,
      );

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("Oturum bilgisi bulunamadı.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        });
      }

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Geçersiz destek talebi ID'si.", {
          statusCode: 400,
          code: "INVALID_SUPPORT_REQUEST_ID",
        });
      }

      const request = await this.supportRequestService.getById(
        {
          id: req.user.id,
          role: req.user.role,
        },
        id,
      );

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

  markInProgress = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("Oturum bilgisi bulunamadı.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        });
      }

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Geçersiz destek talebi ID'si.", {
          statusCode: 400,
          code: "INVALID_SUPPORT_REQUEST_ID",
        });
      }

      const request = await this.supportRequestService.markInProgress(
        {
          id: req.user.id,
          role: req.user.role,
        },
        id,
      );

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };

  resolve = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError("Oturum bilgisi bulunamadı.", {
          statusCode: 401,
          code: "UNAUTHORIZED",
        });
      }

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Geçersiz destek talebi ID'si.", {
          statusCode: 400,
          code: "INVALID_SUPPORT_REQUEST_ID",
        });
      }

      const request = await this.supportRequestService.resolve(
        {
          id: req.user.id,
          role: req.user.role,
        },
        id,
      );

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  };
}
