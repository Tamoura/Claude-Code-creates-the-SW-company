/**
 * routes/learning-paths.ts — Learning path routes
 *
 * POST  /                        — Generate learning path from profile
 * GET   /:id                     — Get learning path with modules
 * PATCH /:id/modules/:moduleId   — Update module completion status
 *
 * All routes require authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { LearningPathService } from '../services/learning-path.service.js';
import { AppError } from '../utils/errors.js';

// ── Zod schemas ──────────────────────────────────────────────────────────

const createPathSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
});

const pathIdParam = z.object({
  id: z.string().uuid('Invalid path ID'),
});

const moduleUpdateParam = z.object({
  id: z.string().uuid('Invalid path ID'),
  moduleId: z.string().uuid('Invalid module ID'),
});

const moduleStatusSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'], {
    errorMap: () => ({ message: 'Status must be NOT_STARTED, IN_PROGRESS, COMPLETED, or SKIPPED' }),
  }),
});

// ── Route handlers ───────────────────────────────────────────────────────

export async function learningPathRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new LearningPathService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST / — Create learning path
  fastify.post(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createPathSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const user = request.currentUser!;
      const result = await service.createPath(
        user.id,
        user.orgId,
        parsed.data.profileId
      );

      return reply.code(201).send(result);
    }
  );

  // GET /:id — Get learning path
  fastify.get(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = pathIdParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid path ID');
      }

      const user = request.currentUser!;
      const result = await service.getPath(params.data.id, user.id);

      return reply.code(200).send(result);
    }
  );

  // PATCH /:id/modules/:moduleId — Update module status
  fastify.patch(
    '/:id/modules/:moduleId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = moduleUpdateParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid path or module ID');
      }

      const parsed = moduleStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const user = request.currentUser!;
      const result = await service.updateModuleStatus(
        params.data.id,
        params.data.moduleId,
        user.id,
        user.orgId,
        parsed.data.status
      );

      return reply.code(200).send(result);
    }
  );
}
