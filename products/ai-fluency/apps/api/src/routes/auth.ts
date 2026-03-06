/**
 * routes/auth.ts — Authentication routes
 *
 * POST /register — Create user, return JWT tokens
 * POST /login    — Validate credentials, return JWT tokens
 * POST /refresh  — Refresh access token
 * POST /logout   — Invalidate refresh token (requires auth)
 *
 * All responses use RFC 7807 Problem Details format for errors.
 * Passwords hashed with Argon2id, refresh tokens stored as SHA-256.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../utils/errors.js';

// ── Zod schemas ──────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  orgId: z.string().uuid('Invalid organization ID'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  orgId: z.string().uuid('Invalid organization ID'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ── Route handlers ───────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService(
    fastify.prisma,
    fastify
  );

  // POST /register
  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const result = await authService.register(parsed.data);
      return reply.code(201).send(result);
    }
  );

  // POST /login
  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const result = await authService.login(parsed.data);
      return reply.code(200).send(result);
    }
  );

  // POST /refresh
  fastify.post(
    '/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = refreshSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      const result = await authService.refresh(parsed.data.refreshToken);
      return reply.code(200).send(result);
    }
  );

  // POST /logout (requires authentication)
  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = logoutSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(
          'validation-error',
          400,
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        );
      }

      await authService.logout(parsed.data.refreshToken);
      return reply.code(200).send({ message: 'Logged out successfully' });
    }
  );
}
