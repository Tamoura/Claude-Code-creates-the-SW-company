import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError, ConflictError, NotFoundError } from './errors';

const PROBLEM_TYPE = 'https://taskflow.example/problems';

/**
 * One error boundary for the whole API: every failure leaves as RFC 7807
 * problem+json, and internal messages are never echoed to the client.
 *
 * Registered before the routes — a handler added after a plugin has booted does
 * not apply inside that plugin's context, which is how Prisma errors quietly
 * become 500s. [NFR-001]
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const problem = toProblem(error);

    if (problem) {
      return reply
        .code(problem.statusCode)
        .type('application/problem+json')
        .send(problem.toProblem(request.url));
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply
      .code(500)
      .type('application/problem+json')
      .send({
        type: `${PROBLEM_TYPE}/internal`,
        title: 'Internal Server Error',
        status: 500,
        code: 'INTERNAL',
        instance: request.url,
      });
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .code(404)
      .type('application/problem+json')
      .send({
        type: `${PROBLEM_TYPE}/not_found`,
        title: `Route ${request.method} ${request.url} not found`,
        status: 404,
        code: 'NOT_FOUND',
      })
  );
}

/** Maps a thrown error to an AppError, or null when it has no safe mapping. */
function toProblem(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return new NotFoundError('Resource', 'requested');
    }
    if (error.code === 'P2002') {
      return new ConflictError('a resource with that unique value already exists');
    }
  }

  return null;
}
