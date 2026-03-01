/**
 * Artifact Routes - registered under /api/v1/projects
 *
 * Thin route handlers that delegate to ArtifactService.
 * Nested under /api/v1/projects/:projectId/artifacts.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ArtifactService } from './artifacts.service.js';
import {
  createArtifactSchema,
  updateArtifactSchema,
  listArtifactsQuerySchema,
  createElementSchema,
  updateElementSchema,
  createRelationshipSchema,
  saveCanvasSchema,
  generateArtifactSchema,
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

  // POST /:projectId/artifacts/generate (AI)
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

  // POST /:projectId/artifacts (manual create)
  fastify.post('/:projectId/artifacts', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const body = createArtifactSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await service.create(user.id, projectId, body, ip, ua);
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

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
        return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
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
        return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
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

  // POST /:projectId/artifacts/:artifactId/regenerate (AI)
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

  // ==================== Elements ====================

  // POST /:projectId/artifacts/:artifactId/elements
  fastify.post(
    '/:projectId/artifacts/:artifactId/elements',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = createElementSchema.parse(request.body);
        const result = await service.addElement(
          user.id,
          projectId,
          artifactId,
          body,
        );
        return reply.code(201).send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /:projectId/artifacts/:artifactId/elements
  fastify.get(
    '/:projectId/artifacts/:artifactId/elements',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const result = await service.listElements(
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

  // PUT /:projectId/artifacts/:artifactId/elements/:elementId
  fastify.put(
    '/:projectId/artifacts/:artifactId/elements/:elementId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId, elementId } = request.params as {
          projectId: string;
          artifactId: string;
          elementId: string;
        };
        const body = updateElementSchema.parse(request.body);
        const result = await service.updateElement(
          user.id,
          projectId,
          artifactId,
          elementId,
          body,
        );
        return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // DELETE /:projectId/artifacts/:artifactId/elements/:elementId
  fastify.delete(
    '/:projectId/artifacts/:artifactId/elements/:elementId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId, elementId } = request.params as {
          projectId: string;
          artifactId: string;
          elementId: string;
        };
        await service.deleteElement(
          user.id,
          projectId,
          artifactId,
          elementId,
        );
        return reply.send({ message: 'Element deleted.' });
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // ==================== Relationships ====================

  // POST /:projectId/artifacts/:artifactId/relationships
  fastify.post(
    '/:projectId/artifacts/:artifactId/relationships',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = createRelationshipSchema.parse(request.body);
        const result = await service.addRelationship(
          user.id,
          projectId,
          artifactId,
          body,
        );
        return reply.code(201).send(result);
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // GET /:projectId/artifacts/:artifactId/relationships
  fastify.get(
    '/:projectId/artifacts/:artifactId/relationships',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const result = await service.listRelationships(
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

  // DELETE /:projectId/artifacts/:artifactId/relationships/:relationshipId
  fastify.delete(
    '/:projectId/artifacts/:artifactId/relationships/:relationshipId',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId, relationshipId } =
          request.params as {
            projectId: string;
            artifactId: string;
            relationshipId: string;
          };
        await service.deleteRelationship(
          user.id,
          projectId,
          artifactId,
          relationshipId,
        );
        return reply.send({ message: 'Relationship deleted.' });
      } catch (error) {
        handleValidationError(error);
      }
    },
  );

  // ==================== Canvas Save ====================

  // PUT /:projectId/artifacts/:artifactId/canvas
  fastify.put(
    '/:projectId/artifacts/:artifactId/canvas',
    async (request, reply) => {
      try {
        await fastify.authenticate(request);
        const user = request.currentUser!;
        const { projectId, artifactId } = request.params as {
          projectId: string;
          artifactId: string;
        };
        const body = saveCanvasSchema.parse(request.body);
        const ip = request.ip;
        const ua = (request.headers['user-agent'] as string) || '';
        const result = await service.saveCanvas(
          user.id,
          projectId,
          artifactId,
          body.canvasData,
          ip,
          ua,
        );
        return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
      } catch (error) {
        handleValidationError(error);
      }
    },
  );
};

export default artifactRoutes;
