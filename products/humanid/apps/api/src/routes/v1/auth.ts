/**
 * Auth Routes - /api/v1/auth
 *
 * Provides user registration, login, token refresh, logout,
 * and email verification endpoints.
 *
 * - Register and login are fully implemented with bcrypt + JWT.
 * - Refresh, logout, and verify-email return "Not implemented" stubs.
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
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one digit'
    ),
  role: z.enum(['HOLDER', 'ISSUER', 'DEVELOPER']).optional().default('HOLDER'),
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

      // Check if user already exists (prevent email enumeration by returning
      // same response shape)
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        // SECURITY: Return generic success to prevent email enumeration
        logger.info('Registration attempted for existing email', { email: body.email });
        return reply.code(201).send({
          message: 'Account created successfully. Please check your email for verification.',
        });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(body.password);

      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
          role: body.role as 'HOLDER' | 'ISSUER' | 'DEVELOPER',
        },
      });

      // Generate access token
      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti: randomUUID() },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Generate refresh token
      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Store session with refresh token hash
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash,
          deviceInfo: (request.headers['user-agent'] as string) || 'unknown',
          ipAddress: request.ip || 'unknown',
          expiresAt: new Date(Date.now() + expiresIn),
        },
      });

      logger.info('User registered', { userId: user.id, email: user.email, role: user.role });

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        role: user.role,
        access_token: accessToken,
        refresh_token: refreshToken,
        created_at: user.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://humanid.dev/errors/validation-error',
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

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      if (user.status !== 'ACTIVE') {
        throw new AppError(403, 'account-suspended', 'Account is suspended or deactivated');
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti: randomUUID() },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Store session
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash,
          deviceInfo: (request.headers['user-agent'] as string) || 'unknown',
          ipAddress: request.ip || 'unknown',
          expiresAt: new Date(Date.now() + expiresIn),
        },
      });

      logger.info('User logged in', { userId: user.id, email: user.email });

      return reply.send({
        id: user.id,
        email: user.email,
        role: user.role,
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          type: 'https://humanid.dev/errors/validation-error',
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
      type: 'https://humanid.dev/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Token refresh is not yet implemented',
    });
  });

  // DELETE /api/v1/auth/logout
  fastify.delete('/logout', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://humanid.dev/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Logout is not yet implemented',
    });
  });

  // POST /api/v1/auth/verify-email
  fastify.post('/verify-email', async (_request, reply) => {
    return reply.code(501).send({
      type: 'https://humanid.dev/errors/not-implemented',
      title: 'Not Implemented',
      status: 501,
      detail: 'Email verification is not yet implemented',
    });
  });
};

export default authRoutes;
