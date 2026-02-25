/**
 * Share Routes
 *
 * Nested under /api/v1/artifacts/:artifactId/shares.
 * Plus public link resolver at /shares/link/:token.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ShareService } from './shares.service.js';
import {
  createUserShareSchema,
  createLinkShareSchema,
} from './shares.schemas.js';

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

const shareRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ShareService(fastify);

  // POST /:artifactId/shares/user
  fastify.post(
    '/:artifactId/shares/user',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { artifactId } = request.params as {
          artifactId: string;
        };
        const body = createUserShareSchema.parse(request.body);
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.shareWithUser(
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
    },
  );

  // POST /:artifactId/shares/link
  fastify.post(
    '/:artifactId/shares/link',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { artifactId } = request.params as {
          artifactId: string;
        };
        const body = createLinkShareSchema.parse(request.body);
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.createLink(
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
    },
  );

  // GET /:artifactId/shares
  fastify.get('/:artifactId/shares', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { artifactId } = request.params as {
        artifactId: string;
      };
      const result = await service.list(user.id, artifactId);
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // DELETE /:artifactId/shares/:shareId
  fastify.delete(
    '/:artifactId/shares/:shareId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { shareId } = request.params as {
          artifactId: string;
          shareId: string;
        };
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        await service.revoke(user.id, shareId, ip, ua);
        return reply.send({ message: 'Share revoked.' });
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /shares/link/:token (public, no auth)
  fastify.get('/shares/link/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const result = await service.resolveLink(token);
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });
};

export default shareRoutes;
