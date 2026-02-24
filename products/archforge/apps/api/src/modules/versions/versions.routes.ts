/**
 * Version Routes
 *
 * Nested under /api/v1/artifacts/:artifactId/versions.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { VersionService } from './versions.service.js';
import {
  listVersionsQuerySchema,
  restoreVersionSchema,
} from './versions.schemas.js';

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

const versionRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new VersionService(fastify);

  // GET /:artifactId/versions
  fastify.get('/:artifactId/versions', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { artifactId } = request.params as {
        artifactId: string;
      };
      const query = listVersionsQuerySchema.parse(request.query);
      const result = await service.list(user.id, artifactId, query);
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // GET /:artifactId/versions/:versionId
  fastify.get(
    '/:artifactId/versions/:versionId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { artifactId, versionId } = request.params as {
          artifactId: string;
          versionId: string;
        };
        const result = await service.getById(
          user.id,
          artifactId,
          versionId,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /:artifactId/versions/:fromId/diff/:toId
  fastify.get(
    '/:artifactId/versions/:fromId/diff/:toId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { artifactId, fromId, toId } = request.params as {
          artifactId: string;
          fromId: string;
          toId: string;
        };
        const result = await service.diff(
          user.id,
          artifactId,
          fromId,
          toId,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // POST /:artifactId/versions/:versionId/restore
  fastify.post(
    '/:artifactId/versions/:versionId/restore',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { artifactId, versionId } = request.params as {
          artifactId: string;
          versionId: string;
        };
        const body = restoreVersionSchema.parse(request.body || {});
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.restore(
          user.id,
          artifactId,
          versionId,
          body.changeSummary,
          ip,
          ua,
        );
        return reply.code(201).send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );
};

export default versionRoutes;
