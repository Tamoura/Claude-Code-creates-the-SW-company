/**
 * Typed error hierarchy serialised as RFC 7807 problem+json by the Fastify
 * error handler in app.ts. Reused from `.claude/COMPONENT-REGISTRY.md`
 * (AppError) rather than reinvented — Article II.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }

  toProblem(instance?: string): Record<string, unknown> {
    return {
      type: `https://taskflow.example/problems/${this.code.toLowerCase()}`,
      title: this.message,
      status: this.statusCode,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
      ...(instance ? { instance } : {}),
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} ${id} was not found`);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, 'VALIDATION_FAILED', 'Request body failed validation', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}
