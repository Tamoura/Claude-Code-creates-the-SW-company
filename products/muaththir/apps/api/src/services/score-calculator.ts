import { AgeBand, Dimension, PrismaClient } from '@prisma/client';
import { DIMENSIONS, DimensionType } from '../types';
import {
  GroupByDimension,
  ChildMilestoneForScoring,
  ChildMilestoneWithDimension,
  ObservationDimensionSentiment,
  ObservationDimension,
} from '../types/prisma-results';

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
  prisma: PrismaClient,
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
    const ageBandEnum = ageBand as AgeBand;
    milestoneTotal = await prisma.milestoneDefinition.count({
      where: { dimension, ageBand: ageBandEnum },
    });

    if (milestoneTotal > 0) {
      milestoneAchieved = await prisma.childMilestone.count({
        where: {
          childId,
          achieved: true,
          milestone: { dimension, ageBand: ageBandEnum },
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

export interface ChildSummary {
  childId: string;
  childName: string;
  overallScore: number;
  dimensions: Array<{ dimension: DimensionType; score: number }>;
}

/**
 * Calculate a compact dashboard summary for a child.
 * Used by the compare endpoint to avoid duplicating scoring logic.
 */
export async function calculateChildSummary(
  prisma: PrismaClient,
  childId: string,
  childName: string,
  ageBand: string | null
): Promise<ChildSummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ageBandForQuery = ageBand === 'out_of_range' ? null : ageBand;

  const [recentObservations, allChildMilestones, allMilestoneDefs] =
    await Promise.all([
      prisma.observation.findMany({
        where: {
          childId,
          deletedAt: null,
          observedAt: { gte: thirtyDaysAgo },
        },
        select: { dimension: true, sentiment: true },
      }),
      prisma.childMilestone.findMany({
        where: { childId },
        select: {
          achieved: true,
          milestone: { select: { dimension: true, ageBand: true } },
        },
      }),
      ageBandForQuery
        ? prisma.milestoneDefinition.groupBy({
            by: ['dimension'],
            where: { ageBand: ageBandForQuery as AgeBand },
            _count: true,
          })
        : Promise.resolve([]),
    ]);

  const milestoneDefMap = new Map(
    (allMilestoneDefs as GroupByDimension[]).map(
      (g) => [g.dimension, g._count] as const
    )
  );

  const obsByDim = new Map<
    string,
    { count: number; positiveCount: number }
  >();
  for (const obs of recentObservations as ObservationDimensionSentiment[]) {
    const entry = obsByDim.get(obs.dimension) || {
      count: 0,
      positiveCount: 0,
    };
    entry.count++;
    if (obs.sentiment === 'positive') {
      entry.positiveCount++;
    }
    obsByDim.set(obs.dimension, entry);
  }

  const achievedByDim = new Map<string, number>();
  for (const cm of allChildMilestones as ChildMilestoneForScoring[]) {
    if (
      ageBandForQuery &&
      cm.milestone.ageBand === ageBandForQuery &&
      cm.achieved
    ) {
      achievedByDim.set(
        cm.milestone.dimension,
        (achievedByDim.get(cm.milestone.dimension) || 0) + 1
      );
    }
  }

  const dimensions: Array<{ dimension: DimensionType; score: number }> =
    [];

  for (const dimension of DIMENSIONS) {
    const dimObs = obsByDim.get(dimension) || {
      count: 0,
      positiveCount: 0,
    };
    const observationFactor =
      (Math.min(dimObs.count, 10) / 10) * 100;
    const sentimentFactor =
      dimObs.count > 0
        ? (dimObs.positiveCount / dimObs.count) * 100
        : 0;

    const milestoneTotal = milestoneDefMap.get(dimension) || 0;
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

    dimensions.push({ dimension: dimension as DimensionType, score });
  }

  const overallScore =
    dimensions.length > 0
      ? Math.round(
          dimensions.reduce((sum, d) => sum + d.score, 0) /
            dimensions.length
        )
      : 0;

  return { childId, childName, overallScore, dimensions };
}

export async function gatherDimensionData(
  prisma: PrismaClient,
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
            where: { ageBand: ageBand as AgeBand },
            _count: true,
          })
        : Promise.resolve([]),
      ageBand
        ? prisma.childMilestone.findMany({
            where: {
              childId,
              achieved: true,
              milestone: { ageBand: ageBand as AgeBand },
            },
            select: {
              milestone: { select: { dimension: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const recentByDim = new Map<string, Array<{ sentiment: string }>>();
  for (const obs of recentObs as ObservationDimensionSentiment[]) {
    const arr = recentByDim.get(obs.dimension) || [];
    arr.push(obs);
    recentByDim.set(obs.dimension, arr);
  }

  const previousCountByDim = new Map<string, number>();
  for (const obs of previousObs as ObservationDimension[]) {
    previousCountByDim.set(
      obs.dimension,
      (previousCountByDim.get(obs.dimension) || 0) + 1
    );
  }

  const totalCountByDim = new Map(
    (allTimeCounts as GroupByDimension[]).map(
      (g) => [g.dimension, g._count] as const
    )
  );
  const milestoneDefByDim = new Map(
    (milestoneDefs as GroupByDimension[]).map(
      (g) => [g.dimension, g._count] as const
    )
  );

  const achievedByDim = new Map<string, number>();
  for (const cm of childMilestones as ChildMilestoneWithDimension[]) {
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
