import { FastifyPluginAsync } from 'fastify';
import { verifyChildOwnership } from '../lib/ownership';

/**
 * Streaks API
 *
 * Calculates observation streaks for a child - consecutive days
 * with at least one observation recorded.
 *
 * Returns:
 *   currentStreak  - consecutive days ending today/yesterday with observations
 *   bestStreak     - longest consecutive day sequence ever
 *   totalObservations - total non-deleted observations
 *   lastObservationDate - most recent observation date (or null)
 */
const streakRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/children/:childId/streaks
  fastify.get('/:childId/streaks', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { childId } = request.params as { childId: string };
    const parentId = request.currentUser!.id;

    await verifyChildOwnership(fastify, childId, parentId);

    // Fetch all non-deleted observations for the child, ordered by date
    const observations = await fastify.prisma.observation.findMany({
      where: { childId, deletedAt: null },
      select: { observedAt: true },
      orderBy: { observedAt: 'desc' },
    });

    const totalObservations = observations.length;

    if (totalObservations === 0) {
      return reply.send({
        currentStreak: 0,
        bestStreak: 0,
        totalObservations: 0,
        lastObservationDate: null,
      });
    }

    // Get unique dates (sorted descending)
    const uniqueDatesSet = new Set<string>();
    for (const obs of observations) {
      uniqueDatesSet.add(obs.observedAt.toISOString().split('T')[0]);
    }
    const uniqueDates = Array.from(uniqueDatesSet).sort().reverse();

    const lastObservationDate = uniqueDates[0];

    // Calculate all streaks by walking through sorted unique dates
    const streaks: number[] = [];
    let currentRun = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);

      // Check if consecutive (difference of exactly 1 day)
      const diffMs = prevDate.getTime() - currDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (Math.abs(diffDays - 1) < 0.01) {
        currentRun++;
      } else {
        streaks.push(currentRun);
        currentRun = 1;
      }
    }
    streaks.push(currentRun);

    const bestStreak = Math.max(...streaks);

    // Current streak: the first streak only counts if it includes
    // today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentDate = new Date(uniqueDates[0]);
    const isCurrentlyActive =
      mostRecentDate.getTime() >= yesterday.getTime();

    const currentStreak = isCurrentlyActive ? streaks[0] : 0;

    return reply.send({
      currentStreak,
      bestStreak,
      totalObservations,
      lastObservationDate,
    });
  });
};

export default streakRoutes;
