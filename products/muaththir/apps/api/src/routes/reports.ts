import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { DIMENSIONS, DimensionType } from '../types';
import { Dimension } from '@prisma/client';
import {
  calculateDimensionScore,
  gatherDimensionData,
  DimensionScore,
  DimensionData,
} from '../services/score-calculator';

/**
 * Report Generation API
 *
 * Aggregates dashboard scores, AI insights, observations,
 * milestones, and goals into a single comprehensive report.
 */

interface Strength {
  dimension: string;
  title: string;
  detail: string;
  score: number;
}

interface AreaForGrowth {
  dimension: string;
  title: string;
  detail: string;
  score: number;
  suggestions: string[];
}

interface Recommendation {
  type: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

type TrendDirection =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'no_data'
  | 'needs_attention';

const DIMENSION_LABELS: Record<string, string> = {
  academic: 'Academic',
  social_emotional: 'Social & Emotional',
  behavioural: 'Behavioural',
  aspirational: 'Aspirational',
  islamic: 'Islamic',
  physical: 'Physical',
};

const DIMENSION_SUGGESTIONS: Record<string, string[]> = {
  academic: [
    'Log daily reading or homework sessions',
    'Track school achievements and progress',
  ],
  social_emotional: [
    'Note interactions with friends and siblings',
    'Track emotional expression and regulation',
  ],
  behavioural: [
    'Observe daily routines and habits',
    'Note positive behaviour patterns',
  ],
  aspirational: [
    'Discuss dreams and goals with your child',
    'Track creative projects and interests',
  ],
  islamic: [
    'Log Quran practice sessions',
    'Track daily prayers and Islamic learning',
  ],
  physical: [
    'Log daily physical activities',
    'Track sports milestones and outdoor play',
  ],
};

function buildStrengths(data: DimensionData[]): Strength[] {
  return data
    .filter((d) => d.score >= 60 && d.recentObsCount >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => {
      const label = DIMENSION_LABELS[d.dimension];
      const positivePercent =
        d.recentObsCount > 0
          ? Math.round(
              (d.positiveCount / d.recentObsCount) * 100
            )
          : 0;
      return {
        dimension: d.dimension,
        title: `Strong ${label} Engagement`,
        detail:
          `${d.recentObsCount} observations with ` +
          `${positivePercent}% positive sentiment in ` +
          `${label.toLowerCase()} over the past 30 days.`,
        score: d.score,
      };
    });
}

function buildAreasForGrowth(
  data: DimensionData[]
): AreaForGrowth[] {
  return data
    .filter((d) => d.score < 40 || d.recentObsCount < 2)
    .sort((a, b) => a.score - b.score)
    .map((d) => {
      const label = DIMENSION_LABELS[d.dimension];
      const detail =
        d.recentObsCount < 2
          ? `Only ${d.recentObsCount} ${label.toLowerCase()} ` +
            `observation${d.recentObsCount === 1 ? '' : 's'} logged. ` +
            `Consider tracking more ${label.toLowerCase()} activities.`
          : `${label} score is ${d.score}. ` +
            `Consider focusing on this area.`;
      return {
        dimension: d.dimension,
        title: `${label} Needs Attention`,
        detail,
        score: d.score,
        suggestions: DIMENSION_SUGGESTIONS[d.dimension] || [],
      };
    });
}

async function buildRecommendations(
  prisma: any,
  childId: string,
  childName: string,
  data: DimensionData[],
  ageBand: string | null
): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const d of data) {
    if (d.recentObsCount === 0) {
      const label = DIMENSION_LABELS[d.dimension];
      const suggestion =
        DIMENSION_SUGGESTIONS[d.dimension]?.[0] || '';
      recs.push({
        type: 'observation_gap',
        message:
          `You haven't logged any ${label.toLowerCase()} ` +
          `observations this month. ` +
          (suggestion
            ? `Try: ${suggestion.toLowerCase()}.`
            : ''),
        priority: 'medium',
      });
    }
  }

  for (const d of data) {
    if (
      d.recentObsCount > 0 &&
      d.recentNeedsAttentionCount / d.recentObsCount > 0.5
    ) {
      const label = DIMENSION_LABELS[d.dimension];
      recs.push({
        type: 'sentiment_alert',
        message:
          `Multiple concerns noted in ${label.toLowerCase()}. ` +
          `Review recent ${label.toLowerCase()} observations.`,
        priority: 'high',
      });
    }
  }

  // Batch: fetch milestone + streak data in parallel
  const [achievedIds, recentWeekCount] = await Promise.all([
    ageBand
      ? prisma.childMilestone.findMany({
          where: { childId, achieved: true },
          select: { milestoneId: true },
        })
      : Promise.resolve([]),
    prisma.observation.count({
      where: {
        childId,
        deletedAt: null,
        observedAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  if (ageBand) {
    const achieved = achievedIds.map(
      (m: { milestoneId: string }) => m.milestoneId
    );

    const dueCount = await prisma.milestoneDefinition.count({
      where: {
        ageBand: ageBand as any,
        id: { notIn: achieved },
      },
    });

    if (dueCount > 2) {
      recs.push({
        type: 'milestone_reminder',
        message:
          `${dueCount} milestones are due for ${childName}'s ` +
          `age band. Check the milestones page.`,
        priority: 'low',
      });
    }
  }

  const allDimsHaveObs = data.every(
    (d) => d.recentObsCount >= 1
  );
  if (allDimsHaveObs) {
    recs.push({
      type: 'consistency_praise',
      message:
        `Great balance! You've logged observations across ` +
        `all 6 dimensions this month.`,
      priority: 'low',
    });
  }

  if (recentWeekCount > 5) {
    recs.push({
      type: 'streak_notice',
      message:
        `Great consistency! ${recentWeekCount} observations ` +
        `logged in the past week.`,
      priority: 'low',
    });
  }

  return recs;
}

function buildTrends(data: DimensionData[]): {
  overallDirection: string;
  dimensionTrends: Record<string, TrendDirection>;
} {
  const dimensionTrends: Record<string, TrendDirection> = {};

  for (const d of data) {
    if (d.totalObsCount === 0) {
      dimensionTrends[d.dimension] = 'no_data';
      continue;
    }

    if (
      d.recentObsCount > 0 &&
      d.recentNeedsAttentionCount / d.recentObsCount > 0.5
    ) {
      dimensionTrends[d.dimension] = 'needs_attention';
      continue;
    }

    if (d.recentObsCount > d.previousObsCount) {
      dimensionTrends[d.dimension] = 'improving';
    } else if (d.recentObsCount < d.previousObsCount) {
      dimensionTrends[d.dimension] = 'declining';
    } else {
      dimensionTrends[d.dimension] = 'stable';
    }
  }

  const countable = Object.values(dimensionTrends).filter(
    (t) => t !== 'no_data'
  );

  let overallDirection = 'stable';
  if (countable.length > 0) {
    const improving = countable.filter(
      (t) => t === 'improving'
    ).length;
    const declining = countable.filter(
      (t) => t === 'declining' || t === 'needs_attention'
    ).length;

    if (improving > declining) {
      overallDirection = 'improving';
    } else if (declining > improving) {
      overallDirection = 'declining';
    }
  }

  return { overallDirection, dimensionTrends };
}

function buildSummary(
  childName: string,
  strengths: Strength[],
  areasForGrowth: AreaForGrowth[],
  trends: { overallDirection: string }
): string {
  if (strengths.length === 0 && areasForGrowth.length === 6) {
    return (
      `No observations logged yet for ${childName}. ` +
      `Start tracking across all dimensions for insights.`
    );
  }

  const parts: string[] = [];

  if (strengths.length > 0) {
    const labels = strengths
      .map((s) => DIMENSION_LABELS[s.dimension])
      .join(', ');
    parts.push(`${childName} shows strength in ${labels}`);
  }

  if (areasForGrowth.length > 0 && areasForGrowth.length <= 4) {
    const labels = areasForGrowth
      .slice(0, 2)
      .map((a) => DIMENSION_LABELS[a.dimension])
      .join(' and ');
    parts.push(`${labels} could use more attention`);
  }

  if (trends.overallDirection === 'improving') {
    parts.push('overall trend is positive');
  } else if (trends.overallDirection === 'declining') {
    parts.push('activity has decreased recently');
  }

  return parts.length > 0
    ? parts.join('. ') + '.'
    : `${childName}'s development is being tracked across all dimensions.`;
}

// --- Validation ---

const reportQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be a valid date (YYYY-MM-DD)')
    .refine((val) => !isNaN(Date.parse(val)), 'from must be a valid date')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be a valid date (YYYY-MM-DD)')
    .refine((val) => !isNaN(Date.parse(val)), 'to must be a valid date')
    .optional(),
  observations: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return 10;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) return undefined;
      return Math.min(Math.max(parsed, 1), 100);
    })
    .refine((val) => val !== undefined, 'observations must be a valid number')
    .default('10'),
});

