/**
 * routes/assessments.ts — Assessment session routes
 *
 * POST /                 — Create new assessment session
 * GET  /:id              — Get session with progress
 * POST /:id/responses    — Save a response (upsert)
 * POST /:id/complete     — Complete session, run scoring
 * GET  /:id/results      — Get scored profile
 *
 * All routes require authentication via fastify.authenticate.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AssessmentService } from '../services/assessment.service.js';
import { AppError } from '../utils/errors.js';

// ── Zod schemas ──────────────────────────────────────────────────────────

const createSessionSchema = z.object({
  templateId: z.string().uuid('Invalid template ID'),
});

const saveResponseSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z.string().min(1, 'Answer is required').max(10),
  elapsedSeconds: z.number().int().min(0).optional(),
});

const sessionIdParam = z.object({
  id: z.string().uuid('Invalid session ID'),
});

// ── Route handlers ───────────────────────────────────────────────────────

export async function assessmentRoutes(fastify: FastifyInstance): Promise<void> {
  const service = new AssessmentService(fastify.prisma);

  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // POST / — Create session
  fastify.post(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createSessionSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const user = request.currentUser!;
      const result = await service.createSession(
        user.id,
        user.orgId,
        parsed.data.templateId
      );

      return reply.code(201).send(result);
    }
  );

  // GET /:id — Get session
  fastify.get(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = sessionIdParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid session ID');
      }

      const user = request.currentUser!;
      const result = await service.getSession(params.data.id, user.id);

      return reply.code(200).send(result);
    }
  );

  // POST /:id/responses — Save response
  fastify.post(
    '/:id/responses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = sessionIdParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid session ID');
      }

      const parsed = saveResponseSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const user = request.currentUser!;
      const result = await service.saveResponse(
        params.data.id,
        user.id,
        user.orgId,
        parsed.data.questionId,
        parsed.data.answer,
        parsed.data.elapsedSeconds
      );

      return reply.code(200).send(result);
    }
  );

  // POST /:id/complete — Complete session
  fastify.post(
    '/:id/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = sessionIdParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid session ID');
      }

      const user = request.currentUser!;
      const result = await service.completeSession(
        params.data.id,
        user.id,
        user.orgId
      );

      return reply.code(200).send(result);
    }
  );

  // GET /:id/results — Get results
  fastify.get(
    '/:id/results',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = sessionIdParam.safeParse(request.params);
      if (!params.success) {
        throw new AppError('validation-error', 400, 'Invalid session ID');
      }

      const user = request.currentUser!;
      const result = await service.getResults(params.data.id, user.id);

      return reply.code(200).send(result);
    }
  );
}
