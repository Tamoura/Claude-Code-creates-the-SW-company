import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { validateBody, eventSchema, batchEventsSchema } from '../../utils/validation';
import { logger } from '../../utils/logger';
import { updateRealtimeCounters } from './counters';

export default async function eventRoutes(fastify: FastifyInstance) {
  // POST /events
  fastify.post('/', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = validateBody(eventSchema, request.body);
    const tenantId = request.tenantId!;

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // Check for deduplication
    const existing = await fastify.prisma.event.findFirst({
      where: {
        tenantId,
        userId: data.userId,
        eventType: data.eventType,
        productId: data.productId,
        timestamp,
      },
    });

    if (existing) {
      return { data: { status: 'duplicate' } };
    }

    const event = await fastify.prisma.event.create({
      data: {
        tenantId,
        eventType: data.eventType,
        userId: data.userId,
        productId: data.productId,
        sessionId: data.sessionId,
        metadata: data.metadata || {},
        timestamp,
      },
    });

    // Update real-time counters (fire and forget)
    updateRealtimeCounters(fastify.redis, tenantId, data.eventType).catch(() => {});

    return reply.status(202).send({ data: { id: event.id, status: 'accepted' } });
  });

  // POST /events/batch
  fastify.post('/batch', {
    preHandler: [fastify.authenticateApiKey, fastify.requirePermission('read_write')],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { events } = validateBody(batchEventsSchema, request.body);
    const tenantId = request.tenantId!;

    let accepted = 0;
    let rejected = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < events.length; i++) {
      try {
        const data = events[i];
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

        // Check dedup
        const existing = await fastify.prisma.event.findFirst({
          where: {
            tenantId,
            userId: data.userId,
            eventType: data.eventType,
            productId: data.productId,
            timestamp,
          },
        });

        if (!existing) {
          await fastify.prisma.event.create({
            data: {
              tenantId,
              eventType: data.eventType,
              userId: data.userId,
              productId: data.productId,
              sessionId: data.sessionId,
              metadata: data.metadata || {},
              timestamp,
            },
          });

          updateRealtimeCounters(fastify.redis, tenantId, data.eventType).catch(() => {});
        }

        accepted++;
      } catch (err) {
        rejected++;
        errors.push({ index: i, message: (err as Error).message });
      }
    }

    return reply.status(202).send({
      data: { accepted, rejected, errors },
    });
  });
}
