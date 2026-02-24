/**
 * Artifact Routes - registered under /api/v1/projects
 *
 * Thin route handlers that delegate to ArtifactService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ArtifactService } from './artifacts.service.js';
import {
  generateArtifactSchema,
  listArtifactsQuerySchema,
  updateArtifactSchema,
  regenerateArtifactSchema,
} from './artifacts.schemas.js';

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

const artifactRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ArtifactService(fastify);

  // POST /:projectId/artifacts/generate
  fastify.post(
    '/:projectId/artifacts/generate',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId } = request.params as {
          projectId: string;
        };
        const body = generateArtifactSchema.parse(request.body);
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.generate(
          user.id,
          projectId,
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

  // GET /:projectId/artifacts
  fastify.get(
    '/:projectId/artifacts',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId } = request.params as {
          projectId: string;
        };
        const query = listArtifactsQuerySchema.parse(
          request.query,
        );
        const result = await service.list(
          user.id,
          projectId,
          query,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /:projectId/artifacts/:artifactId
  fastify.get(
    '/:projectId/artifacts/:artifactId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const result = await service.getById(
          user.id,
          projectId,
          artifactId,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // PUT /:projectId/artifacts/:artifactId
  fastify.put(
    '/:projectId/artifacts/:artifactId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = updateArtifactSchema.parse(request.body);
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.update(
          user.id,
          projectId,
          artifactId,
          body,
          ip,
          ua,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // DELETE /:projectId/artifacts/:artifactId
  fastify.delete(
    '/:projectId/artifacts/:artifactId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        await service.delete(
          user.id,
          projectId,
          artifactId,
          ip,
          ua,
        );
        return reply.send({
          message: 'Artifact deleted.',
        });
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // POST /:projectId/artifacts/:artifactId/regenerate
  fastify.post(
    '/:projectId/artifacts/:artifactId/regenerate',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = regenerateArtifactSchema.parse(
          request.body,
        );
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.regenerate(
          user.id,
          projectId,
          artifactId,
          body.prompt,
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

export default artifactRoutes;
