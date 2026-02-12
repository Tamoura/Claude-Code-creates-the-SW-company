import { createHash } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { DIMENSIONS, DimensionType } from '../types';
import { AgeBand, Dimension } from '@prisma/client';
import { DimensionScore } from '../services/score-calculator';
import {
  GroupByDimension,
  ChildMilestoneForScoring,
  ChildMilestoneWithMilestone,
} from '../types/prisma-results';

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
 *
 * N+1 Optimization: All data is batch-fetched in 3-4 queries using
 * groupBy and findMany, then processed in-memory. Stale dimensions
 * are recalculated from the batch data without additional queries.
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Batch-fetch ALL data in 3-4 queries (instead of 12-18 sequential)
    const [
      existingCaches,
      recentObservations,
      allChildMilestones,
      allMilestoneDefs,
    ] = await Promise.all([
      // 1. Score cache for all dimensions
      fastify.prisma.scoreCache.findMany({ where: { childId } }),
      // 2. Recent observations with sentiment (single query, grouped in-memory)
      fastify.prisma.observation.findMany({
        where: { childId, deletedAt: null, observedAt: { gte: thirtyDaysAgo } },
        select: { dimension: true, sentiment: true },
      }),
      // 3. All child milestones with their definitions
      fastify.prisma.childMilestone.findMany({
        where: { childId },
        select: { achieved: true, milestone: { select: { dimension: true, ageBand: true } } },
      }),
      // 4. Milestone definitions grouped by dimension for age band
      ageBandForQuery
        ? fastify.prisma.milestoneDefinition.groupBy({
            by: ['dimension'],
            where: { ageBand: ageBandForQuery as AgeBand },
            _count: true,
          })
        : Promise.resolve([]),
    ]);

    const cacheMap = new Map(
      existingCaches.map((c) => [c.dimension, c] as const)
    );
    const milestoneDefMap = new Map(
      (allMilestoneDefs as GroupByDimension[]).map(
        (g) => [g.dimension, g._count] as const
      )
    );

    // Group recent observations by dimension (in-memory, no extra query)
    const obsByDim = new Map<string, { count: number; positiveCount: number }>();
    for (const obs of recentObservations) {
      const entry = obsByDim.get(obs.dimension) || { count: 0, positiveCount: 0 };
      entry.count++;
      if (obs.sentiment === 'positive') {
        entry.positiveCount++;
      }
      obsByDim.set(obs.dimension, entry);
    }

    // Group achieved milestones by dimension for the target age band (in-memory)
    const achievedByDim = new Map<string, number>();
    for (const cm of allChildMilestones as ChildMilestoneForScoring[]) {
      if (ageBandForQuery && cm.milestone.ageBand === ageBandForQuery && cm.achieved) {
        achievedByDim.set(cm.milestone.dimension, (achievedByDim.get(cm.milestone.dimension) || 0) + 1);
      }
    }

    // Calculate scores for all dimensions from batch data
    const scores: DimensionScore[] = [];
    const cacheUpserts: Promise<unknown>[] = [];

    for (const dimension of DIMENSIONS) {
      const cached = cacheMap.get(dimension);

      if (cached && !cached.stale) {
        // Use cached score, populate metadata from batch data
        const dimObs = obsByDim.get(dimension) || { count: 0, positiveCount: 0 };
        scores.push({
          dimension: dimension as DimensionType,
          score: cached.score,
          factors: { observation: 0, milestone: 0, sentiment: 0 },
          observationCount: dimObs.count,
          milestoneProgress: {
            achieved: achievedByDim.get(dimension) || 0,
            total: milestoneDefMap.get(dimension) || 0,
          },
        });
      } else {
        // Calculate from batch data (no additional DB queries)
        const dimObs = obsByDim.get(dimension) || { count: 0, positiveCount: 0 };
        const observationCount = dimObs.count;
        const positiveCount = dimObs.positiveCount;

        const observationFactor = (Math.min(observationCount, 10) / 10) * 100;
        const sentimentFactor = observationCount > 0
          ? (positiveCount / observationCount) * 100
          : 0;

        const milestoneTotal = milestoneDefMap.get(dimension) || 0;
        const milestoneAchieved = achievedByDim.get(dimension) || 0;
        const milestoneFactor = milestoneTotal > 0
          ? (milestoneAchieved / milestoneTotal) * 100
          : 0;

        const score = Math.round(
          observationFactor * 0.4 + milestoneFactor * 0.4 + sentimentFactor * 0.2
        );

        scores.push({
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
        });

        // Update cache in background (non-blocking for response)
        cacheUpserts.push(
          fastify.prisma.scoreCache.upsert({
            where: { childId_dimension: { childId, dimension: dimension as Dimension } },
            create: { childId, dimension: dimension as Dimension, score, calculatedAt: new Date(), stale: false },
            update: { score, calculatedAt: new Date(), stale: false },
          })
        );
      }
    }

    // Wait for cache updates (they're small upserts, fast)
    if (cacheUpserts.length > 0) {
      await Promise.all(cacheUpserts);
    }

    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    const calculatedAt = new Date().toISOString();

    // Generate ETag from stable score data for cache validation.
    // Uses overallScore + per-dimension scores so ETag only changes
    // when the underlying data changes.
    const scoreFingerprint = scores
      .map((s) => `${s.dimension}:${s.score}`)
      .join(',');
    const etagHash = createHash('md5')
      .update(`${childId}:${overallScore}:${scoreFingerprint}`)
      .digest('hex');
    const etag = `"${etagHash}"`;

    // Return 304 if client has a matching ETag
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      reply.header('ETag', etag);
      reply.header('Cache-Control', 'private, max-age=30');
      return reply.code(304).send();
    }

    reply.header('Cache-Control', 'private, max-age=30');
    reply.header('ETag', etag);

    return reply.send({
      childId,
      childName: child.name,
      ageBand: ageBand === 'out_of_range' ? null : ageBand,
      overallScore,
      dimensions: scores,
      calculatedAt,
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

    for (const cm of milestones as ChildMilestoneWithMilestone[]) {
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
        ageBand: ageBand as AgeBand,
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
