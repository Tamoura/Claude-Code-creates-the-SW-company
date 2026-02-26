import type { FastifyInstance } from 'fastify';
import { getQueue, approveItem, rejectItem, addItem } from '../../services/approval-queue.service.js';

interface ResolveBody {
  note?: string;
}

export async function approvalQueueRoutes(fastify: FastifyInstance) {
  fastify.get('/approval-queue', async () => {
    return { items: getQueue() };
  });

  fastify.patch<{ Params: { id: string }; Body: ResolveBody }>(
    '/approval-queue/:id/approve',
    async (request, reply) => {
      try {
        const updated = approveItem(request.params.id, request.body?.note);
        return { item: updated };
      } catch (err) {
        return reply.status(404).send({
          error: 'Not found',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  fastify.patch<{ Params: { id: string }; Body: ResolveBody }>(
    '/approval-queue/:id/reject',
    async (request, reply) => {
      try {
        const updated = rejectItem(request.params.id, request.body?.note);
        return { item: updated };
      } catch (err) {
        return reply.status(404).send({
          error: 'Not found',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
  );

  fastify.post<{
    Body: {
      type: 'checkpoint' | 'architecture' | 'deployment' | 'blocker';
      title: string;
      description: string;
      product?: string;
      requestedBy: string;
    };
  }>('/approval-queue', async (request, reply) => {
    try {
      const { type, title, description, product = null, requestedBy } = request.body;
      const created = addItem({ type, title, description, product, requestedBy, requestedAt: new Date().toISOString() });
      return reply.status(201).send({ item: created });
    } catch (err) {
      return reply.status(400).send({
        error: 'Bad request',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });
}
