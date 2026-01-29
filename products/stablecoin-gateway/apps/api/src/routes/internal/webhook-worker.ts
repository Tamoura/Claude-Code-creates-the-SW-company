/**
 * Internal Webhook Worker Endpoint
 *
 * This endpoint processes the webhook delivery queue.
 * Should be called by a cron job/scheduler (e.g., every minute)
 *
 * Security:
 * - Protected by INTERNAL_API_KEY environment variable
 * - Should not be exposed to public internet
 * - Use API Gateway or firewall to restrict access
 */

import { FastifyPluginAsync } from 'fastify';
import { WebhookDeliveryService } from '../../services/webhook-delivery.service.js';
import { logger } from '../../utils/logger.js';

const webhookWorkerRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /internal/webhook-worker - Process webhook queue
  fastify.post('/webhook-worker', async (request, reply) => {
    // Verify internal API key
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      logger.error('INTERNAL_API_KEY not configured');
      return reply.code(500).send({
        error: 'Internal API key not configured',
      });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
      // Log unauthorized access without sensitive headers
      // SECURITY: Never log Authorization, API keys, or other credentials
      logger.warn('Unauthorized webhook worker access attempt', {
        ip: request.ip,
        requestId: request.id,
        userAgent: request.headers['user-agent'],
        method: request.method,
        url: request.url,
        // DO NOT log request.headers - contains Authorization
      });
      return reply.code(401).send({
        error: 'Unauthorized',
      });
    }

    try {
      const webhookService = new WebhookDeliveryService(fastify.prisma);

      const startTime = Date.now();
      await webhookService.processQueue(20); // Process up to 20 webhooks concurrently
      const duration = Date.now() - startTime;

      logger.info('Webhook queue processed', {
        durationMs: duration,
      });

      return reply.send({
        success: true,
        processed_at: new Date().toISOString(),
        duration_ms: duration,
      });
    } catch (error) {
      logger.error('Error processing webhook queue', error);
      return reply.code(500).send({
        error: 'Failed to process webhook queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default webhookWorkerRoutes;
