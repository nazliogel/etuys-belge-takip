import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { HTTP_STATUS } from "../utils/http-status.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      errors: error.errors ?? [],
    });

    return;
  }

  console.error("Unhandled error:", error);

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: "An unexpected error occurred.",
    code: "INTERNAL_SERVER_ERROR",
  });
};
