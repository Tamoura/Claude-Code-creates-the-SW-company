import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../lib/errors';
import { parsePagination, paginatedResult } from '../lib/pagination';
import { verifyChildOwnership } from '../lib/ownership';
import { validateBody } from '../utils/validation';
import { DIMENSIONS, AGE_BANDS } from '../types';
import { logger } from '../utils/logger';
import { buildMilestoneEmailHtml } from '../templates/milestone-email';
import { getLocale } from '../lib/locale';

const dimensionEnum = z.enum(DIMENSIONS as unknown as [string, ...string[]]);
const ageBandEnum = z.enum(AGE_BANDS as unknown as [string, ...string[]]);

const toggleSchema = z.object({
  achieved: z.boolean(),
});

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

    const locale = getLocale(request);

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

    const isAr = locale === 'ar';
    const data = milestones.map((m) => ({
      id: m.id,
      dimension: m.dimension,
      ageBand: m.ageBand,
      title: (isAr && m.titleAr) || m.title,
      description: (isAr && m.descriptionAr) || m.description,
      guidance: (isAr && m.guidanceAr) || m.guidance,
      sortOrder: m.sortOrder,
    }));

    reply.header('Vary', 'Accept-Language');
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

    await verifyChildOwnership(fastify, childId, parent.id);

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

    const locale = getLocale(request);

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

    const isAr = locale === 'ar';
    const data = milestones.map((m) => {
      const childMilestone = m.childMilestones[0] ?? null;
      return {
        id: m.id,
        dimension: m.dimension,
        ageBand: m.ageBand,
        title: (isAr && m.titleAr) || m.title,
        description: (isAr && m.descriptionAr) || m.description,
        guidance: (isAr && m.guidanceAr) || m.guidance,
        sortOrder: m.sortOrder,
        achieved: childMilestone?.achieved ?? false,
        achievedAt: childMilestone?.achievedAt?.toISOString() ?? null,
      };
    });

    reply.header('Cache-Control', 'private, max-age=60');
    reply.header('Vary', 'Accept-Language');
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

    await verifyChildOwnership(fastify, childId, parent.id);

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

    const [childMilestone] = await fastify.prisma.$transaction([
      fastify.prisma.childMilestone.upsert({
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
      }),
      fastify.prisma.scoreCache.upsert({
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
      }),
    ]);

    // Fire-and-forget email notification for milestone achievement
    if (achieved && parent.milestoneAlerts) {
      const child = await fastify.prisma.child.findUnique({
        where: { id: childId },
        select: { name: true },
      });

      fastify.email
        .send({
          to: parent.email,
          subject: `Milestone Achieved: ${milestone.title}`,
          html: buildMilestoneEmailHtml({
            parentName: parent.name,
            childName: child?.name ?? 'Your child',
            milestoneTitle: milestone.title,
            milestoneDescription: milestone.description,
            dimension: milestone.dimension,
          }),
        })
        .catch((err: Error) => {
          logger.error('Failed to send milestone email', err, {
            parentId: parent.id,
            milestoneId,
          });
        });
    }

    const locale = getLocale(request);
    const isAr = locale === 'ar';
    const ms = childMilestone.milestone;

    return reply.code(200).send({
      id: ms.id,
      dimension: ms.dimension,
      ageBand: ms.ageBand,
      title: (isAr && ms.titleAr) || ms.title,
      description: (isAr && ms.descriptionAr) || ms.description,
      guidance: (isAr && ms.guidanceAr) || ms.guidance,
      sortOrder: ms.sortOrder,
      achieved: childMilestone.achieved,
      achievedAt: childMilestone.achievedAt?.toISOString() ?? null,
      achievedHistory: childMilestone.achievedHistory,
    });
  });
};

export { milestoneDefinitionRoutes, childMilestoneRoutes };
export default milestoneDefinitionRoutes;
