/**
 * Export Routes - registered under /api/v1/projects
 *
 * Thin route handlers for artifact export.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ExportService } from './exports.service.js';
import { exportArtifactSchema } from './exports.schemas.js';

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

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new ExportService(fastify);

  // POST /:projectId/artifacts/:artifactId/export
  fastify.post(
    '/:projectId/artifacts/:artifactId/export',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = exportArtifactSchema.parse(request.body);
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.exportArtifact(
          user.id,
          projectId,
          artifactId,
          body.format,
          ip,
          ua,
        );
        return reply
          .header('Content-Type', result.contentType)
          .header(
            'Content-Disposition',
            `attachment; filename="${result.filename}"`,
          )
          .send(result.content);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );
};

export default exportRoutes;
