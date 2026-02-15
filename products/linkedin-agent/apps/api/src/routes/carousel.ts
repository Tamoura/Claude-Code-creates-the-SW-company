import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateCarouselSlides } from '../services/content-generator';
import { logger } from '../utils/logger';

const generateCarouselBodySchema = z.object({
  slideCount: z.coerce.number().int().min(3).max(15).default(7),
});

const paramsSchema = z.object({
  id: z.string().min(1),
});

const carouselRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/posts/:id/carousel
   * Generate carousel slides for a post draft.
   */
  fastify.post('/:id/carousel', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);
    const body = generateCarouselBodySchema.parse(request.body || {});

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

    // Delete existing carousel slides for this post
    await fastify.prisma.carouselSlide.deleteMany({
      where: { postDraftId: id },
    });

    // Generate new slides
    const { slides, llmResponse } = await generateCarouselSlides(
      post.title,
      post.content,
      body.slideCount
    );

    // Save slides to database
    const createdSlides = await Promise.all(
      slides.map((slide) =>
        fastify.prisma.carouselSlide.create({
          data: {
            postDraftId: id,
            slideNumber: slide.slideNumber,
            headline: slide.headline,
            body: slide.body,
            imagePrompt: slide.imagePrompt,
          },
        })
      )
    );

    // Update post format to carousel
    await fastify.prisma.postDraft.update({
      where: { id },
      data: {
        format: 'carousel',
        formatReason: `Generated ${slides.length}-slide carousel`,
      },
    });

    // Log the generation
    await fastify.prisma.generationLog.create({
      data: {
        postDraftId: id,
        model: llmResponse.model,
        provider: llmResponse.provider,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
        taskType: 'writing',
      },
    });

    logger.info('Carousel slides generated', {
      postDraftId: id,
      slideCount: createdSlides.length,
    });

    return reply.code(201).send({
      data: createdSlides,
      usage: {
        model: llmResponse.model,
        costUsd: llmResponse.costUsd,
        durationMs: llmResponse.durationMs,
      },
    });
  });

  /**
   * GET /api/posts/:id/carousel
   * Get carousel slides for a post draft.
   */
  fastify.get('/:id/carousel', async (request, reply) => {
    const { id } = paramsSchema.parse(request.params);

    const post = await fastify.prisma.postDraft.findUnique({
      where: { id },
      select: { id: true, title: true, format: true },
    });

    if (!post) {
      return reply.code(404).send({
        type: 'https://linkedin-agent.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Post draft ${id} not found`,
      });
    }

    const slides = await fastify.prisma.carouselSlide.findMany({
      where: { postDraftId: id },
      orderBy: { slideNumber: 'asc' },
    });

    return reply.send({
      postDraft: { id: post.id, title: post.title, format: post.format },
      data: slides,
      slideCount: slides.length,
    });
  });
};

export default carouselRoutes;
