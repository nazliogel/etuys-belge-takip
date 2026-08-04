import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new AppError("Authentication token is required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_TOKEN_REQUIRED",
      });
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();

    if (!token) {
      throw new AppError("Authentication token is required.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "AUTH_TOKEN_REQUIRED",
      });
    }

    const payload = verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError("Invalid or expired authentication token.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "INVALID_AUTH_TOKEN",
      }),
    );
  }
};
