export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;

  constructor(
    message: string,
    statusCode: number,
    code: string
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.type = `https://ctoaas.dev/errors/${code.toLowerCase()}`;
  }

  toJSON(): {
    type: string;
    title: string;
    status: number;
    detail: string;
  } {
    return {
      type: this.type,
      title: this.code,
      status: this.statusCode,
      detail: this.message,
    };
  }

  static badRequest(message = 'Bad request'): AppError {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  static unauthorized(
    message = 'Unauthorized'
  ): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(
    message = 'Resource not found'
  ): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'Conflict'): AppError {
    return new AppError(message, 409, 'CONFLICT');
  }

  static internal(
    message = 'Internal server error'
  ): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}
