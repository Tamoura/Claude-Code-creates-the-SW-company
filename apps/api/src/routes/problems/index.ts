import { FastifyPluginAsync } from 'fastify';
import {
  createProblem,
  getProblem,
  listProblems,
  updateProblem,
  deleteProblem,
  linkIncidentToProblem,
  createKnownError,
} from '../../services/problem.service.js';
import {
  createProblemSchema,
  updateProblemSchema,
  listProblemsQuerySchema,
  linkIncidentSchema,
  createKnownErrorSchema,
} from '../../schemas/problem.schema.js';
import { parsePaginationParams } from '../../utils/pagination.js';

const problemsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create problem
  fastify.post('/problems', async (request, reply) => {
    const data = createProblemSchema.parse(request.body);
    const problem = await createProblem(fastify.prisma, data);
    return reply.status(201).send(problem);
  });

  // List problems
  fastify.get('/problems', async (request) => {
    const query = listProblemsQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
    };

    return await listProblems(fastify.prisma, filters);
  });

  // Get problem by ID
  fastify.get('/problems/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const problem = await getProblem(fastify.prisma, id);

    if (!problem) {
      return reply.status(404).send({ error: 'Problem not found' });
    }

    return problem;
  });

  // Update problem
  fastify.patch('/problems/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateProblemSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const problem = await updateProblem(fastify.prisma, id, data, userId);
      return problem;
    } catch (error) {
      return reply.status(404).send({ error: 'Problem not found' });
    }
  });

  // Delete problem
  fastify.delete('/problems/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      await deleteProblem(fastify.prisma, id, userId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: 'Problem not found' });
    }
  });

  // Link incident to problem
  fastify.post('/problems/:id/incidents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = linkIncidentSchema.parse(request.body);

    try {
      const link = await linkIncidentToProblem(
        fastify.prisma,
        id,
        data.incidentId,
        data.linkedById
      );
      return reply.status(201).send(link);
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to link incident' });
    }
  });

  // Create known error from problem
  fastify.post('/problems/:id/known-error', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = createKnownErrorSchema.parse(request.body);

    try {
      const knownError = await createKnownError(fastify.prisma, id, data);
      return reply.status(201).send(knownError);
    } catch (error) {
      return reply.status(400).send({ error: 'Failed to create known error' });
    }
  });
};

export default problemsRoutes;
