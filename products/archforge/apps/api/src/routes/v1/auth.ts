/**
 * Auth Routes - /api/v1/auth
 *
 * Provides user registration, login, token refresh, logout,
 * and current user profile endpoints.
 *
 * - Register: creates user, returns message + userId (per API contract)
 * - Login: authenticates, returns accessToken + expiresAt + user summary
 * - Refresh, logout, me: return 501 stubs for now
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { createHash, randomUUID } from 'crypto';

// ==================== Zod Schemas ====================

const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/,
      'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
    ),
  fullName: z.string().min(1, 'Full name is required').max(255),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== Routes ====================

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);

      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        throw new AppError(409, 'conflict', 'An account with this email already exists.');
      }

      const passwordHash = await hashPassword(body.password);

      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          fullName: body.fullName,
        },
      });

      logger.info('User registered', { userId: user.id, email: user.email });

      return reply.code(201).send({
        message: 'Account created. Please check your email to verify.',
        userId: user.id,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://archforge.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.errors.map(e => e.message).join('; '),
          request_id: request.id,
        });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !user.passwordHash) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      const jti = randomUUID();
      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti },
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '24h' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
      );

      // Store session
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash,
          jti,
          ipAddress: request.ip || null,
          userAgent: (request.headers['user-agent'] as string) || null,
          expiresAt: new Date(Date.now() + expiresIn),
        },
      });

      // Update last login
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info('User logged in', { userId: user.id, email: user.email });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      return reply.send({
        accessToken,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://archforge.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.errors.map(e => e.message).join('; '),
          request_id: request.id,
        });
      }
      throw error;
    }
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://archforge.io/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Token refresh is not yet implemented',
    });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://archforge.io/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Logout is not yet implemented',
    });
  });

  // GET /api/v1/auth/me
  fastify.get('/me', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://archforge.io/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Get current user is not yet implemented',
    });
  });
};

export default authRoutes;
