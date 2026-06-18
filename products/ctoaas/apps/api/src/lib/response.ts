import { FastifyReply } from 'fastify';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    type: string;
    code: string;
    message: string;
    requestId?: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): FastifyReply {
  const body: SuccessResponse<T> = { success: true, data };
  return reply.status(statusCode).send(body);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
  requestId?: string
): FastifyReply {
  const errorType = `https://ctoaas.dev/errors/${code.toLowerCase()}`;
  const body: ErrorResponse = {
    success: false,
    error: { type: errorType, code, message },
  };
  if (requestId) {
    body.error.requestId = requestId;
  }
  if (details && details.length > 0) {
    body.error.details = details;
  }
  return reply.status(statusCode).send(body);
}
