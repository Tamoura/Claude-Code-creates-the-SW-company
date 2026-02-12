import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { verifyChildOwnership } from '../lib/ownership';
import { getAgeBand } from '../utils/age-band';
import { validateQuery } from '../utils/validation';
import { DIMENSIONS, DimensionType } from '../types';
import { Dimension } from '@prisma/client';

const compareQuerySchema = z.object({
  childIds: z.string().min(1, 'childIds is required'),
});

/**
 * Compare API
 *
 * Returns dashboard summaries for multiple children, allowing
 * side-by-side comparison of dimension scores.
 */
const compareRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children/compare?childIds=id1,id2
  fastify.get('/compare', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parentId = request.currentUser!.id;

    const { childIds: childIdsStr } = validateQuery(
      compareQuerySchema,
      request.query
    );

    const childIds = childIdsStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (childIds.length === 0) {
      const { ValidationError } = await import('../lib/errors');
      throw new ValidationError('At least one childId is required', {
        childIds: ['At least one childId is required'],
      });
    }

    // Verify all children belong to this parent
    const children = [];
    for (const childId of childIds) {
      const child = await verifyChildOwnership(fastify, childId, parentId);
      children.push(child);
    }

    // Build dashboard summary for each child
    const results = [];

    for (const child of children) {
      const ageBand = getAgeBand(child.dateOfBirth);
      const ageBandForQuery = ageBand === 'out_of_range' ? null : ageBand;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        recentObservations,
        allChildMilestones,
        allMilestoneDefs,
      ] = await Promise.all([
        fastify.prisma.observation.findMany({
          where: {
            childId: child.id,
            deletedAt: null,
            observedAt: { gte: thirtyDaysAgo },
          },
          select: { dimension: true, sentiment: true },
        }),
        fastify.prisma.childMilestone.findMany({
          where: { childId: child.id },
          select: {
            achieved: true,
            milestone: { select: { dimension: true, ageBand: true } },
          },
        }),
        ageBandForQuery
          ? fastify.prisma.milestoneDefinition.groupBy({
              by: ['dimension'],
              where: { ageBand: ageBandForQuery as any },
              _count: true,
            })
          : Promise.resolve([]),
      ]);

      const milestoneDefMap = new Map(
        (allMilestoneDefs as any[]).map((g: any) => [g.dimension, g._count])
      );

      const obsByDim = new Map<
        string,
        { count: number; positiveCount: number }
      >();
      for (const obs of recentObservations) {
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
      for (const cm of allChildMilestones as any[]) {
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

      const dimensions: Array<{
        dimension: DimensionType;
        score: number;
      }> = [];

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

        dimensions.push({
          dimension: dimension as DimensionType,
          score,
        });
      }

      const overallScore =
        dimensions.length > 0
          ? Math.round(
              dimensions.reduce((sum, d) => sum + d.score, 0) /
                dimensions.length
            )
          : 0;

      results.push({
        childId: child.id,
        childName: child.name,
        overallScore,
        dimensions,
      });
    }

    return reply.send({ children: results });
  });
};

export default compareRoutes;
