import { FastifyPluginAsync } from 'fastify';
import { providers, getProviderBySlug } from '../../data/providers.js';
import { AppError } from '../../types/index.js';

const providerRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/providers - List all providers
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      data: providers.map(p => ({
        slug: p.slug,
        name: p.name,
        base_url: p.baseUrl,
        api_format: p.apiFormat,
        free_tier: p.freeTier,
        models: p.models,
        health_status: p.healthStatus,
        key_acquisition_url: p.keyAcquisitionUrl,
      })),
      total: providers.length,
    });
  });

  // GET /api/v1/providers/:slug - Single provider details
  fastify.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const provider = getProviderBySlug(slug);

    if (!provider) {
      throw new AppError(404, 'provider-not-found', `Provider '${slug}' not found`);
    }

    return reply.send({
      slug: provider.slug,
      name: provider.name,
      base_url: provider.baseUrl,
      api_format: provider.apiFormat,
      free_tier: provider.freeTier,
      models: provider.models,
      health_status: provider.healthStatus,
      key_acquisition_url: provider.keyAcquisitionUrl,
      key_acquisition_guide: provider.keyAcquisitionGuide,
    });
  });

  // GET /api/v1/providers/:slug/guide - Key acquisition guide
  fastify.get('/:slug/guide', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const provider = getProviderBySlug(slug);

    if (!provider) {
      throw new AppError(404, 'provider-not-found', `Provider '${slug}' not found`);
    }

    return reply.send({
      provider: provider.name,
      slug: provider.slug,
      signup_url: provider.keyAcquisitionUrl,
      guide: provider.keyAcquisitionGuide,
      models_available: provider.models.map(m => m.name),
      free_tier_summary: provider.freeTier,
    });
  });
};

export default providerRoutes;
