/**
 * routes/auth.ts — Authentication endpoints
 *
 * POST /register — create user with email/password, return JWT
 * POST /login    — validate credentials, return JWT
 * GET  /me       — return current user from JWT
 *
 * All responses use RFC 7807 Problem Details format on error.
 * Passwords hashed with Argon2id (matching existing test helpers).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { hash as argon2Hash, verify as argon2Verify } from 'argon2';
import { AppError } from '../utils/errors.js';

// ── Validation Schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a digit'
    ),
  orgSlug: z.string().min(1, 'Organization slug is required').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  orgSlug: z.string().min(1, 'Organization slug is required'),
});

// ── Argon2id options ──────────────────────────────────────────────────────────

const ARGON2_OPTIONS = {
  type: 2 as const, // argon2id
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeUser(user: {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    orgId: user.orgId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

// ── Route Registration ────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /register ──────────────────────────────────────────────────────
  fastify.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError('validation-error', 400, parsed.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`
        ).join('; '));
      }

      const { email, firstName, lastName, password, orgSlug } = parsed.data;

      // Find organization by slug
      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
      });

      if (!org) {
        throw new AppError('org-not-found', 404, 'Organization not found');
      }

      // Check for duplicate email within org
      const existing = await fastify.prisma.user.findFirst({
        where: { orgId: org.id, email },
      });

      if (existing) {
        throw new AppError(
          'email-already-exists',
          409,
          'A user with this email already exists in this organization'
        );
      }

      // Hash password with Argon2id
      const passwordHash = await argon2Hash(password, ARGON2_OPTIONS);

      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          orgId: org.id,
          email,
          firstName,
          lastName,
          passwordHash,
          role: 'LEARNER',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(), // Auto-verify for MVP
        },
      });

      // Sign JWT
      const token = fastify.jwt.sign(
        {
          sub: user.id,
          orgId: org.id,
          role: user.role,
        },
        { expiresIn: '24h' }
      );

      return reply.code(201).send({
        token,
        user: sanitizeUser(user),
      });
    }
  );

  // ── POST /login ─────────────────────────────────────────────────────────
  fastify.post(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError('validation-error', 400, parsed.error.issues.map(
          (i) => `${i.path.join('.')}: ${i.message}`
        ).join('; '));
      }

      const { email, password, orgSlug } = parsed.data;

      // Find organization
      const org = await fastify.prisma.organization.findUnique({
        where: { slug: orgSlug },
      });

      if (!org) {
        // Return generic 401 to prevent user enumeration
        throw new AppError('invalid-credentials', 401, 'Invalid email or password');
      }

      // Find user
      const user = await fastify.prisma.user.findFirst({
        where: {
          orgId: org.id,
          email,
          deletedAt: null,
        },
      });

      if (!user || !user.passwordHash) {
        throw new AppError('invalid-credentials', 401, 'Invalid email or password');
      }

      // Verify password
      const isValid = await argon2Verify(user.passwordHash, password);
      if (!isValid) {
        throw new AppError('invalid-credentials', 401, 'Invalid email or password');
      }

      // Check account status
      if (user.status === 'LOCKED') {
        throw new AppError('account-locked', 403, 'Account is locked');
      }

      if (user.status === 'DEACTIVATED') {
        throw new AppError('account-deactivated', 403, 'Account has been deactivated');
      }

      // Update lastLoginAt
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), loginFailureCount: 0 },
      });

      // Sign JWT
      const token = fastify.jwt.sign(
        {
          sub: user.id,
          orgId: org.id,
          role: user.role,
        },
        { expiresIn: '24h' }
      );

      return reply.code(200).send({
        token,
        user: sanitizeUser(user),
      });
    }
  );

  // ── GET /me ─────────────────────────────────────────────────────────────
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const currentUser = request.currentUser!;

      const user = await fastify.prisma.user.findFirst({
        where: {
          id: currentUser.id,
          orgId: currentUser.orgId,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new AppError('user-not-found', 404, 'User not found');
      }

      return reply.code(200).send({
        user: sanitizeUser(user),
      });
    }
  );
}
