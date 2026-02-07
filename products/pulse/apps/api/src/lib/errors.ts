/**
 * AppError hierarchy following RFC 7807 Problem Details.
 * Adapted from invoiceforge component registry.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.type = `https://pulse.dev/errors/${code.toLowerCase().replace(/_/g, '-')}`;
  }

  toJSON() {
    return {
      type: this.type,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'Not Found';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'Unauthorized';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'Forbidden';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'Bad Request';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'Conflict';
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message = 'Validation failed',
    errors: Record<string, string[]> = {}
  ) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'Validation Error';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: Object.entries(this.errors).map(([field, messages]) => ({
        field,
        message: messages.join(', '),
      })),
    };
  }
}
