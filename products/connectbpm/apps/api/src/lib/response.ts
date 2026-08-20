/**
 * Uniform response envelope.
 *
 * CONVENTION (binding for all downstream agents):
 *   Every route returns `sendOk`, or throws. Do not hand-roll a reply body —
 *   the web client and the E2E suite both assume this shape, and the
 *   cross-tenant isolation suite (AC-049/AC-050) asserts against `error.code`.
 */
import type { FastifyReply } from 'fastify';

export interface ErrorDetail {
  field: string;
  message: string;
}

/** What the error handler produces and what the client receives. */
export interface ErrorPayload {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetail[] | undefined;
  requestId?: string | undefined;
}

export interface ErrorBody {
  error: Omit<ErrorPayload, 'status'>;
}

export function sendOk<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  return reply.status(statusCode).send(data);
}

export function sendError(
  reply: FastifyReply,
  payload: ErrorPayload
): FastifyReply {
  const body: ErrorBody = {
    error: {
      code: payload.code,
      message: payload.message,
      details: payload.details,
      requestId: payload.requestId,
    },
  };
  return reply.status(payload.status).send(body);
}
