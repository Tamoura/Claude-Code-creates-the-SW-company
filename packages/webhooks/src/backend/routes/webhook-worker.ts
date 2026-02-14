/**
 * Internal Webhook Worker Endpoint
 *
 * Processes the webhook delivery queue. Should be called by a cron job.
 * Protected by INTERNAL_API_KEY — must not be exposed to public internet.
 */

import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { logger } from '@connectsw/shared';
import { WebhookDeliveryService } from '../services/delivery.service.js';

export interface WebhookWorkerOptions {
  /** Prisma client instance */
  prisma?: Record<string, unknown>;
  /** Redis client instance */
  redis?: { get(key: string): Promise<string | null>; set(key: string, value: string, ...args: (string | number)[]): Promise<string>; incr(key: string): Promise<number>; del(key: string): Promise<number>; expire(key: string, seconds: number): Promise<number>; eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<unknown> } | null;
  /** Concurrency limit for queue processing. Default: 20 */
  concurrencyLimit?: number;
}

const webhookWorkerRoutes: FastifyPluginAsync<WebhookWorkerOptions> = async (fastify, opts) => {
  const concurrencyLimit = opts.concurrencyLimit ?? 20;

  fastify.post('/webhook-worker', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      logger.error('INTERNAL_API_KEY not configured');
      return reply.code(500).send({ error: 'Internal API key not configured' });
    }

    // Timing-safe comparison
    const expectedHash = crypto.createHash('sha256').update(`Bearer ${expectedKey}`).digest();
    const suppliedHash = crypto.createHash('sha256').update(authHeader || '').digest();
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) {
      logger.warn('Unauthorized webhook worker access', { ip: request.ip });
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const prisma = opts.prisma || fastify.prisma;
      const redis = opts.redis || fastify.redis;
      const service = new WebhookDeliveryService(prisma, redis);

      const start = Date.now();
      await service.processQueue(concurrencyLimit);
      const duration = Date.now() - start;

      logger.info('Webhook queue processed', { durationMs: duration });
      return reply.send({ success: true, processed_at: new Date().toISOString(), duration_ms: duration });
    } catch (error) {
      logger.error('Error processing webhook queue', error);
      return reply.code(500).send({ error: 'Failed to process webhook queue' });
    }
  });
};

export default webhookWorkerRoutes;
