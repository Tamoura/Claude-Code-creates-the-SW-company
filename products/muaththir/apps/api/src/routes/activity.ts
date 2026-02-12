import { FastifyPluginAsync } from 'fastify';
import { Observation, Goal, ChildMilestone, MilestoneDefinition } from '@prisma/client';
import { verifyChildOwnership } from '../lib/ownership';

interface ActivityItem {
  type: 'observation' | 'milestone' | 'goal';
  title: string;
  date: string;
  dimension: string;
  details: Record<string, unknown>;
}

type ChildMilestoneWithDef = ChildMilestone & { milestone: MilestoneDefinition };

const ACTIVITY_LIMIT = 20;

function mapObservation(obs: Observation): ActivityItem {
  return {
    type: 'observation',
    title: obs.content,
    date: obs.observedAt.toISOString(),
    dimension: obs.dimension,
    details: { sentiment: obs.sentiment, tags: obs.tags },
  };
}

function mapMilestone(cm: ChildMilestoneWithDef): ActivityItem {
  return {
    type: 'milestone',
    title: cm.milestone.title,
    date: (cm.achievedAt ?? cm.createdAt).toISOString(),
    dimension: cm.milestone.dimension,
    details: { achieved: cm.achieved, description: cm.milestone.description },
  };
}

function mapGoal(goal: Goal): ActivityItem {
  return {
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
  };
}

function sortByDateDesc(a: ActivityItem, b: ActivityItem): number {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

const activityRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/activity/:childId — Unified activity feed
  fastify.get('/:childId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

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

    const activities: ActivityItem[] = [
      ...observations.map(mapObservation),
      ...childMilestones.map(mapMilestone),
      ...goals.map(mapGoal),
    ];

    activities.sort(sortByDateDesc);

    return reply.code(200).send({ data: activities.slice(0, ACTIVITY_LIMIT) });
  });
};

export default activityRoutes;
