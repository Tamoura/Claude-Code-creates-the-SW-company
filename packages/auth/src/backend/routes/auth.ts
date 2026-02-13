import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { hashPassword, verifyPassword, logger } from '@connectsw/shared';
import { AppError } from '../types.js';
import {
  signupSchema,
  loginSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshSchema,
  validateBody,
} from '../validation.js';
import { createHash, randomBytes, randomUUID } from 'crypto';

// Account lockout constants
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes
const LOCKOUT_DURATION_MS = 900_000;

// Access token TTL in seconds
const ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutes

export interface AuthRoutesOptions {
  /** Rate limit max requests per window. Default: 5 */
  rateLimitMax?: number;
  /** Rate limit window in ms. Default: 15 minutes */
  rateLimitWindow?: number;
  /** JWT access token expiry. Default: '15m' */
  accessTokenExpiry?: string;
  /** Refresh token expiry. Default: '7d' */
  refreshTokenExpiry?: string;
  /** Admin role name. Default: 'ADMIN' */
  adminRole?: string;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, opts) => {
  const {
    rateLimitMax = 5,
    rateLimitWindow = 15 * 60 * 1000,
    accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  } = opts;

  const authRateLimit = {
    config: {
      rateLimit: {
        max: rateLimitMax,
        timeWindow: rateLimitWindow,
        keyGenerator: (request: FastifyRequest) => {
          const ua = request.headers['user-agent'] || 'unknown';
          const truncatedUA = ua.substring(0, 50);
          return `auth:${request.ip}:${truncatedUA}`;
        },
      },
    },
  };

  // POST /signup
  fastify.post('/signup', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(signupSchema, request.body);
      const passwordHash = await hashPassword(body.password);

      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        // Prevent email enumeration
        logger.info('Signup attempted for existing email', { email: body.email });
        return reply.code(201).send({
          message: 'Account created successfully. Please check your email for verification.',
        });
      }

      const user = await fastify.prisma.user.create({
        data: { email: body.email, passwordHash },
      });

      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti: randomUUID() },
        { expiresIn: accessTokenExpiry }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: refreshTokenExpiry }
      );

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000;
      await fastify.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + expiresIn),
        },
      });

      logger.info('User signed up', { userId: user.id, email: user.email });

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.createdAt.toISOString(),
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) {
        return reply.code(400).send({ status: 400, detail: error.message });
      }
      throw error;
    }
  });

  // POST /login
  fastify.post('/login', authRateLimit, async (request, reply) => {
    const body = validateBody(loginSchema, request.body);
    try {
      const redis = fastify.redis;
      const lockKey = `lockout:${body.email}`;
      const failKey = `failed:${body.email}`;

      if (redis) {
        const lockUntil = await redis.get(lockKey);
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
          throw new AppError(429, 'account-locked', 'Account temporarily locked. Try again in 15 minutes.');
        }
      }

      const user = await fastify.prisma.user.findUnique({ where: { email: body.email } });
      if (!user) throw new AppError(401, 'invalid-credentials', 'Invalid email or password');

      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        if (redis) {
          const attempts = await redis.incr(failKey);
          await redis.expire(failKey, LOCKOUT_WINDOW_SECONDS);
          if (attempts >= LOCKOUT_MAX_ATTEMPTS) {
            await redis.set(lockKey, String(Date.now() + LOCKOUT_DURATION_MS), 'PX', LOCKOUT_DURATION_MS);
            logger.warn('Account locked due to failed login attempts', { email: body.email, attempts });
            throw new AppError(429, 'account-locked', 'Account temporarily locked. Try again in 15 minutes.');
          }
        }
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      if (redis) {
        await redis.del(failKey);
        await redis.del(lockKey);
      }

      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti: randomUUID() },
        { expiresIn: accessTokenExpiry }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: refreshTokenExpiry }
      );

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000;
      await fastify.prisma.refreshToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + expiresIn) },
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
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // POST /refresh
  fastify.post('/refresh', authRateLimit, async (request, reply) => {
    try {
      const { refresh_token } = validateBody(refreshSchema, request.body);
      const decoded = fastify.jwt.verify(refresh_token) as { userId: string; type: string };

      if (decoded.type !== 'refresh') throw new AppError(401, 'invalid-token', 'Invalid refresh token');

      const tokenHash = createHash('sha256').update(refresh_token).digest('hex');
      const storedToken = await fastify.prisma.refreshToken.findUnique({ where: { tokenHash } });

      if (!storedToken) throw new AppError(401, 'invalid-token', 'Refresh token not found');
      if (storedToken.revoked) throw new AppError(401, 'invalid-token', 'Refresh token has been revoked');
      if (storedToken.expiresAt < new Date()) throw new AppError(401, 'invalid-token', 'Refresh token has expired');

      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true },
      });
      if (!user) throw new AppError(401, 'invalid-token', 'User not found');

      const accessToken = fastify.jwt.sign(
        { userId: decoded.userId, role: user.role, jti: randomUUID() },
        { expiresIn: accessTokenExpiry }
      );

      const newRefreshToken = fastify.jwt.sign(
        { userId: decoded.userId, type: 'refresh', jti: randomUUID() },
        { expiresIn: refreshTokenExpiry }
      );

      const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000;

      await fastify.prisma.$transaction([
        fastify.prisma.refreshToken.update({
          where: { tokenHash },
          data: { revoked: true, revokedAt: new Date() },
        }),
        fastify.prisma.refreshToken.create({
          data: { userId: decoded.userId, tokenHash: newTokenHash, expiresAt: new Date(Date.now() + expiresIn) },
        }),
      ]);

      return reply.send({ access_token: accessToken, refresh_token: newRefreshToken });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw new AppError(401, 'invalid-token', 'Invalid or expired refresh token');
    }
  });

  // DELETE /logout
  fastify.delete('/logout', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;
      const { refresh_token } = validateBody(logoutSchema, request.body);

      const tokenHash = createHash('sha256').update(refresh_token).digest('hex');
      const result = await fastify.prisma.refreshToken.updateMany({
        where: { tokenHash, userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });

      if (result.count === 0) throw new AppError(404, 'token-not-found', 'Refresh token not found or already revoked');

      // Blacklist access token JTI in Redis
      const jti = (request.user as { jti?: string }).jti;
      if (jti && fastify.redis) {
        try {
          await fastify.redis.setex(`revoked_jti:${jti}`, ACCESS_TOKEN_TTL_SECONDS, '1');
        } catch (redisError) {
          logger.warn('Failed to blacklist access token JTI in Redis', {
            jti, userId,
            error: redisError instanceof Error ? redisError.message : 'unknown',
          });
        }
      }

      logger.info('User logged out', { userId });
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // POST /change-password
  fastify.post('/change-password', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;
      const body = validateBody(changePasswordSchema, request.body);

      const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError(401, 'invalid-credentials', 'User not found');

      const isValid = await verifyPassword(body.current_password, user.passwordHash);
      if (!isValid) throw new AppError(401, 'invalid-credentials', 'Current password is incorrect');

      const isSame = await verifyPassword(body.new_password, user.passwordHash);
      if (isSame) throw new AppError(400, 'same-password', 'New password must be different from current password');

      const passwordHash = await hashPassword(body.new_password);
      await fastify.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

      logger.info('Password changed', { userId });
      return reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // GET /sessions
  fastify.get('/sessions', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;

      const tokens = await fastify.prisma.refreshToken.findMany({
        where: { userId, revoked: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, expiresAt: true },
      });

      return reply.send({
        data: tokens.map((t: { id: string; createdAt: Date; expiresAt: Date }) => ({
          id: t.id,
          created_at: t.createdAt.toISOString(),
          expires_at: t.expiresAt.toISOString(),
        })),
      });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      throw error;
    }
  });

  // DELETE /sessions/:id
  fastify.delete('/sessions/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;
      const { id } = request.params as { id: string };

      const result = await fastify.prisma.refreshToken.updateMany({
        where: { id, userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });

      if (result.count === 0) throw new AppError(404, 'session-not-found', 'Session not found or already revoked');

      logger.info('Session revoked', { userId, sessionId: id });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      throw error;
    }
  });

  // POST /forgot-password
  fastify.post('/forgot-password', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(forgotPasswordSchema, request.body);
      const redis = fastify.redis;

      const user = await fastify.prisma.user.findUnique({ where: { email: body.email } });

      if (user && redis) {
        const token = randomBytes(32).toString('hex');
        const payload = JSON.stringify({
          userId: user.id,
          email: user.email,
          createdAt: new Date().toISOString(),
        });
        await redis.set(`reset:${token}`, payload, 'EX', 3600);
        logger.info('Password reset token generated', { userId: user.id, email: user.email });
      }

      // Always return 200 to prevent email enumeration
      return reply.send({ message: 'If the email exists, a reset link has been sent' });
    } catch (error) {
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });

  // POST /reset-password
  fastify.post('/reset-password', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(resetPasswordSchema, request.body);
      const redis = fastify.redis;

      if (!redis) throw new AppError(503, 'service-unavailable', 'Password reset is temporarily unavailable');

      const raw = await redis.get(`reset:${body.token}`);
      if (!raw) throw new AppError(400, 'invalid-token', 'Invalid or expired reset token');

      const tokenData = JSON.parse(raw) as { userId: string; email: string };
      const passwordHash = await hashPassword(body.newPassword);

      await fastify.prisma.user.update({
        where: { id: tokenData.userId },
        data: { passwordHash },
      });

      await redis.del(`reset:${body.token}`);
      logger.info('Password reset completed', { userId: tokenData.userId, email: tokenData.email });

      return reply.send({ message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).send(error.toJSON());
      if (error instanceof ZodError) return reply.code(400).send({ status: 400, detail: error.message });
      throw error;
    }
  });
};

export default authRoutes;
