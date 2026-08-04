import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export const validate =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      next(
        new AppError("Validation failed.", {
          statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          code: "VALIDATION_ERROR",
          errors,
        }),
      );

      return;
    }

    next();
  };
