import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { analyzeTrends } from '../services/content-generator';
import { logger } from '../utils/logger';

const analyzeBodySchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  url: z.string().url().optional(),
  title: z.string().optional(),
  platform: z.enum(['linkedin', 'twitter', 'hackernews', 'other']).default('other'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  platform: z.enum(['linkedin', 'twitter', 'hackernews', 'other']).optional(),
});

const trendsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/trends/analyze
   * Analyze pasted content for trending topics.
   */
  fastify.post('/analyze', async (request, reply) => {
    const body = analyzeBodySchema.parse(request.body);

    const { analysis, llmResponse } = await analyzeTrends(body.content);

    // Save the trend source to the database
    const trendSource = await fastify.prisma.trendSource.create({
      data: {
        url: body.url || null,
        title: body.title || analysis.overallTheme || 'Untitled',
        content: body.content,
        platform: body.platform,
        tags: analysis.recommendedTags,
      },
    });

    // Log the generation
    await fastify.prisma.generationLog.create({
      data: {
        model: llmResponse.model,
        provider: llmResponse.provider,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
        taskType: 'analysis',
      },
    });

    logger.info('Trend analysis completed', {
      trendSourceId: trendSource.id,
      topicCount: analysis.topics.length,
    });

    return reply.code(201).send({
      trendSource,
      analysis,
      usage: {
        model: llmResponse.model,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
      },
    });
  });

  /**
   * GET /api/trends
   * List analyzed trends with pagination.
   */
  fastify.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit, platform } = query;
    const skip = (page - 1) * limit;

    const where = platform ? { platform } : {};

    const [trends, total] = await Promise.all([
      fastify.prisma.trendSource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { postDrafts: true },
          },
        },
      }),
      fastify.prisma.trendSource.count({ where }),
    ]);

    return reply.send({
      data: trends,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
};

export default trendsRoutes;
