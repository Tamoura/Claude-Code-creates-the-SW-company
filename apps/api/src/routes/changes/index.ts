import { FastifyPluginAsync } from 'fastify';
import {
  createChange,
  getChange,
  listChanges,
  updateChange,
  deleteChange,
  approveChange,
  rejectChange,
  submitChange,
  scheduleChange,
  implementChange,
  completeChange,
} from '../../services/change.service.js';
import {
  createChangeSchema,
  updateChangeSchema,
  listChangesQuerySchema,
  approveChangeSchema,
  rejectChangeSchema,
  scheduleChangeSchema,
  implementChangeSchema,
  completeChangeSchema,
} from '../../schemas/change.schema.js';
import { parsePaginationParams } from '../../utils/pagination.js';

const changesRoutes: FastifyPluginAsync = async (fastify) => {
  // Create change
  fastify.post('/changes', async (request, reply) => {
    const data = createChangeSchema.parse(request.body);
    const change = await createChange(fastify.prisma, data);
    return reply.status(201).send(change);
  });

  // List changes
  fastify.get('/changes', async (request) => {
    const query = listChangesQuerySchema.parse(request.query);
    const { page, limit } = parsePaginationParams(query.page, query.limit);

    const filters = {
      page,
      limit,
      status: query.status,
      type: query.type,
      priority: query.priority,
      requesterId: query.requesterId,
      assigneeId: query.assigneeId,
    };

    return await listChanges(fastify.prisma, filters);
  });

  // Get change by ID
  fastify.get('/changes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const change = await getChange(fastify.prisma, id);

    if (!change) {
      return reply.status(404).send({ error: 'Change not found' });
    }

    return change;
  });

  // Update change
  fastify.patch('/changes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateChangeSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const change = await updateChange(fastify.prisma, id, data, userId);
      return change;
    } catch (error) {
      return reply.status(404).send({ error: 'Change not found' });
    }
  });

  // Delete change
  fastify.delete('/changes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      await deleteChange(fastify.prisma, id, userId);
      return reply.status(204).send();
    } catch (error) {
      return reply.status(404).send({ error: 'Change not found' });
    }
  });

  // Submit change for approval
  fastify.post('/changes/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = 'system'; // Guest access

    try {
      const change = await submitChange(fastify.prisma, id, userId);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Approve change
  fastify.post('/changes/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = approveChangeSchema.parse(request.body);

    try {
      const change = await approveChange(fastify.prisma, id, data);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Reject change
  fastify.post('/changes/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = rejectChangeSchema.parse(request.body);

    try {
      const change = await rejectChange(fastify.prisma, id, data);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Schedule change
  fastify.post('/changes/:id/schedule', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = scheduleChangeSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const change = await scheduleChange(fastify.prisma, id, data, userId);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Start implementing change
  fastify.post('/changes/:id/implement', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = implementChangeSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const change = await implementChange(fastify.prisma, id, data, userId);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  // Complete change
  fastify.post('/changes/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = completeChangeSchema.parse(request.body);
    const userId = 'system'; // Guest access

    try {
      const change = await completeChange(fastify.prisma, id, data, userId);
      return change;
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });
};

export default changesRoutes;
