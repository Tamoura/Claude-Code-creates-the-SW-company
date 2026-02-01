import { FastifyInstance } from 'fastify';
import { handleStripeWebhook } from './handlers';

export async function webhookRoutes(
  fastify: FastifyInstance
): Promise<void> {
  // No auth hook -- webhooks are verified by Stripe signature
  fastify.post('/api/webhooks/stripe', handleStripeWebhook);
}
