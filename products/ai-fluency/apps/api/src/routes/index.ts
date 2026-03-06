/**
 * routes/index.ts — Route registration
 *
 * Registers all route modules in the correct order.
 * Called from app.ts after error handler is set.
 */

import { FastifyInstance } from 'fastify';
import healthRoute from './health.js';
import { authRoutes } from './auth.js';
import { assessmentRoutes } from './assessments.js';
import { profileRoutes } from './profiles.js';
import { learningPathRoutes } from './learning-paths.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check (no prefix — lives at root level)
  await fastify.register(healthRoute);

  // Auth routes (public — no auth required)
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // Assessment session routes (authenticated)
  await fastify.register(assessmentRoutes, { prefix: '/api/v1/assessment-sessions' });

  // Profile routes (authenticated)
  await fastify.register(profileRoutes, { prefix: '/api/v1/profiles' });

  // Learning path routes (authenticated)
  await fastify.register(learningPathRoutes, { prefix: '/api/v1/learning-paths' });
}
