import { FastifyInstance } from 'fastify';
import { getProfile, updateProfile, getSubscription } from './handlers';

export async function userRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/api/users/me', getProfile);
  fastify.put('/api/users/me', updateProfile);
  fastify.get('/api/users/me/subscription', getSubscription);
}
