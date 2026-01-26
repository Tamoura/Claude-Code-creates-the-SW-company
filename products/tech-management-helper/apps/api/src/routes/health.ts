import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { HealthResponse } from '../types/index.js';

/**
 * Health check routes
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * GET /api/v1/health
   * Returns the health status of the API
   */
  fastify.get<{ Reply: HealthResponse }>('/health', async (_request, reply) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    };

    return reply.status(200).send(response);
  });
}

export default healthRoutes;
