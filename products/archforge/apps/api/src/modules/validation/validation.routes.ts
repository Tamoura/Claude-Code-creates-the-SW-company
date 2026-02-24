/**
 * Validation Routes - registered under /api/v1/projects
 *
 * Thin route handlers that delegate to ValidationService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ValidationService } from './validation.service.js';

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

const validationRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ValidationService(fastify);

  // POST /:projectId/artifacts/:artifactId/validate
  fastify.post(
    '/:projectId/artifacts/:artifactId/validate',
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
        const result = await service.validate(
          user.id,
          projectId,
          artifactId,
          ip,
          ua,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );
};

export default validationRoutes;
