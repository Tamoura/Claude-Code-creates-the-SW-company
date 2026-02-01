import { FastifyInstance } from 'fastify';
import { healthCheck } from './handlers';

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/health', healthCheck);
}
