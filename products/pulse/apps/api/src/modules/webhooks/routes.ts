import { FastifyPluginAsync } from 'fastify';
import { WebhookService } from './service.js';
import { WebhookHandlers } from './handlers.js';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new WebhookService(fastify.prisma);
  const handlers = new WebhookHandlers(service);

  /**
   * POST /api/v1/webhooks/github
   * Receive GitHub webhook events.
   * No JWT auth - uses HMAC signature verification.
   */
  fastify.post('/github', async (request, reply) => {
    return handlers.handleGitHub(request, reply);
  });
};

export default webhookRoutes;
