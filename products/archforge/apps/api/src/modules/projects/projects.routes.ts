/**
 * Project Routes - /api/v1/projects
 *
 * Thin route handlers that delegate to ProjectService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { ProjectService } from './projects.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  listProjectsQuerySchema,
  addMemberSchema,
} from './projects.schemas.js';

function handleValidationError(error: unknown) {
  if (error instanceof AppError) throw error;
  if (error instanceof z.ZodError) {
    throw new AppError(400, 'validation-error', error.errors.map((e) => e.message).join('; '));
  }
  throw error;
}

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const projectService = new ProjectService(fastify);

  // GET /projects
  fastify.get('/', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const query = listProjectsQuerySchema.parse(request.query);
      const result = await projectService.list(user.id, query);
      return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    } catch (error) {
      handleValidationError(error);
    }
  });

  // POST /projects
  fastify.post('/', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const body = createProjectSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await projectService.create(user.id, body, ip, ua);
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // GET /projects/:projectId
  fastify.get('/:projectId', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const result = await projectService.getById(user.id, projectId);
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // PUT /projects/:projectId
  fastify.put('/:projectId', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const body = updateProjectSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await projectService.update(user.id, projectId, body, ip, ua);
      return reply.send(result); // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
    } catch (error) {
      handleValidationError(error);
    }
  });

  // DELETE /projects/:projectId
  fastify.delete('/:projectId', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const body = deleteProjectSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      await projectService.delete(user.id, projectId, body.confirmName, ip, ua);
      return reply.send({ message: 'Project deleted permanently.' });
    } catch (error) {
      handleValidationError(error);
    }
  });
  // GET /projects/:projectId/members
  fastify.get('/:projectId/members', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const result = await projectService.listMembers(user.id, projectId);
      return reply.send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });

  // POST /projects/:projectId/members
  fastify.post('/:projectId/members', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const { projectId } = request.params as { projectId: string };
      const body = addMemberSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await projectService.addMember(user.id, projectId, body.email, body.role, ip, ua);
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error);
    }
  });
};

export default projectRoutes;
