import { FastifyPluginAsync } from 'fastify';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { DIMENSIONS, DimensionType } from '../types';
import { AgeBand, Dimension } from '@prisma/client';
import { gatherDimensionData, DimensionData } from '../services/score-calculator';

/**
 * AI Insights API — rule-based developmental insights
 *
 * Analyzes observations, milestones, and scores to produce
 * strengths, areas for growth, recommendations, and trends.
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
          ? Math.round((d.positiveCount / d.recentObsCount) * 100)
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

function buildAreasForGrowth(data: DimensionData[]): AreaForGrowth[] {
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

  // 1. observation_gap: dimensions with 0 recent observations
  for (const d of data) {
    if (d.recentObsCount === 0) {
      const label = DIMENSION_LABELS[d.dimension];
      const suggestion = DIMENSION_SUGGESTIONS[d.dimension]?.[0] || '';
      recs.push({
        type: 'observation_gap',
        message:
          `You haven't logged any ${label.toLowerCase()} ` +
          `observations this month. ` +
          (suggestion ? `Try: ${suggestion.toLowerCase()}.` : ''),
        priority: 'medium',
      });
    }
  }

  // 2. sentiment_alert: dimensions where needs_attention > 50%
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

  // 3. milestone_reminder: > 2 milestones due for age band
  if (ageBand) {
    const achieved = achievedIds.map(
      (m: { milestoneId: string }) => m.milestoneId
    );

    const dueCount = await prisma.milestoneDefinition.count({
      where: {
        ageBand: ageBand as AgeBand,
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

  // 4. consistency_praise: all 6 dimensions have >= 1 observation
  const allDimsHaveObs = data.every((d) => d.recentObsCount >= 1);
  if (allDimsHaveObs) {
    recs.push({
      type: 'consistency_praise',
      message:
        `Great balance! You've logged observations across ` +
        `all 6 dimensions this month.`,
      priority: 'low',
    });
  }

  // 5. streak_notice: > 5 observations in last 7 days
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

    // Check needs_attention first (takes priority)
    if (
      d.recentObsCount > 0 &&
      d.recentNeedsAttentionCount / d.recentObsCount > 0.5
    ) {
      dimensionTrends[d.dimension] = 'needs_attention';
      continue;
    }

    // Compare current vs previous 30-day period
    if (d.recentObsCount > d.previousObsCount) {
      dimensionTrends[d.dimension] = 'improving';
    } else if (d.recentObsCount < d.previousObsCount) {
      dimensionTrends[d.dimension] = 'declining';
    } else {
      dimensionTrends[d.dimension] = 'stable';
    }
  }

  // Overall direction: majority vote excluding no_data
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

const insightsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/dashboard/:childId/insights
  fastify.get(
    '/:childId/insights',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { childId } = request.params as { childId: string };
      const parentId = request.currentUser!.id;

      const child = await verifyChildOwnership(
        fastify,
        childId,
        parentId
      );

      const ageBand = getAgeBand(child.dateOfBirth);
      const ageBandForQuery =
        ageBand === 'out_of_range' ? null : ageBand;

      const dimensionData = await gatherDimensionData(
        fastify.prisma,
        childId,
        ageBandForQuery
      );

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

      return reply.send({
        childId,
        childName: child.name,
        generatedAt: new Date().toISOString(),
        summary,
        strengths,
        areasForGrowth,
        recommendations,
        trends,
      });
    }
  );
};

export default insightsRoutes;
