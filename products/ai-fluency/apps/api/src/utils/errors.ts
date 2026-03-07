/**
 * errors.ts — AppError class and RFC 7807 error utilities
 *
 * ALL error responses from this API use RFC 7807 Problem Details format.
 * Every error path — validation, auth, rate-limit, server errors — produces this shape:
 *
 * {
 *   "type": "https://api.ai-fluency.connectsw.com/errors/[code]",
 *   "title": "[code]",
 *   "status": 400,
 *   "detail": "Human-readable message",
 *   "instance": "req-correlation-id"
 * }
 */

const ERROR_BASE_URL = 'https://api.ai-fluency.connectsw.com/errors';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly detail: string
  ) {
    super(detail);
    this.name = 'AppError';
    this.statusCode = status; // Fastify uses statusCode for HTTP response code
  }

  toJSON(instance?: string): ProblemDetails {
    return {
      type: `${ERROR_BASE_URL}/${this.code}`,
      title: this.code,
      status: this.status,
      detail: this.detail,
      ...(instance ? { instance } : {}),
    };
  }
}

/**
 * Build an RFC 7807 problem-details response object for non-AppError errors.
 * Use this in the global error handler for Zod validation errors, Fastify
 * schema validation, and unexpected server errors.
 */
export function buildProblemDetails(
  code: string,
  status: number,
  detail: string,
  instance?: string
): ProblemDetails {
  return {
    type: `${ERROR_BASE_URL}/${code}`,
    title: code,
    status,
    detail,
    ...(instance ? { instance } : {}),
  };
}
