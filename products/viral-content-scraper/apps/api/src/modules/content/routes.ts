import { FastifyInstance } from 'fastify';
import { validateQuery, validateBody, contentFilterSchema, saveContentSchema } from '../../utils/validation';
import { NotFoundError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

export async function contentRoutes(fastify: FastifyInstance) {
  // GET /api/v1/content — List viral content with filters
  fastify.get('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const filters = validateQuery(contentFilterSchema, request.query);

    const where: Prisma.ContentWhereInput = {};

    if (filters.platform) where.platform = filters.platform;
    if (filters.category) where.category = filters.category;
    if (filters.mediaType) where.mediaType = filters.mediaType;
    if (filters.minScore) where.viralityScore = { gte: filters.minScore };

    // Time range filter
    const now = new Date();
    const timeRanges: Record<string, number> = {
      '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720,
    };
    if (filters.timeRange !== 'all' && timeRanges[filters.timeRange]) {
      const hours = timeRanges[filters.timeRange];
      where.scrapedAt = { gte: new Date(now.getTime() - hours * 60 * 60 * 1000) };
    }

    // Search
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
        { author: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [content, total] = await Promise.all([
      fastify.prisma.content.findMany({
        where,
        orderBy: { [filters.sortBy]: filters.order },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        select: {
          id: true,
          platform: true,
          url: true,
          title: true,
          body: true,
          author: true,
          authorFollowers: true,
          likes: true,
          shares: true,
          comments: true,
          views: true,
          viralityScore: true,
          engagementRate: true,
          velocityScore: true,
          percentile: true,
          hashtags: true,
          category: true,
          mediaType: true,
          publishedAt: true,
          scrapedAt: true,
        },
      }),
      fastify.prisma.content.count({ where }),
    ]);

    return reply.send({
      content,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  });

  // GET /api/v1/content/top — Get top 1% viral content
  fastify.get('/top', async (request, reply) => {
    const content = await fastify.prisma.content.findMany({
      where: { percentile: { gte: 99 } },
      orderBy: { viralityScore: 'desc' },
      take: 50,
    });

    return reply.send({ content, count: content.length });
  });

  // GET /api/v1/content/:id — Get single content with snapshots
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const content = await fastify.prisma.content.findUnique({
      where: { id },
      include: {
        snapshots: { orderBy: { capturedAt: 'desc' }, take: 48 },
        topics: { include: { topic: true } },
      },
    });

    if (!content) throw new NotFoundError('Content not found');
    return reply.send({ content });
  });

  // POST /api/v1/content/save — Save content to user's collection
  fastify.post('/save', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { contentId, notes } = validateBody(saveContentSchema, request.body);
    const userId = request.user.sub;

    const saved = await fastify.prisma.savedContent.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, notes },
      update: { notes },
    });

    return reply.status(201).send({ saved });
  });

  // GET /api/v1/content/saved — Get user's saved content
  fastify.get('/saved', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user.sub;

    const saved = await fastify.prisma.savedContent.findMany({
      where: { userId },
      include: { content: true },
      orderBy: { savedAt: 'desc' },
    });

    return reply.send({ saved });
  });
}
