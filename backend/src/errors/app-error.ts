export type AppErrorOptions = {
  statusCode: number;
  code: string;
  errors?: {
    field?: string;
    message: string;
  }[];
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: {
    field?: string;
    message: string;
  }[];

  constructor(message: string, options: AppErrorOptions) {
    super(message);

    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.errors = options.errors;
  }
}
