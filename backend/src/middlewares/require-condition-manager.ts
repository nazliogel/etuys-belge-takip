import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export const requireConditionManager = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "OPERATION") {
    next(
      new AppError("Bu işlem için yetkiniz bulunmuyor.", {
        statusCode: HTTP_STATUS.FORBIDDEN,
        code: "FORBIDDEN",
      }),
    );
    return;
  }

  next();
};