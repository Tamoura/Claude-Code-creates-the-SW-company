/**
 * Document Routes - registered under /api/v1/projects
 *
 * Thin route handlers that delegate to DocumentService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { DocumentService } from './documents.service.js';
import {
  uploadDocumentSchema,
  generateFromDocumentSchema,
} from './documents.schemas.js';

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

const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new DocumentService(fastify);

  // POST /:projectId/documents
  fastify.post(
    '/:projectId/documents',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId } = request.params as {
          projectId: string;
        };
        const body = uploadDocumentSchema.parse(request.body);
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.upload(
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

  // GET /:projectId/documents
  fastify.get(
    '/:projectId/documents',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId } = request.params as {
          projectId: string;
        };
        const result = await service.list(user.id, projectId);
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /:projectId/documents/:documentId
  fastify.get(
    '/:projectId/documents/:documentId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, documentId } = request.params as {
          projectId: string;
          documentId: string;
        };
        const result = await service.getById(
          user.id,
          projectId,
          documentId,
        );
        return reply.send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // POST /:projectId/documents/:documentId/generate
  fastify.post(
    '/:projectId/documents/:documentId/generate',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, documentId } = request.params as {
          projectId: string;
          documentId: string;
        };
        const body = generateFromDocumentSchema.parse(
          request.body,
        );
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.generateFromDocument(
          user.id,
          projectId,
          documentId,
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
};

export default documentRoutes;
