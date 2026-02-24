import { FastifyPluginAsync } from 'fastify';
import { AIService } from './ai.service';
import { sendSuccess } from '../../lib/response';

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const service = new AIService(fastify.prisma, apiKey);

  // GET /api/v1/ai/status — check AI availability (no auth required)
  fastify.get('/status', async (_request, reply) => {
    const data = await service.getAIStatus();
    return sendSuccess(reply, data);
  });

  // All other AI routes require authentication
  fastify.register(async (authRoutes) => {
    authRoutes.addHook('preHandler', fastify.authenticate);

    // POST /api/v1/ai/profile-optimizer — optimize current user's profile
    authRoutes.post('/profile-optimizer', {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    }, async (request, reply) => {
      const data = await service.optimizeProfile(request.user.sub);
      return sendSuccess(reply, data);
    });
  });
};

export default aiRoutes;
