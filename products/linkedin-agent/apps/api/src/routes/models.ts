import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { fetchAvailableModels, selectModel } from '../services/openrouter';

const usageQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(30),
});

const modelsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/models
   * List available models and current defaults.
   */
  fastify.get('/', async (_request, reply) => {
    let availableModels: Array<{ id: string; name: string }> = [];

    try {
      const models = await fetchAvailableModels();
      availableModels = models.map((m) => ({
        id: m.id,
        name: m.name,
      }));
    } catch (error) {
      // If we cannot fetch models, return just the defaults
      availableModels = [];
    }

    const defaults = {
      writing: selectModel('writing'),
      analysis: selectModel('analysis'),
      image: selectModel('image'),
      translation: selectModel('translation'),
    };

    return reply.send({
      defaults,
      available: availableModels.length > 0
        ? availableModels
        : undefined,
      availableCount: availableModels.length,
    });
  });

  /**
   * GET /api/models/usage
   * Get model usage statistics.
   */
  fastify.get('/usage', async (request, reply) => {
    const query = usageQuerySchema.parse(request.query);
    const since = new Date();
    since.setDate(since.getDate() - query.days);

    const [byModel, byTask, totals] = await Promise.all([
      // Usage by model
      fastify.prisma.generationLog.groupBy({
        by: ['model'],
        where: { createdAt: { gte: since } },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          costUsd: true,
          durationMs: true,
        },
        _count: true,
      }),
      // Usage by task type
      fastify.prisma.generationLog.groupBy({
        by: ['taskType'],
        where: { createdAt: { gte: since } },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          costUsd: true,
          durationMs: true,
        },
        _count: true,
      }),
      // Overall totals
      fastify.prisma.generationLog.aggregate({
        where: { createdAt: { gte: since } },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          costUsd: true,
          durationMs: true,
        },
        _count: true,
      }),
    ]);

    return reply.send({
      period: {
        days: query.days,
        since: since.toISOString(),
      },
      totals: {
        calls: totals._count,
        promptTokens: totals._sum.promptTokens || 0,
        completionTokens: totals._sum.completionTokens || 0,
        totalCostUsd: totals._sum.costUsd || 0,
        totalDurationMs: totals._sum.durationMs || 0,
      },
      byModel: byModel.map((m) => ({
        model: m.model,
        calls: m._count,
        promptTokens: m._sum.promptTokens || 0,
        completionTokens: m._sum.completionTokens || 0,
        costUsd: m._sum.costUsd || 0,
        avgDurationMs: m._sum.durationMs
          ? Math.round((m._sum.durationMs || 0) / m._count)
          : 0,
      })),
      byTaskType: byTask.map((t) => ({
        taskType: t.taskType,
        calls: t._count,
        promptTokens: t._sum.promptTokens || 0,
        completionTokens: t._sum.completionTokens || 0,
        costUsd: t._sum.costUsd || 0,
        avgDurationMs: t._sum.durationMs
          ? Math.round((t._sum.durationMs || 0) / t._count)
          : 0,
      })),
    });
  });
};

export default modelsRoutes;
