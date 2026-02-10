import { FastifyPluginAsync } from 'fastify';
import { NotFoundError } from '../lib/errors';
import { getAgeBand } from '../utils/age-band';
import { DIMENSIONS, DimensionType } from '../types';
import { Dimension } from '@prisma/client';

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

interface DimensionScore {
  dimension: DimensionType;
  score: number;
  factors: {
    observation: number;
    milestone: number;
    sentiment: number;
  };
  observationCount: number;
  milestoneProgress: {
    achieved: number;
    total: number;
  };
}

async function calculateDimensionScore(
  prisma: any,
  childId: string,
  dimension: Dimension,
  ageBand: string | null
): Promise<DimensionScore> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count observations in last 30 days for this dimension (exclude soft-deleted)
  const recentObservations = await prisma.observation.findMany({
    where: {
      childId,
      dimension,
      deletedAt: null,
      observedAt: { gte: thirtyDaysAgo },
    },
    select: { sentiment: true },
  });

  const observationCount = recentObservations.length;
  const positiveCount = recentObservations.filter(
    (o: { sentiment: string }) => o.sentiment === 'positive'
  ).length;

  // observation_factor: min(count, 10) / 10 * 100
  const observationFactor = Math.min(observationCount, 10) / 10 * 100;

  // sentiment_factor: positive / total * 100 (0 if no observations)
  const sentimentFactor =
    observationCount > 0 ? (positiveCount / observationCount) * 100 : 0;

  // milestone_factor: achieved / total for age band * 100
  let milestoneAchieved = 0;
  let milestoneTotal = 0;

  if (ageBand) {
    milestoneTotal = await prisma.milestoneDefinition.count({
      where: { dimension, ageBand },
    });

    if (milestoneTotal > 0) {
      milestoneAchieved = await prisma.childMilestone.count({
        where: {
          childId,
          achieved: true,
          milestone: { dimension, ageBand },
        },
      });
    }
  }

  const milestoneFactor =
    milestoneTotal > 0 ? (milestoneAchieved / milestoneTotal) * 100 : 0;

  // Final score
  const score = Math.round(
    observationFactor * 0.4 + milestoneFactor * 0.4 + sentimentFactor * 0.2
  );

  return {
    dimension: dimension as DimensionType,
    score,
    factors: {
      observation: Math.round(observationFactor),
      milestone: Math.round(milestoneFactor),
      sentiment: Math.round(sentimentFactor),
    },
    observationCount,
    milestoneProgress: {
      achieved: milestoneAchieved,
      total: milestoneTotal,
    },
  };
}

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard/:childId — Get radar chart scores
  fastify.get('/:childId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    const child = await fastify.prisma.child.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

    const ageBand = getAgeBand(child.dateOfBirth);
    const ageBandForQuery = ageBand === 'out_of_range' ? null : ageBand;

    // Check which dimensions have stale caches
    const existingCaches = await fastify.prisma.scoreCache.findMany({
      where: { childId },
    });

    const cacheMap = new Map(
      existingCaches.map((c: any) => [c.dimension, c])
    );

    const scores: DimensionScore[] = [];

    for (const dimension of DIMENSIONS) {
      const cached = cacheMap.get(dimension);

      if (cached && !cached.stale) {
        // Return cached score — recalculate factors for the response
        // but use the cached score value
        const detail = await calculateDimensionScore(
          fastify.prisma,
          childId,
          dimension as Dimension,
          ageBandForQuery
        );
        scores.push({ ...detail, score: cached.score });
      } else {
        // Calculate fresh score
        const detail = await calculateDimensionScore(
          fastify.prisma,
          childId,
          dimension as Dimension,
          ageBandForQuery
        );

        // Upsert cache
        await fastify.prisma.scoreCache.upsert({
          where: {
            childId_dimension: { childId, dimension: dimension as Dimension },
          },
          create: {
            childId,
            dimension: dimension as Dimension,
            score: detail.score,
            calculatedAt: new Date(),
            stale: false,
          },
          update: {
            score: detail.score,
            calculatedAt: new Date(),
            stale: false,
          },
        });

        scores.push(detail);
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

    const child = await fastify.prisma.child.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

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

  // GET /api/dashboard/:childId/milestones-due — Next 3 unchecked milestones
  fastify.get('/:childId/milestones-due', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    const child = await fastify.prisma.child.findFirst({
      where: { id: childId, parentId },
    });

    if (!child) {
      throw new NotFoundError('Child not found');
    }

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
