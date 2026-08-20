/**
 * Pure error → envelope mapping.
 *
 * Kept out of the Fastify plugin on purpose: the mapping is the part with the
 * branches and the security-relevant redaction rule, so it is a pure function
 * that can be tested directly, with no app, no port and no database.
 *
 * CONVENTION: to introduce a new error shape, add a matcher and a test. Never
 * grow the fallback.
 */
import { ZodError } from 'zod';
import { AppError } from './errors';
import type { ErrorDetail, ErrorPayload } from './response';

export interface MapErrorContext {
  requestId?: string | undefined;
  isProduction: boolean;
}

interface FastifyLikeError {
  code?: string;
  statusCode?: number;
  validation?: Array<{
    params?: { missingProperty?: string };
    message?: string;
  }>;
}

type Matcher = (
  error: unknown,
  ctx: MapErrorContext
) => ErrorPayload | null;

const matchAppError: Matcher = (error, ctx) => {
  if (!(error instanceof AppError)) return null;
  return {
    status: error.statusCode,
    code: error.code,
    message: error.message,
    details: error.details as ErrorDetail[] | undefined,
    requestId: ctx.requestId,
  };
};

const matchZodError: Matcher = (error, ctx) => {
  if (!(error instanceof ZodError)) return null;
  return {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
    })),
    requestId: ctx.requestId,
  };
};

const matchSchemaValidation: Matcher = (error, ctx) => {
  const validation = (error as FastifyLikeError).validation;
  if (!validation) return null;
  return {
    status: 422,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: validation.map((v) => ({
      field: String(v.params?.missingProperty ?? 'unknown'),
      message: v.message ?? 'Invalid value',
    })),
    requestId: ctx.requestId,
  };
};

/** Framework error codes we translate rather than leak. */
const CODE_MAP: ReadonlyArray<
  readonly [test: (code: string) => boolean, status: number, code: string, message: string]
> = [
  [(c) => c.startsWith('FST_JWT_'), 401, 'UNAUTHORIZED', 'Invalid or expired token'],
  [(c) => c === 'FST_ERR_CTP_BODY_TOO_LARGE', 413, 'BODY_TOO_LARGE', 'Request body too large'],
];

const matchFrameworkCode: Matcher = (error, ctx) => {
  const code = (error as FastifyLikeError).code;
  if (typeof code !== 'string') return null;
  const hit = CODE_MAP.find(([test]) => test(code));
  if (!hit) return null;
  return { status: hit[1], code: hit[2], message: hit[3], requestId: ctx.requestId };
};

const matchRateLimit: Matcher = (error, ctx) => {
  if ((error as FastifyLikeError).statusCode !== 429) return null;
  return {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    requestId: ctx.requestId,
  };
};

const MATCHERS: readonly Matcher[] = [
  matchAppError,
  matchZodError,
  matchSchemaValidation,
  matchFrameworkCode,
  matchRateLimit,
];

/**
 * Redaction is a security property, not a nicety: a Prisma error message names
 * columns and, on a unique-constraint violation, values.
 */
export function mapError(error: unknown, ctx: MapErrorContext): ErrorPayload {
  for (const matcher of MATCHERS) {
    const payload = matcher(error, ctx);
    if (payload) return payload;
  }

  const raw = error instanceof Error ? error.message : String(error);
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: ctx.isProduction ? 'An unexpected error occurred' : raw,
    requestId: ctx.requestId,
  };
}
