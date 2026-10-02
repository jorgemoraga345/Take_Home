export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode ?? 500;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}


