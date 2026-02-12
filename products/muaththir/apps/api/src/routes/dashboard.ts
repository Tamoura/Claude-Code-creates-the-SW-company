import { FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../lib/errors';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { DIMENSIONS, DimensionType } from '../types';
import { Dimension } from '@prisma/client';
import { calculateDimensionScore, DimensionScore } from '../services/score-calculator';

/**
 * Dashboard Scores API
 *
 * Returns radar chart scores for all 6 dimensions of a child.
 *
 * Score formula (0-100 per dimension):
 *   score = (observation_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2)
 *
 * Where:
 *   observation_factor = min(observations_last_30_days, 10) / 10 * 100
 *   milestone_factor   = milestones_achieved / milestones_total_for_age_band * 100
 *   sentiment_factor   = positive_observations / total_observations_last_30_days * 100
 *
 * Uses ScoreCache with staleness: returns cached scores when fresh,
 * recalculates only stale dimensions on demand.
 */

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard/:childId — Get radar chart scores
  fastify.get('/:childId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    const child = await verifyChildOwnership(fastify, childId, parentId);

    const ageBand = getAgeBand(child.dateOfBirth);
    const ageBandForQuery = ageBand === 'out_of_range' ? null : ageBand;

    // Batch-fetch all data upfront (4 queries instead of 12-18 sequential)
    const [existingCaches, allObsCounts, allChildMilestones, allMilestoneDefs] = await Promise.all([
      fastify.prisma.scoreCache.findMany({ where: { childId } }),
      fastify.prisma.observation.groupBy({
        by: ['dimension'],
        where: { childId, deletedAt: null },
        _count: true,
      }),
      fastify.prisma.childMilestone.findMany({
        where: { childId },
        select: { achieved: true, milestone: { select: { dimension: true, ageBand: true } } },
      }),
      ageBandForQuery
        ? fastify.prisma.milestoneDefinition.groupBy({
            by: ['dimension'],
            where: { ageBand: ageBandForQuery as any },
            _count: true,
          })
        : Promise.resolve([]),
    ]);

    const cacheMap = new Map(existingCaches.map((c: any) => [c.dimension, c]));
    const obsCountMap = new Map(allObsCounts.map((g: any) => [g.dimension, g._count]));
    const milestoneDefMap = new Map((allMilestoneDefs as any[]).map((g: any) => [g.dimension, g._count]));

    // Group child milestones by dimension for the target age band
    const achievedByDim = new Map<string, number>();
    for (const cm of allChildMilestones as any[]) {
      if (ageBandForQuery && cm.milestone.ageBand === ageBandForQuery && cm.achieved) {
        achievedByDim.set(cm.milestone.dimension, (achievedByDim.get(cm.milestone.dimension) || 0) + 1);
      }
    }

    const scores: DimensionScore[] = [];

    // Calculate stale dimensions in parallel
    const staleDimensions = DIMENSIONS.filter((d) => {
      const cached = cacheMap.get(d);
      return !cached || cached.stale;
    });

    const staleResults = await Promise.all(
      staleDimensions.map((dimension) =>
        calculateDimensionScore(fastify.prisma, childId, dimension as Dimension, ageBandForQuery)
          .then(async (detail) => {
            await fastify.prisma.scoreCache.upsert({
              where: { childId_dimension: { childId, dimension: dimension as Dimension } },
              create: { childId, dimension: dimension as Dimension, score: detail.score, calculatedAt: new Date(), stale: false },
              update: { score: detail.score, calculatedAt: new Date(), stale: false },
            });
            return { dimension, detail };
          })
      )
    );
    const staleResultMap = new Map(staleResults.map((r) => [r.dimension, r.detail]));

    for (const dimension of DIMENSIONS) {
      const cached = cacheMap.get(dimension);
      if (cached && !cached.stale) {
        scores.push({
          dimension: dimension as DimensionType,
          score: cached.score,
          factors: { observation: 0, milestone: 0, sentiment: 0 },
          observationCount: obsCountMap.get(dimension) || 0,
          milestoneProgress: {
            achieved: achievedByDim.get(dimension) || 0,
            total: milestoneDefMap.get(dimension) || 0,
          },
        });
      } else {
        scores.push(staleResultMap.get(dimension)!);
      }
    }

    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    return reply.send({
      childId,
      childName: child.name,
      ageBand: ageBand === 'out_of_range' ? null : ageBand,
      overallScore,
      dimensions: scores,
      calculatedAt: new Date().toISOString(),
    });
  });

  // GET /api/dashboard/:childId/recent — 5 most recent observations
  fastify.get('/:childId/recent', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    const observations = await fastify.prisma.observation.findMany({
      where: { childId, deletedAt: null },
      orderBy: { observedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        dimension: true,
        content: true,
        sentiment: true,
        observedAt: true,
        tags: true,
        createdAt: true,
      },
    });

    return reply.send({ data: observations });
  });

  // GET /api/dashboard/:childId/activity — Recent activity feed
  fastify.get('/:childId/activity', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;
    const { limit: limitStr } = request.query as { limit?: string };

    await verifyChildOwnership(fastify, childId, parentId);

    // Parse and clamp limit: default 10, max 50
    let limit = 10;
    if (limitStr !== undefined) {
      const parsed = parseInt(limitStr, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        limit = Math.min(parsed, 50);
      }
    }

    // Query 3 sources in parallel
    const [observations, milestones, goals] = await Promise.all([
      fastify.prisma.observation.findMany({
        where: { childId, deletedAt: null },
        orderBy: { observedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          dimension: true,
          content: true,
          sentiment: true,
          observedAt: true,
        },
      }),
      fastify.prisma.childMilestone.findMany({
        where: { childId },
        include: { milestone: true },
        orderBy: { achievedAt: 'desc' },
        take: limit,
      }),
      fastify.prisma.goal.findMany({
        where: { childId },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ]);

    // Map to unified activity format
    type ActivityItem = {
      type: string;
      id: string;
      timestamp: string;
      [key: string]: unknown;
    };

    const items: ActivityItem[] = [];

    for (const obs of observations) {
      items.push({
        type: 'observation',
        id: obs.id,
        dimension: obs.dimension,
        content: obs.content,
        sentiment: obs.sentiment,
        timestamp: obs.observedAt.toISOString(),
      });
    }

    for (const cm of milestones as any[]) {
      const ts = cm.achievedAt
        ? cm.achievedAt.toISOString()
        : cm.createdAt.toISOString();
      items.push({
        type: 'milestone',
        id: cm.id,
        dimension: cm.milestone.dimension,
        title: cm.milestone.title,
        achievedAt: ts,
        timestamp: ts,
      });
    }

    for (const goal of goals) {
      items.push({
        type: 'goal_update',
        id: goal.id,
        title: goal.title,
        status: goal.status,
        updatedAt: goal.updatedAt.toISOString(),
        timestamp: goal.updatedAt.toISOString(),
      });
    }

    // Sort by timestamp descending, take first `limit`
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return reply.send({ data: items.slice(0, limit) });
  });

  // GET /api/dashboard/:childId/milestones-due — Next 3 unchecked milestones
  fastify.get('/:childId/milestones-due', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    const child = await verifyChildOwnership(fastify, childId, parentId);

    const ageBand = getAgeBand(child.dateOfBirth);

    if (ageBand === 'out_of_range') {
      return reply.send({ data: [] });
    }

    const achievedMilestoneIds = await fastify.prisma.childMilestone.findMany({
      where: { childId, achieved: true },
      select: { milestoneId: true },
    });

    const achievedIds = achievedMilestoneIds.map(
      (m: { milestoneId: string }) => m.milestoneId
    );

    const dueMilestones = await fastify.prisma.milestoneDefinition.findMany({
      where: {
        ageBand: ageBand as any,
        id: { notIn: achievedIds },
      },
      orderBy: [
        { dimension: 'asc' },
        { sortOrder: 'asc' },
      ],
      take: 3,
      select: {
        id: true,
        dimension: true,
        title: true,
        description: true,
        ageBand: true,
        sortOrder: true,
      },
    });

    return reply.send({ data: dueMilestones });
  });
};

export default dashboardRoutes;
