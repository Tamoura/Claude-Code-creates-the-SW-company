import type { FastifyInstance } from 'fastify';
import { AVAILABLE_MODELS } from '../lib/openrouter';

export async function modelsRoutes(app: FastifyInstance) {
  app.get('/api/models', async () => {
    return AVAILABLE_MODELS;
  });
}
