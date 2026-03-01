/**
 * Comment Routes
 *
 * Nested under /api/v1/artifacts/:artifactId/comments.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { CommentService } from './comments.service.js';
import {
  createCommentSchema,
  updateCommentSchema,
  listCommentsQuerySchema,
} from './comments.schemas.js';

function handleValidationError(error: unknown) {
  if (error instanceof AppError) throw error;
  if (error instanceof z.ZodError) {
    throw new AppError(
      400,
      'validation-error',
      error.errors.map((e) => e.message).join('; '),
    );
  }
  throw error;
}

const commentRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new CommentService(fastify);

  // POST /:artifactId/comments
  fastify.post('/:artifactId/comments', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { artifactId } = request.params as {
        artifactId: string;
      };
      const body = createCommentSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await service.create(
        user.id,
        artifactId,
        body,
        ip,
        ua,
      );
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // GET /:artifactId/comments
  fastify.get('/:artifactId/comments', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { artifactId } = request.params as {
        artifactId: string;
      };
      const query = listCommentsQuerySchema.parse(request.query);
      const result = await service.list(user.id, artifactId, query);
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // PUT /:artifactId/comments/:commentId
  fastify.put(
    '/:artifactId/comments/:commentId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { commentId } = request.params as {
          artifactId: string;
          commentId: string;
        };
        const body = updateCommentSchema.parse(request.body);
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.update(
          user.id,
          commentId,
          body,
          ip,
          ua,
        );
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // DELETE /:artifactId/comments/:commentId
  fastify.delete(
    '/:artifactId/comments/:commentId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { commentId } = request.params as {
          artifactId: string;
          commentId: string;
        };
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        await service.delete(user.id, commentId, ip, ua);
        return reply.send({ message: 'Comment deleted.' });
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // POST /:artifactId/comments/:commentId/resolve
  fastify.post(
    '/:artifactId/comments/:commentId/resolve',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { commentId } = request.params as {
          artifactId: string;
          commentId: string;
        };
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.resolve(user.id, commentId, ip, ua);
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );
};

export default commentRoutes;
