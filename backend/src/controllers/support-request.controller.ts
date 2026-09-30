import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import type { SupportRequestService } from "../services/support-request.service.js";
import { getSupportRequestFilePath } from "../services/support-request-file.service.js";

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
          files: Array.isArray(req.files) ? req.files : [],
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

  listConsultants = async (
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

      const consultants = await this.supportRequestService.listConsultants({
        id: req.user.id,
        role: req.user.role,
      });

      res.status(200).json({
        success: true,
        data: consultants,
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

  downloadAttachment = async (
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

      const supportRequestId = Number(req.params.id);
      const attachmentId = Number(req.params.attachmentId);

      if (
        !Number.isSafeInteger(supportRequestId) ||
        supportRequestId <= 0 ||
        !Number.isSafeInteger(attachmentId) ||
        attachmentId <= 0
      ) {
        throw new AppError("Geçersiz destek talebi veya dosya ID'si.", {
          statusCode: 400,
          code: "INVALID_SUPPORT_REQUEST_ATTACHMENT_ID",
        });
      }

      const attachment = await this.supportRequestService.getAttachment(
        { id: req.user.id, role: req.user.role },
        supportRequestId,
        attachmentId,
      );

      res.setHeader("X-Content-Type-Options", "nosniff");
      res.download(
        getSupportRequestFilePath(attachment.storedFileName),
        attachment.fileName,
      );
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (
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

      const result = await this.supportRequestService.getUnreadCount({
        id: req.user.id,
        role: req.user.role,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  markUnread = async (
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

      const request = await this.supportRequestService.markUnread(
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
