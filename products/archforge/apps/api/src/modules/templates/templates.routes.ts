/**
 * Template Routes - /api/v1/templates
 *
 * Thin route handlers that delegate to TemplateService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { TemplateService } from './templates.service.js';
import {
  createTemplateSchema,
  listTemplatesQuerySchema,
  instantiateTemplateSchema,
} from './templates.schemas.js';

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

const templateRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TemplateService(fastify);

  // GET /
  fastify.get('/', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const query = listTemplatesQuerySchema.parse(
        request.query,
      );
      const result = await service.list(user.id, query);
      return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write
    } catch (error) {
      handleValidationError(error);
    }
  });

  // GET /:templateId
  fastify.get('/:templateId', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { templateId } = request.params as {
        templateId: string;
      };
      const result = await service.getById(
        user.id,
        templateId,
      );
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // POST /
  fastify.post('/', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const body = createTemplateSchema.parse(request.body);
      const ip = request.ip;
      const ua =
        (request.headers['user-agent'] as string) || '';
      const result = await service.create(
        user.id,
        body,
        ip,
        ua,
      );
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // POST /:templateId/instantiate
  fastify.post(
    '/:templateId/instantiate',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { templateId } = request.params as {
          templateId: string;
        };
        const body = instantiateTemplateSchema.parse(
          request.body,
        );
        const ip = request.ip;
        const ua =
          (request.headers['user-agent'] as string) || '';
        const result = await service.instantiate(
          user.id,
          templateId,
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

export default templateRoutes;
