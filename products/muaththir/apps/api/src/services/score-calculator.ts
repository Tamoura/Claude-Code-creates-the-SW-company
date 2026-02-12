import { Dimension } from '@prisma/client';
import { DIMENSIONS, DimensionType } from '../types';

/**
 * Shared score calculation utilities.
 *
 * Used by dashboard, insights, and reports routes to avoid
 * duplicating the scoring algorithm.
 *
 * Score formula (0-100 per dimension):
 *   score = (observation_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2)
 */

export interface DimensionScore {
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

export interface DimensionData {
  dimension: DimensionType;
  score: number;
  recentObsCount: number;
  previousObsCount: number;
  totalObsCount: number;
  positiveCount: number;
  needsAttentionCount: number;
  recentPositiveCount: number;
  recentNeedsAttentionCount: number;
}

export async function calculateDimensionScore(
  prisma: any,
  childId: string,
  dimension: Dimension,
  ageBand: string | null
): Promise<DimensionScore> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

  const observationFactor =
    (Math.min(observationCount, 10) / 10) * 100;
  const sentimentFactor =
    observationCount > 0
      ? (positiveCount / observationCount) * 100
      : 0;

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
    milestoneTotal > 0
      ? (milestoneAchieved / milestoneTotal) * 100
      : 0;

  const score = Math.round(
    observationFactor * 0.4 +
      milestoneFactor * 0.4 +
      sentimentFactor * 0.2
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

export async function gatherDimensionData(
  prisma: any,
  childId: string,
  ageBand: string | null
): Promise<DimensionData[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const [recentObs, previousObs, allTimeCounts, milestoneDefs, childMilestones] =
    await Promise.all([
      prisma.observation.findMany({
        where: {
          childId,
          deletedAt: null,
          observedAt: { gte: thirtyDaysAgo },
        },
        select: { dimension: true, sentiment: true },
      }),
      prisma.observation.findMany({
        where: {
          childId,
          deletedAt: null,
          observedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        select: { dimension: true },
      }),
      prisma.observation.groupBy({
        by: ['dimension'],
        where: { childId, deletedAt: null },
        _count: true,
      }),
      ageBand
        ? prisma.milestoneDefinition.groupBy({
            by: ['dimension'],
            where: { ageBand },
            _count: true,
          })
        : Promise.resolve([]),
      ageBand
        ? prisma.childMilestone.findMany({
            where: {
              childId,
              achieved: true,
              milestone: { ageBand },
            },
            select: {
              milestone: { select: { dimension: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const recentByDim = new Map<string, Array<{ sentiment: string }>>();
  for (const obs of recentObs as any[]) {
    const arr = recentByDim.get(obs.dimension) || [];
    arr.push(obs);
    recentByDim.set(obs.dimension, arr);
  }

  const previousCountByDim = new Map<string, number>();
  for (const obs of previousObs as any[]) {
    previousCountByDim.set(
      obs.dimension,
      (previousCountByDim.get(obs.dimension) || 0) + 1
    );
  }

  const totalCountByDim = new Map(
    (allTimeCounts as any[]).map((g: any) => [g.dimension, g._count])
  );
  const milestoneDefByDim = new Map(
    (milestoneDefs as any[]).map((g: any) => [g.dimension, g._count])
  );

  const achievedByDim = new Map<string, number>();
  for (const cm of childMilestones as any[]) {
    const dim = cm.milestone.dimension;
    achievedByDim.set(dim, (achievedByDim.get(dim) || 0) + 1);
  }

  const results: DimensionData[] = [];

  for (const dimension of DIMENSIONS) {
    const dimObs = recentByDim.get(dimension) || [];
    const recentCount = dimObs.length;
    const positiveCount = dimObs.filter(
      (o) => o.sentiment === 'positive'
    ).length;
    const needsAttentionCount = dimObs.filter(
      (o) => o.sentiment === 'needs_attention'
    ).length;
    const previousCount = previousCountByDim.get(dimension) || 0;
    const totalObs = totalCountByDim.get(dimension) || 0;

    const observationFactor =
      (Math.min(recentCount, 10) / 10) * 100;
    const sentimentFactor =
      recentCount > 0 ? (positiveCount / recentCount) * 100 : 0;

    const milestoneTotal = milestoneDefByDim.get(dimension) || 0;
    const milestoneAchieved = achievedByDim.get(dimension) || 0;
    const milestoneFactor =
      milestoneTotal > 0
        ? (milestoneAchieved / milestoneTotal) * 100
        : 0;

    const score = Math.round(
      observationFactor * 0.4 +
        milestoneFactor * 0.4 +
        sentimentFactor * 0.2
    );

    results.push({
      dimension: dimension as DimensionType,
      score,
      recentObsCount: recentCount,
      previousObsCount: previousCount,
      totalObsCount: totalObs,
      positiveCount,
      needsAttentionCount,
      recentPositiveCount: positiveCount,
      recentNeedsAttentionCount: needsAttentionCount,
    });
  }

  return results;
}
