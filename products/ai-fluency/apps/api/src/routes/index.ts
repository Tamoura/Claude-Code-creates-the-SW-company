/**
 * routes/index.ts — Route registration
 *
 * Registers all route modules in the correct order.
 * Called from app.ts after all plugins are registered.
 */

import { FastifyInstance } from 'fastify';
import healthRoute from './health.js';
import { authRoutes } from './auth.js';
import { assessmentRoutes } from './assessment.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check (no prefix — lives at root level)
  await fastify.register(healthRoute);

  // Auth routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // Assessment routes
  await fastify.register(assessmentRoutes, { prefix: '/api/v1/assessments' });
}
