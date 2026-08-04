import type { Response } from "express";

import type { ApiResponse } from "../types/api-response.js";

type SendSuccessResponseOptions<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export function sendSuccessResponse<T>(
  res: Response<ApiResponse<T>>,
  options: SendSuccessResponseOptions<T>,
) {
  return res.status(options.statusCode).json({
    success: true,
    message: options.message,
    data: options.data,
  });
}