// --- Route ---

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children/:childId/reports/summary
  fastify.get(
    '/:childId/reports/summary',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { childId } = request.params as { childId: string };
      const parentId = request.currentUser!.id;

      // Validate query parameters
      const parsed = reportQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation error',
          message: parsed.error.errors[0]?.message || 'Invalid query parameters',
        });
      }
      const validatedQuery = parsed.data;

      const child = await verifyChildOwnership(
        fastify,
        childId,
        parentId
      );

      const ageBand = getAgeBand(child.dateOfBirth);
      const ageBandForQuery =
        ageBand === 'out_of_range' ? null : ageBand;

      // Parse date range
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const fromDate = validatedQuery.from
        ?? thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = validatedQuery.to
        ?? now.toISOString().split('T')[0];

      const observationsLimit = validatedQuery.observations;

      // Batch all independent queries with Promise.all
      const [
        dimensionScores,
        dimensionData,
        recentObservations,
        goalCounts,
        obsByDimension,
        milestoneAggregation,
      ] = await Promise.all([
        // 1. Dashboard scores
        Promise.all(
          DIMENSIONS.map((d) =>
            calculateDimensionScore(
              fastify.prisma,
              childId,
              d as Dimension,
              ageBandForQuery
            )
          )
        ),
        // 2. Insights data
        gatherDimensionData(
          fastify.prisma,
          childId,
          ageBandForQuery
        ),
        // 3. Recent observations
        fastify.prisma.observation.findMany({
          where: { childId, deletedAt: null },
          orderBy: { observedAt: 'desc' },
          take: observationsLimit,
          select: {
            id: true,
            dimension: true,
            content: true,
            sentiment: true,
            observedAt: true,
            tags: true,
            createdAt: true,
          },
        }),
        // 4. Goal counts by status
        Promise.all([
          fastify.prisma.goal.count({
            where: { childId, status: 'active' },
          }),
          fastify.prisma.goal.count({
            where: { childId, status: 'completed' },
          }),
          fastify.prisma.goal.count({
            where: { childId, status: 'paused' },
          }),
        ]),
        // 5. Observations by dimension within date range
        fastify.prisma.observation.groupBy({
          by: ['dimension'],
          where: {
            childId,
            deletedAt: null,
            observedAt: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            },
          },
          _count: true,
        }),
        // 6. Milestone progress aggregation
        Promise.all([
          ageBandForQuery
            ? fastify.prisma.milestoneDefinition.groupBy({
                by: ['dimension'],
                where: { ageBand: ageBandForQuery as any },
                _count: true,
              })
            : Promise.resolve([]),
          ageBandForQuery
            ? fastify.prisma.childMilestone.findMany({
                where: {
                  childId,
                  achieved: true,
                  milestone: {
                    ageBand: ageBandForQuery as any,
                  },
                },
                select: {
                  milestone: { select: { dimension: true } },
                },
              })
            : Promise.resolve([]),
        ]),
      ]);

      // Calculate overall score
      const overallScore =
        dimensionScores.length > 0
          ? Math.round(
              dimensionScores.reduce(
                (sum, s) => sum + s.score,
                0
              ) / dimensionScores.length
            )
          : 0;

      // Build insights
      const strengths = buildStrengths(dimensionData);
      const areasForGrowth = buildAreasForGrowth(dimensionData);
      const recommendations = await buildRecommendations(
        fastify.prisma,
        childId,
        child.name,
        dimensionData,
        ageBandForQuery
      );
      const trends = buildTrends(dimensionData);
      const summary = buildSummary(
        child.name,
        strengths,
        areasForGrowth,
        trends
      );

      // Build milestone progress
      const [milestoneDefs, achievedMilestones] =
        milestoneAggregation;
      const milestoneDefByDim = new Map(
        (milestoneDefs as any[]).map((g: any) => [
          g.dimension,
          g._count,
        ])
      );
      const achievedByDim = new Map<string, number>();
      for (const cm of achievedMilestones as any[]) {
        const dim = cm.milestone.dimension;
        achievedByDim.set(
          dim,
          (achievedByDim.get(dim) || 0) + 1
        );
      }

      let totalAchieved = 0;
      let totalAvailable = 0;
      const byDimension: Record<
        string,
        { achieved: number; total: number }
      > = {};

      for (const dimension of DIMENSIONS) {
        const total = milestoneDefByDim.get(dimension) || 0;
        const achieved = achievedByDim.get(dimension) || 0;
        if (total > 0 || achieved > 0) {
          byDimension[dimension] = { achieved, total };
        }
        totalAchieved += achieved;
        totalAvailable += total;
      }

      // Build observations by dimension
      const observationsByDimension: Record<string, number> = {};
      for (const group of obsByDimension as any[]) {
        observationsByDimension[group.dimension] = group._count;
      }

      // Build goal counts
      const [activeGoals, completedGoals, pausedGoals] =
        goalCounts;

      // Format observations for response
      const formattedObservations = (
        recentObservations as any[]
      ).map((obs: any) => ({
        id: obs.id,
        dimension: obs.dimension,
        content: obs.content,
        sentiment: obs.sentiment,
        observedAt: obs.observedAt.toISOString().split('T')[0],
        tags: obs.tags,
        createdAt: obs.createdAt.toISOString(),
      }));

      return reply.send({
        childId,
        childName: child.name,
        ageBand: ageBand === 'out_of_range' ? null : ageBand,
        generatedAt: new Date().toISOString(),
        dateRange: { from: fromDate, to: toDate },
        overallScore,
        dimensions: dimensionScores,
        insights: {
          summary,
          strengths,
          areasForGrowth,
          recommendations,
          trends,
        },
        recentObservations: formattedObservations,
        milestoneProgress: {
          totalAchieved,
          totalAvailable,
          byDimension,
        },
        goals: {
          active: activeGoals,
          completed: completedGoals,
          paused: pausedGoals,
        },
        observationsByDimension,
      });
    }
  );
};

export default reportRoutes;
