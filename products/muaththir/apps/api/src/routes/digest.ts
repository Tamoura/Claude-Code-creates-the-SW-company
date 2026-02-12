import { FastifyPluginAsync } from 'fastify';

const digestRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/digest/weekly — Weekly summary for the authenticated parent
  fastify.get('/weekly', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const parent = request.currentUser!;

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Fetch all children for this parent
    const children = await fastify.prisma.child.findMany({
      where: { parentId: parent.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (children.length === 0) {
      return reply.code(200).send({
        period: {
          from: sevenDaysAgo.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0],
        },
        children: [],
        overall: {
          totalObservations: 0,
          totalMilestones: 0,
        },
      });
    }

    const childIds = children.map((c) => c.id);

    // Batch-fetch all data in parallel
    const [recentObservations, recentMilestones] = await Promise.all([
      // Observations from last 7 days, not deleted
      fastify.prisma.observation.findMany({
        where: {
          childId: { in: childIds },
          deletedAt: null,
          observedAt: { gte: sevenDaysAgo },
        },
        select: {
          childId: true,
          dimension: true,
          sentiment: true,
        },
      }),
      // Milestones achieved in last 7 days
      fastify.prisma.childMilestone.findMany({
        where: {
          childId: { in: childIds },
          achieved: true,
          achievedAt: { gte: sevenDaysAgo },
        },
        select: {
          childId: true,
          milestone: {
            select: { dimension: true },
          },
        },
      }),
    ]);

    // Group observations by childId
    const obsByChild = new Map<
      string,
      { total: number; byDimension: Map<string, number>; needsAttention: Set<string> }
    >();

    for (const obs of recentObservations) {
      let entry = obsByChild.get(obs.childId);
      if (!entry) {
        entry = {
          total: 0,
          byDimension: new Map(),
          needsAttention: new Set(),
        };
        obsByChild.set(obs.childId, entry);
      }
      entry.total++;
      entry.byDimension.set(
        obs.dimension,
        (entry.byDimension.get(obs.dimension) || 0) + 1
      );
      if (obs.sentiment === 'needs_attention') {
        entry.needsAttention.add(obs.dimension);
      }
    }

    // Group milestones by childId
    const milestonesByChild = new Map<string, number>();
    for (const cm of recentMilestones) {
      milestonesByChild.set(
        cm.childId,
        (milestonesByChild.get(cm.childId) || 0) + 1
      );
    }

    // Build per-child summaries
    let totalObservations = 0;
    let totalMilestones = 0;

    const childSummaries = children.map((child) => {
      const obsData = obsByChild.get(child.id);
      const observationCount = obsData?.total ?? 0;
      const milestonesAchieved = milestonesByChild.get(child.id) ?? 0;

      totalObservations += observationCount;
      totalMilestones += milestonesAchieved;

      // Determine top dimension (most observations)
      let topDimension: string | null = null;
      if (obsData && obsData.byDimension.size > 0) {
        let maxCount = 0;
        for (const [dim, count] of obsData.byDimension) {
          if (count > maxCount) {
            maxCount = count;
            topDimension = dim;
          }
        }
      }

      // Areas needing attention
      const areasNeedingAttention = obsData
        ? Array.from(obsData.needsAttention).sort()
        : [];

      return {
        childId: child.id,
        childName: child.name,
        observationCount,
        milestonesAchieved,
        topDimension,
        areasNeedingAttention,
      };
    });

    return reply.code(200).send({
      period: {
        from: sevenDaysAgo.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      },
      children: childSummaries,
      overall: {
        totalObservations,
        totalMilestones,
      },
    });
  });
};

export default digestRoutes;
