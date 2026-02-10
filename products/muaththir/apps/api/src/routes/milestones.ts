import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../lib/errors';
import { parsePagination, paginatedResult } from '../lib/pagination';
import { DIMENSIONS, AGE_BANDS } from '../types';

const dimensionEnum = z.enum(DIMENSIONS as unknown as [string, ...string[]]);
const ageBandEnum = z.enum(AGE_BANDS as unknown as [string, ...string[]]);

const toggleSchema = z.object({
  achieved: z.boolean(),
});

function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.errors[0]?.message || 'Validation failed',
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }
  return parsed.data;
}

// --- Public milestone definitions route ---

const milestoneDefinitionRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/milestones — List milestone definitions (public)
  fastify.get('/', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      dimension?: string;
      ageBand?: string;
    };

    const { page, limit } = parsePagination(query);

    const where: Record<string, unknown> = {};

    if (query.dimension) {
      const parsed = dimensionEnum.safeParse(query.dimension);
      if (!parsed.success) {
        throw new BadRequestError(
          `Invalid dimension. Must be one of: ${DIMENSIONS.join(', ')}`
        );
      }
      where.dimension = parsed.data;
    }

    if (query.ageBand) {
      const parsed = ageBandEnum.safeParse(query.ageBand);
      if (!parsed.success) {
        throw new BadRequestError(
          `Invalid ageBand. Must be one of: ${AGE_BANDS.join(', ')}`
        );
      }
      where.ageBand = parsed.data;
    }

    const [milestones, total] = await Promise.all([
      fastify.prisma.milestoneDefinition.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { dimension: 'asc' },
          { ageBand: 'asc' },
          { sortOrder: 'asc' },
        ],
      }),
      fastify.prisma.milestoneDefinition.count({ where }),
    ]);

    const data = milestones.map((m) => ({
      id: m.id,
      dimension: m.dimension,
      ageBand: m.ageBand,
      title: m.title,
      description: m.description,
      guidance: m.guidance,
      sortOrder: m.sortOrder,
    }));

    return reply.code(200).send(paginatedResult(data, total, { page, limit }));
  });
};

// --- Child milestone progress routes ---

const childMilestoneRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children/:childId/milestones — Get child's milestone progress
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { childId } = request.params as { childId: string };

    // Verify child belongs to parent
    const child = await fastify.prisma.child.findFirst({
      where: { id: childId, parentId: parent.id },
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const query = request.query as {
      page?: string;
      limit?: string;
      dimension?: string;
      ageBand?: string;
    };

    const { page, limit } = parsePagination(query);

    const where: Record<string, unknown> = {};

    if (query.dimension) {
      const parsed = dimensionEnum.safeParse(query.dimension);
      if (!parsed.success) {
        throw new BadRequestError(
          `Invalid dimension. Must be one of: ${DIMENSIONS.join(', ')}`
        );
      }
      where.dimension = parsed.data;
    }

    if (query.ageBand) {
      const parsed = ageBandEnum.safeParse(query.ageBand);
      if (!parsed.success) {
        throw new BadRequestError(
          `Invalid ageBand. Must be one of: ${AGE_BANDS.join(', ')}`
        );
      }
      where.ageBand = parsed.data;
    }

    const [milestones, total] = await Promise.all([
      fastify.prisma.milestoneDefinition.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { dimension: 'asc' },
          { ageBand: 'asc' },
          { sortOrder: 'asc' },
        ],
        include: {
          childMilestones: {
            where: { childId },
          },
        },
      }),
      fastify.prisma.milestoneDefinition.count({ where }),
    ]);

    const data = milestones.map((m) => {
      const childMilestone = m.childMilestones[0] ?? null;
      return {
        id: m.id,
        dimension: m.dimension,
        ageBand: m.ageBand,
        title: m.title,
        description: m.description,
        guidance: m.guidance,
        sortOrder: m.sortOrder,
        achieved: childMilestone?.achieved ?? false,
        achievedAt: childMilestone?.achievedAt?.toISOString() ?? null,
      };
    });

    return reply.code(200).send(paginatedResult(data, total, { page, limit }));
  });

  // PATCH /api/children/:childId/milestones/:milestoneId — Toggle milestone
  fastify.patch('/:milestoneId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;
    const { childId, milestoneId } = request.params as {
      childId: string;
      milestoneId: string;
    };

    // Verify child belongs to parent
    const child = await fastify.prisma.child.findFirst({
      where: { id: childId, parentId: parent.id },
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

    // Verify milestone exists
    const milestone = await fastify.prisma.milestoneDefinition.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    const { achieved } = validateBody(toggleSchema, request.body);
    const now = new Date();

    // Get existing record if any
    const existing = await fastify.prisma.childMilestone.findUnique({
      where: {
        childId_milestoneId: { childId, milestoneId },
      },
    });

    const historyEntry = achieved
      ? { type: 'achieved', at: now.toISOString() }
      : { type: 'unmarked', at: now.toISOString() };

    const existingHistory = Array.isArray(existing?.achievedHistory)
      ? (existing.achievedHistory as Array<Record<string, string>>)
      : [];

    const updatedHistory = [...existingHistory, historyEntry];

    const childMilestone = await fastify.prisma.childMilestone.upsert({
      where: {
        childId_milestoneId: { childId, milestoneId },
      },
      create: {
        childId,
        milestoneId,
        achieved,
        achievedAt: achieved ? now : null,
        achievedHistory: updatedHistory,
      },
      update: {
        achieved,
        achievedAt: achieved ? now : null,
        achievedHistory: updatedHistory,
      },
      include: {
        milestone: true,
      },
    });

    // Mark ScoreCache as stale for this dimension
    await fastify.prisma.scoreCache.upsert({
      where: {
        childId_dimension: {
          childId,
          dimension: milestone.dimension,
        },
      },
      create: {
        childId,
        dimension: milestone.dimension,
        stale: true,
      },
      update: {
        stale: true,
      },
    });

    return reply.code(200).send({
      id: childMilestone.milestone.id,
      dimension: childMilestone.milestone.dimension,
      ageBand: childMilestone.milestone.ageBand,
      title: childMilestone.milestone.title,
      description: childMilestone.milestone.description,
      guidance: childMilestone.milestone.guidance,
      sortOrder: childMilestone.milestone.sortOrder,
      achieved: childMilestone.achieved,
      achievedAt: childMilestone.achievedAt?.toISOString() ?? null,
      achievedHistory: childMilestone.achievedHistory,
    });
  });
};

export { milestoneDefinitionRoutes, childMilestoneRoutes };
export default milestoneDefinitionRoutes;
