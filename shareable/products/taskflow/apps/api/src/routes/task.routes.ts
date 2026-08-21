import type { FastifyPluginAsync } from 'fastify';
import { TaskRepository } from '../repositories/task.repository';
import { TaskService } from '../services/task.service';
import { validate } from '../lib/validate';
import {
  createProjectSchema,
  createTaskSchema,
  idParamSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../schemas/task.schema';

/**
 * Task and project routes, registered under /api/v1 by app.ts.
 * [US-01][US-02][US-03][FR-001..FR-008]
 */
const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new TaskService(new TaskRepository(fastify.prisma));

  fastify.post('/tasks', async (request, reply) => {
    const input = validate(createTaskSchema, request.body);
    const task = await service.create(input);
    return reply.code(201).send({ task });
  });

  fastify.get('/tasks', async (request, reply) => {
    const query = validate(listTasksQuerySchema, request.query);
    return reply.send(await service.list(query));
  });

  fastify.get('/tasks/:id', async (request, reply) => {
    const { id } = validate(idParamSchema, request.params);
    return reply.send({ task: await service.getById(id) });
  });

  fastify.patch('/tasks/:id', async (request, reply) => {
    const { id } = validate(idParamSchema, request.params);
    const input = validate(updateTaskSchema, request.body);
    return reply.send({ task: await service.update(id, input) });
  });

  fastify.delete('/tasks/:id', async (request, reply) => {
    const { id } = validate(idParamSchema, request.params);
    await service.delete(id);
    return reply.code(204).send();
  });

  // Projects are a supporting resource: tasks need one to belong to. [FR-008]
  fastify.post('/projects', async (request, reply) => {
    const { name } = validate(createProjectSchema, request.body);
    const project = await fastify.prisma.project.create({ data: { name } });
    return reply.code(201).send({ project });
  });

  fastify.get('/projects', async (_request, reply) => {
    const projects = await fastify.prisma.project.findMany({ orderBy: { name: 'asc' } });
    return reply.send({ projects });
  });
};

export default taskRoutes;
