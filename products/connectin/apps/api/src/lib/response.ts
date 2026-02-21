import { FastifyReply } from 'fastify';
import {
  OffsetPaginationMeta,
  CursorPaginationMeta,
} from './pagination';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: OffsetPaginationMeta | CursorPaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: {
    type: string;
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  meta?: OffsetPaginationMeta | CursorPaginationMeta
): FastifyReply {
  const body: SuccessResponse<T> = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return reply.status(statusCode).send(body);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>
): FastifyReply {
  const errorType = `https://connectin.dev/errors/${code.toLowerCase()}`;
  const body: ErrorResponse = {
    success: false,
    error: { type: errorType, code, message },
  };
  if (details && details.length > 0) {
    body.error.details = details;
  }
  return reply.status(statusCode).send(body);
}
