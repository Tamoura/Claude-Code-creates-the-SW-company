import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../lib/errors';
import { parsePagination, paginatedResult } from '../lib/pagination';
import { verifyChildOwnership } from '../lib/ownership';
import { validateBody, validateQuery } from '../utils/validation';
import { getLocale } from '../lib/locale';

const DIMENSIONS = [
  'academic',
  'social_emotional',
  'behavioural',
  'aspirational',
  'islamic',
  'physical',
] as const;

const SENTIMENTS = ['positive', 'neutral', 'needs_attention'] as const;

const createObservationSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1000, 'Content must be 1000 characters or less'),
  sentiment: z.enum(SENTIMENTS),
  observedAt: z.string().date().optional(),
  tags: z.array(z.string().max(50)).max(5).optional().default([]),
});

const updateObservationSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  observedAt: z.string().date().optional(),
  tags: z.array(z.string().max(50)).max(5).optional(),
});

const listObservationsQuery = z.object({
  dimension: z.enum(DIMENSIONS).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

function formatObservation(obs: {
  id: string;
  childId: string;
  dimension: string;
  content: string;
  contentAr?: string | null;
  sentiment: string;
  observedAt: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}, locale: string = 'en') {
  const isAr = locale === 'ar';
  return {
    id: obs.id,
    childId: obs.childId,
    dimension: obs.dimension,
    content: (isAr && obs.contentAr) || obs.content,
    sentiment: obs.sentiment,
    observedAt: obs.observedAt.toISOString().split('T')[0],
    tags: obs.tags,
    createdAt: obs.createdAt.toISOString(),
    updatedAt: obs.updatedAt.toISOString(),
  };
}

const observationRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/children/:childId/observations
  fastify.post('/:childId/observations', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const data = validateBody(createObservationSchema, request.body);

    // Validate observedAt is not more than 1 year ago
    const observedDate = data.observedAt
      ? new Date(data.observedAt)
      : new Date();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (observedDate < oneYearAgo) {
      throw new ValidationError(
        'Observation date cannot be more than 1 year ago',
        { observedAt: ['Observation date cannot be more than 1 year ago'] }
      );
    }

    const observation = await fastify.prisma.$transaction(async (tx) => {
      const obs = await tx.observation.create({
        data: {
          childId,
          dimension: data.dimension,
          content: data.content,
          sentiment: data.sentiment,
          observedAt: observedDate,
          tags: data.tags,
        },
      });
      await tx.scoreCache.updateMany({
        where: { childId, dimension: data.dimension },
        data: { stale: true },
      });
      return obs;
    });

    return reply.code(201).send(formatObservation(observation));
  });

  // GET /api/children/:childId/observations
  fastify.get('/:childId/observations', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const query = validateQuery(
      listObservationsQuery,
      request.query
    );
    const pagination = parsePagination(query);

    const where: Record<string, unknown> = {
      childId,
      deletedAt: null,
    };

    if (query.dimension) {
      where.dimension = query.dimension;
    }
    if (query.sentiment) {
      where.sentiment = query.sentiment;
    }
    if (query.from || query.to) {
      const observedAt: Record<string, Date> = {};
      if (query.from) {
        observedAt.gte = new Date(query.from);
      }
      if (query.to) {
        observedAt.lte = new Date(query.to);
      }
      where.observedAt = observedAt;
    }

    const locale = getLocale(request);

    const [observations, total] = await Promise.all([
      fastify.prisma.observation.findMany({
        where,
        orderBy: { observedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      fastify.prisma.observation.count({ where }),
    ]);

    const formatted = observations.map((o) => formatObservation(o, locale));
    return reply.send(paginatedResult(formatted, total, pagination));
  });

  // GET /api/children/:childId/observations/:id
  fastify.get('/:childId/observations/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, id } = request.params as {
      childId: string;
      id: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const locale = getLocale(request);

    const observation = await fastify.prisma.observation.findFirst({
      where: { id, childId, deletedAt: null },
    });

    if (!observation) {
      throw new NotFoundError('Observation not found');
    }

    return reply.send(formatObservation(observation, locale));
  });

  // PATCH /api/children/:childId/observations/:id
  fastify.patch('/:childId/observations/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, id } = request.params as {
      childId: string;
      id: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const existing = await fastify.prisma.observation.findFirst({
      where: { id, childId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Observation not found');
    }

    const data = validateBody(updateObservationSchema, request.body);

    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) {
      updateData.content = data.content;
    }
    if (data.sentiment !== undefined) {
      updateData.sentiment = data.sentiment;
    }
    if (data.observedAt !== undefined) {
      updateData.observedAt = new Date(data.observedAt);
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    const updated = await fastify.prisma.$transaction(async (tx) => {
      const obs = await tx.observation.update({
        where: { id },
        data: updateData,
      });
      await tx.scoreCache.updateMany({
        where: { childId, dimension: existing.dimension },
        data: { stale: true },
      });
      return obs;
    });

    return reply.send(formatObservation(updated));
  });

  // DELETE /api/children/:childId/observations/:id
  fastify.delete('/:childId/observations/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId, id } = request.params as {
      childId: string;
      id: string;
    };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const observation = await fastify.prisma.observation.findFirst({
      where: { id, childId, deletedAt: null },
    });

    if (!observation) {
      throw new NotFoundError('Observation not found');
    }

    // Soft delete + cache invalidation in a transaction
    await fastify.prisma.$transaction(async (tx) => {
      await tx.observation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.scoreCache.updateMany({
        where: { childId, dimension: observation.dimension },
        data: { stale: true },
      });
    });

    return reply.code(204).send();
  });
};

export default observationRoutes;
