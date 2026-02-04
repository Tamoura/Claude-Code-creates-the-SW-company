import { FastifyPluginAsync } from 'fastify';
import { UsageService } from '../../services/usage.service.js';
import { AppError } from '../../types/index.js';
import { getProviderBySlug } from '../../data/providers.js';

const usageRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/usage - Usage stats for all providers
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.currentUser!;
    const usageService = new UsageService(fastify.prisma);

    const stats = await usageService.getUsageStats(user.id);

    return reply.send({
      data: stats,
    });
  });

  // GET /api/v1/usage/:provider - Per-provider usage
  fastify.get('/:provider', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const user = request.currentUser!;

    const providerInfo = getProviderBySlug(provider);
    if (!providerInfo) {
      throw new AppError(404, 'provider-not-found', `Provider '${provider}' not found`);
    }

    const usageService = new UsageService(fastify.prisma);
    const stats = await usageService.getUsageStats(user.id, provider);
    const capacity = await usageService.getRemainingCapacity(user.id, provider);

    return reply.send({
      provider: provider,
      provider_name: providerInfo.name,
      free_tier: providerInfo.freeTier,
      remaining_capacity: Math.round(capacity * 100) + '%',
      records: stats,
    });
  });
};

export default usageRoutes;
