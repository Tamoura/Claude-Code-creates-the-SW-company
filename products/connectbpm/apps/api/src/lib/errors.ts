/**
 * Application error taxonomy.
 *
 * CONVENTION (binding for all downstream agents):
 *   Throw an `AppError` subclass. Never `throw new Error(...)` in a route or
 *   service — the error handler cannot map a bare Error to a status code and
 *   will render it as a 500.
 *
 * ISOLATION RULE (ADR-004 §2, FR-003, AC-052):
 *   A cross-tenant read is a `NotFoundError` — 404, never 403. Existence must
 *   not be disclosed. There is deliberately no `ForbiddenError` for resource
 *   access; `ForbiddenError` is for a permission the caller lacks on a
 *   resource they are already entitled to see.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

/** Also the answer for "exists, but belongs to another tenant". */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

/** Tier allowance exhausted at admission (MET-4, FR-105, FR-113). */
export class QuotaExceededError extends AppError {
  constructor(message = 'Tier instance allowance exhausted', details?: unknown) {
    super(402, 'QUOTA_EXCEEDED', message, details);
  }
}
