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
import { profileRoutes } from './profile.js';
import { dashboardRoutes } from './dashboard.js';
import { learningPathRoutes } from './learning-paths.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check (no prefix — lives at root level)
  await fastify.register(healthRoute);

  // Auth routes
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

  // Assessment lifecycle routes
  await fastify.register(assessmentRoutes, { prefix: '/api/v1/assessments' });

  // Profile routes
  await fastify.register(profileRoutes, { prefix: '/api/v1/profile' });

  // Dashboard routes
  await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });

  // Learning path routes
  await fastify.register(learningPathRoutes, { prefix: '/api/v1/learning-paths' });
}
