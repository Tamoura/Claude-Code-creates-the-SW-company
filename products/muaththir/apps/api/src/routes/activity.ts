import { FastifyPluginAsync } from 'fastify';
import { verifyChildOwnership } from '../lib/ownership';

interface ActivityItem {
  type: 'observation' | 'milestone' | 'goal';
  title: string;
  date: string;
  dimension: string;
  details: Record<string, unknown>;
}

const ACTIVITY_LIMIT = 20;

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/activity/:childId — Unified activity feed
  fastify.get('/:childId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    // Fetch observations, achieved milestones, and goals in parallel
    const [observations, childMilestones, goals] = await Promise.all([
      fastify.prisma.observation.findMany({
        where: { childId, deletedAt: null },
        orderBy: { observedAt: 'desc' },
        take: ACTIVITY_LIMIT,
      }),
      fastify.prisma.childMilestone.findMany({
        where: { childId, achieved: true },
        include: { milestone: true },
        orderBy: { achievedAt: 'desc' },
        take: ACTIVITY_LIMIT,
      }),
      fastify.prisma.goal.findMany({
        where: { childId },
        orderBy: { createdAt: 'desc' },
        take: ACTIVITY_LIMIT,
      }),
    ]);

    // Map to unified activity items
    const activities: ActivityItem[] = [];

    for (const obs of observations) {
      activities.push({
        type: 'observation',
        title: obs.content,
        date: obs.observedAt.toISOString(),
        dimension: obs.dimension,
        details: {
          sentiment: obs.sentiment,
          tags: obs.tags,
        },
      });
    }

    for (const cm of childMilestones) {
      activities.push({
        type: 'milestone',
        title: cm.milestone.title,
        date: (cm.achievedAt ?? cm.createdAt).toISOString(),
        dimension: cm.milestone.dimension,
        details: {
          achieved: cm.achieved,
          description: cm.milestone.description,
        },
      });
    }

    for (const goal of goals) {
      activities.push({
        type: 'goal',
        title: goal.title,
        date: goal.createdAt.toISOString(),
        dimension: goal.dimension,
        details: {
          status: goal.status,
          description: goal.description,
          targetDate: goal.targetDate
            ? goal.targetDate.toISOString().split('T')[0]
            : null,
        },
      });
    }

    // Sort by date descending and limit to 20
    activities.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const limited = activities.slice(0, ACTIVITY_LIMIT);

    return reply.code(200).send({ data: limited });
  });
};

export default activityRoutes;
