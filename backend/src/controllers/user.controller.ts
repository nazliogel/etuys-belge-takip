import type { NextFunction, Request, Response } from "express";

import type { UserService } from "../services/user.service.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  createUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const user = await this.userService.createUser(req.body, req.user.role);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "User created successfully.",
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  };
}
