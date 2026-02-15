import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  generatePost,
  recommendFormat,
  translatePost,
} from '../services/content-generator';
import { logger } from '../utils/logger';

const generateBodySchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters'),
  language: z.enum(['ar', 'en', 'both']).default('both'),
  tone: z.string().default('professional'),
  audience: z.string().default('tech professionals'),
  trendSourceId: z.string().optional(),
});

const updateBodySchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  contentAr: z.string().nullable().optional(),
  contentEn: z.string().nullable().optional(),
  format: z.enum(['text', 'carousel', 'infographic', 'link', 'poll', 'video']).optional(),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['draft', 'review', 'approved', 'published', 'archived']).optional(),
  format: z.enum(['text', 'carousel', 'infographic', 'link', 'poll', 'video']).optional(),
});

const translateBodySchema = z.object({
  from: z.enum(['ar', 'en']),
  to: z.enum(['ar', 'en']),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const postsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/posts/generate
   * Generate a new LinkedIn post draft using AI.
   */
  fastify.post('/generate', async (request, reply) => {
    const body = generateBodySchema.parse(request.body);

    // Verify trend source exists if provided
    if (body.trendSourceId) {
      const trendSource = await fastify.prisma.trendSource.findUnique({
        where: { id: body.trendSourceId },
      });
      if (!trendSource) {
        return reply.code(404).send({
          type: 'https://linkedin-agent.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Trend source ${body.trendSourceId} not found`,
        });
      }
    }

    // Generate the post
    const result = await generatePost({
      topic: body.topic,
      language: body.language,
      tone: body.tone,
      audience: body.audience,
    });

    // Get format recommendation
    const formatRec = await recommendFormat(
      result.title,
      result.content
    );

    // Save to database (atomic: post + generation logs)
    const postDraft = await fastify.prisma.$transaction(async (tx) => {
      const post = await tx.postDraft.create({
        data: {
          title: result.title,
          content: result.content,
          contentAr: result.contentAr,
          contentEn: result.contentEn,
          format: formatRec.recommendedFormat,
          formatReason: formatRec.reason,
          tags: result.tags,
          tone: result.tone,
          targetAudience: result.targetAudience,
          trendSourceId: body.trendSourceId || null,
          supportingMaterial: formatRec.alternativeFormats,
        },
      });

      // Log both generation calls
      await tx.generationLog.createMany({
        data: [
          {
            postDraftId: post.id,
            model: result.llmResponse.model,
            provider: result.llmResponse.provider,
            promptTokens: result.llmResponse.promptTokens,
            completionTokens: result.llmResponse.completionTokens,
            costUsd: result.llmResponse.costUsd,
            durationMs: result.llmResponse.durationMs,
            taskType: 'writing',
          },
          {
            postDraftId: post.id,
            model: formatRec.llmResponse.model,
            provider: formatRec.llmResponse.provider,
            promptTokens: formatRec.llmResponse.promptTokens,
            completionTokens: formatRec.llmResponse.completionTokens,
            costUsd: formatRec.llmResponse.costUsd,
            durationMs: formatRec.llmResponse.durationMs,
            taskType: 'analysis',
          },
        ],
      });

      return post;
    });

    logger.info('Post draft generated', { postDraftId: postDraft.id });

    return reply.code(201).send({
      postDraft,
      formatRecommendation: {
        format: formatRec.recommendedFormat,
        reason: formatRec.reason,
        alternatives: formatRec.alternativeFormats,
      },
      usage: {
        totalCostUsd: result.llmResponse.costUsd + formatRec.llmResponse.costUsd,
        totalDurationMs: result.llmResponse.durationMs + formatRec.llmResponse.durationMs,
      },
    });
  });

  /**
   * GET /api/posts
   * List all post drafts with pagination and filtering.
   */
  fastify.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const { page, limit, status, format } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (format) where.format = format;

    const [posts, total] = await Promise.all([
      fastify.prisma.postDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          trendSource: {
            select: { id: true, title: true, platform: true },
          },
          _count: {
            select: {
              carouselSlides: true,
              generationLogs: true,
            },
          },
        },
      }),
      fastify.prisma.postDraft.count({ where }),
    ]);

    return reply.send({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * GET /api/posts/:id
   * Get a single post draft by ID.
   */
  fastify.get('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const post = await fastify.prisma.postDraft.findUnique({
      where: { id },
      include: {
        trendSource: true,
        carouselSlides: {
          orderBy: { slideNumber: 'asc' },
        },
        generationLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!post) {
      return reply.code(404).send({
        type: 'https://linkedin-agent.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Post draft ${id} not found`,
      });
    }

    return reply.send({ data: post });
  });

  /**
   * PATCH /api/posts/:id
   * Update a post draft.
   */
  fastify.patch('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = updateBodySchema.parse(request.body);

    // Verify post exists
    const existing = await fastify.prisma.postDraft.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.code(404).send({
        type: 'https://linkedin-agent.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Post draft ${id} not found`,
      });
    }

    // Set publishedAt when status changes to published
    const updateData: Record<string, unknown> = { ...body };
    if (body.status === 'published' && existing.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const updated = await fastify.prisma.postDraft.update({
      where: { id },
      data: updateData,
      include: {
        trendSource: {
          select: { id: true, title: true, platform: true },
        },
      },
    });

    return reply.send({ data: updated });
  });

  /**
   * DELETE /api/posts/:id
   * Delete a post draft.
   */
  fastify.delete('/:id', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const existing = await fastify.prisma.postDraft.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.code(404).send({
        type: 'https://linkedin-agent.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Post draft ${id} not found`,
      });
    }

    await fastify.prisma.postDraft.delete({
      where: { id },
    });

    return reply.code(204).send();
  });

  /**
   * POST /api/posts/:id/translate
   * Translate a post between Arabic and English.
   */
  fastify.post('/:id/translate', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = translateBodySchema.parse(request.body);

    if (body.from === body.to) {
      return reply.code(400).send({
        type: 'https://linkedin-agent.app/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Source and target languages must be different',
      });
    }

    const post = await fastify.prisma.postDraft.findUnique({
      where: { id },
    });

    if (!post) {
      return reply.code(404).send({
        type: 'https://linkedin-agent.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Post draft ${id} not found`,
      });
    }

    // Determine source content
    const sourceContent = body.from === 'ar'
      ? (post.contentAr || post.content)
      : (post.contentEn || post.content);

    const { translatedContent, llmResponse } = await translatePost(
      sourceContent,
      body.from,
      body.to
    );

    // Update the post with the translation
    const updateField = body.to === 'ar' ? 'contentAr' : 'contentEn';
    const updated = await fastify.prisma.postDraft.update({
      where: { id },
      data: { [updateField]: translatedContent },
    });

    // Log the translation
    await fastify.prisma.generationLog.create({
      data: {
        postDraftId: id,
        model: llmResponse.model,
        provider: llmResponse.provider,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
        taskType: 'translation',
      },
    });

    logger.info('Post translated', {
      postDraftId: id,
      from: body.from,
      to: body.to,
    });

    return reply.send({
      data: updated,
      translation: {
        from: body.from,
        to: body.to,
        content: translatedContent,
      },
      usage: {
        model: llmResponse.model,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
      },
    });
  });
};

export default postsRoutes;
