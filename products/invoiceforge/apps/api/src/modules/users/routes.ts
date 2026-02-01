import { FastifyInstance } from 'fastify';
import {
  getProfile,
  updateProfile,
  getSubscription,
  getStripeConnectUrl,
  handleStripeCallback,
} from './handlers';

export async function userRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/users/me', getProfile);
  fastify.put('/api/users/me', updateProfile);
  fastify.get('/api/users/me/subscription', getSubscription);
  fastify.get('/api/users/me/stripe/connect', getStripeConnectUrl);
  fastify.post('/api/users/me/stripe/callback', handleStripeCallback);
}
