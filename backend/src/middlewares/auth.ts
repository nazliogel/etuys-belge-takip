import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { AuthSessionRepository } from "../repositories/auth-session.repository.js";
import { HTTP_STATUS } from "../utils/http-status.js";
import { verifyAccessToken } from "../utils/jwt.js";

const authSessionRepository = new AuthSessionRepository();
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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

    let payload: ReturnType<typeof verifyAccessToken>;

    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError("Invalid or expired authentication token.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "INVALID_AUTH_TOKEN",
      });
    }

    const session = await authSessionRepository.findById(payload.sessionId);
    const now = Date.now();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.lastActivityAt.getTime() <= now - INACTIVITY_LIMIT_MS
    ) {
      throw new AppError("Oturum süresi doldu. Lütfen tekrar giriş yapın.", {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: "SESSION_EXPIRED",
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    res.locals.authSessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
};
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== "ADMIN") {
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
