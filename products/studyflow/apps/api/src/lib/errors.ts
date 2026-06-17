/**
 * AppError hierarchy. Every thrown error in the API is an AppError subclass,
 * mapped to an RFC 7807 problem+json body by the single Fastify error handler
 * (see app.ts). `toProblem()` produces that body.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: Record<string, string[]>;
  // RFC 7807 allows arbitrary extension members (e.g. dependentGoals for C-7).
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  /** Extra RFC 7807 extension members merged into the problem body. */
  public extensions?: Record<string, unknown>;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }

  /** Attach extension members to the problem+json body (fluent). */
  withExtensions(extensions: Record<string, unknown>): this {
    this.extensions = { ...this.extensions, ...extensions };
    return this;
  }

  toProblem(instance?: string): ProblemDetails {
    return {
      type: `https://studyflow.app/errors/${this.code
        .toLowerCase()
        .replace(/_/g, '-')}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      ...(instance ? { instance } : {}),
      ...(this.extensions ?? {}),
    };
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message = 'Validation failed',
    errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toProblem(instance?: string): ProblemDetails {
    const problem = super.toProblem(instance);
    if (Object.keys(this.errors).length > 0) {
      problem.errors = this.errors;
    }
    return problem;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
