import type { NextFunction, Request, Response } from "express";

import type { AuthService } from "../services/auth.service.js";
import type { LoginInput, RegisterInput } from "../types/auth.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    req: Request<Record<string, never>, unknown, RegisterInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);

      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<Record<string, never>, unknown, LoginInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new Error("Authenticated user information is missing.");
      }

      const result = await this.authService.getProfile(userId);

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      next(error);
    }
  };
}
