import { FastifyInstance } from 'fastify';
import { Platform } from '@prisma/client';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /api/v1/analytics/overview — Dashboard overview stats
  fastify.get('/overview', async (request, reply) => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalContent, last24hCount, top1PercentCount, platformBreakdown, topCategories] =
      await Promise.all([
        fastify.prisma.content.count(),
        fastify.prisma.content.count({ where: { scrapedAt: { gte: last24h } } }),
        fastify.prisma.content.count({ where: { percentile: { gte: 99 } } }),
        fastify.prisma.content.groupBy({
          by: ['platform'],
          _count: { id: true },
          _avg: { viralityScore: true },
        }),
        fastify.prisma.content.groupBy({
          by: ['category'],
          where: { scrapedAt: { gte: last7d }, category: { not: null } },
          _count: { id: true },
          _avg: { viralityScore: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

    return reply.send({
      totalContent,
      last24hCount,
      top1PercentCount,
      platformBreakdown: platformBreakdown.map((p) => ({
        platform: p.platform,
        count: p._count.id,
        avgViralityScore: Math.round((p._avg.viralityScore ?? 0) * 100) / 100,
      })),
      topCategories: topCategories.map((c) => ({
        category: c.category,
        count: c._count.id,
        avgViralityScore: Math.round((c._avg.viralityScore ?? 0) * 100) / 100,
      })),
    });
  });

  // GET /api/v1/analytics/trends — Trending topics and platforms
  fastify.get('/trends', async (request, reply) => {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find trending hashtags (most frequent in viral content)
    const viralContent = await fastify.prisma.content.findMany({
      where: {
        scrapedAt: { gte: last24h },
        viralityScore: { gte: 30 },
      },
      select: { hashtags: true, platform: true },
    });

    // Count hashtag frequency
    const hashtagCounts: Record<string, number> = {};
    for (const item of viralContent) {
      for (const tag of item.hashtags) {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      }
    }

    const trendingHashtags = Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Platform velocity (which platform has fastest-growing content right now)
    const platformVelocity = await fastify.prisma.content.groupBy({
      by: ['platform'],
      where: { scrapedAt: { gte: last24h } },
      _avg: { velocityScore: true },
      _max: { viralityScore: true },
      _count: { id: true },
    });

    return reply.send({
      trendingHashtags,
      platformVelocity: platformVelocity.map((p) => ({
        platform: p.platform,
        avgVelocity: Math.round((p._avg.velocityScore ?? 0) * 100) / 100,
        maxVirality: Math.round((p._max.viralityScore ?? 0) * 100) / 100,
        contentCount: p._count.id,
      })),
    });
  });

  // GET /api/v1/analytics/velocity — Content velocity over time
  fastify.get('/velocity', async (request, reply) => {
    const snapshots = await fastify.prisma.contentSnapshot.groupBy({
      by: ['capturedAt'],
      _avg: { likes: true, shares: true, comments: true },
      _count: { id: true },
      orderBy: { capturedAt: 'desc' },
      take: 48, // Last 48 data points
    });

    return reply.send({
      dataPoints: snapshots.map((s) => ({
        time: s.capturedAt,
        avgLikes: Math.round(s._avg.likes ?? 0),
        avgShares: Math.round(s._avg.shares ?? 0),
        avgComments: Math.round(s._avg.comments ?? 0),
        count: s._count.id,
      })),
    });
  });
}
