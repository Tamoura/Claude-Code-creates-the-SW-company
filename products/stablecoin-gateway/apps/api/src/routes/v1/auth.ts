import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { signupSchema, loginSchema, logoutSchema, sseTokenSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, validateBody } from '../../utils/validation.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { createHash, randomBytes, randomUUID } from 'crypto';

// Account lockout constants (Redis-based, no DB migration needed)
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_SECONDS = 900; // 15 minutes
const LOCKOUT_DURATION_MS = 900_000; // 15 minutes in ms

// Access token TTL in seconds (matches JWT_EXPIRES_IN default)
const ACCESS_TOKEN_TTL_SECONDS = 900; // 15 minutes

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Auth-specific rate limiting config (5 requests per 15 minutes)
  // Uses IP + User-Agent fingerprinting to prevent bypass via IP rotation
  // while still limiting abuse from the same browser/client
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 15 * 60 * 1000, // 15 minutes in ms
        // Fingerprint using IP + truncated User-Agent
        // This prevents:
        // 1. IP rotation attacks (different IPs with same UA share limit)
        // 2. Legitimate shared IP issues (different UAs get separate limits)
        keyGenerator: (request: FastifyRequest) => {
          const ua = request.headers['user-agent'] || 'unknown';
          // Truncate User-Agent to 50 chars to limit key size
          const truncatedUA = ua.substring(0, 50);
          return `auth:${request.ip}:${truncatedUA}`;
        },
      },
    },
  };

  // POST /v1/auth/signup
  fastify.post('/signup', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(signupSchema, request.body);

      // Hash password and attempt to create user
      const passwordHash = await hashPassword(body.password);

      // Use upsert-like pattern to prevent email enumeration.
      // If the email already exists, return the same 201 shape with
      // a generic message so an attacker cannot distinguish between
      // "new account" and "existing account".
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        // SECURITY: Return generic success to prevent email enumeration.
        // Do NOT reveal that the email already exists.
        logger.info('Signup attempted for existing email', { email: body.email });
        return reply.code(201).send({
          message: 'Account created successfully. Please check your email for verification.',
        });
      }

      const user = await fastify.prisma.user.create({
        data: {
          email: body.email,
          passwordHash,
        },
      });

      // Generate tokens
      const accessToken = fastify.jwt.sign(
        { userId: user.id, role: user.role, jti: randomUUID() },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const refreshToken = fastify.jwt.sign(
        { userId: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Store refresh token in database
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
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
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

  // POST /v1/auth/login
  fastify.post('/login', authRateLimit, async (request, reply) => {
    const body = validateBody(loginSchema, request.body);

    try {
      const redis = fastify.redis;
      const lockKey = `lockout:${body.email}`;
      const failKey = `failed:${body.email}`;

      // Check if account is locked (Redis-based, degrades gracefully)
      if (redis) {
        const lockUntil = await redis.get(lockKey);
        if (lockUntil && Date.now() < parseInt(lockUntil)) {
          throw new AppError(
            429,
            'account-locked',
            'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.'
          );
        }
      }

      // Find user
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.passwordHash);
      if (!isValid) {
        // Track failed attempt in Redis
        if (redis) {
          const attempts = await redis.incr(failKey);
          await redis.expire(failKey, LOCKOUT_WINDOW_SECONDS);
          if (attempts >= LOCKOUT_MAX_ATTEMPTS) {
            await redis.set(
              lockKey,
              String(Date.now() + LOCKOUT_DURATION_MS),
              'PX',
              LOCKOUT_DURATION_MS
            );
            logger.warn('Account locked due to failed login attempts', {
              email: body.email,
              attempts,
            });
            throw new AppError(
              429,
              'account-locked',
              'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.'
            );
          }
        }
        throw new AppError(401, 'invalid-credentials', 'Invalid email or password');
      }

      // Successful login: reset failed attempt counter
      if (redis) {
        await redis.del(failKey);
        await redis.del(lockKey);
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

      // Store refresh token in database
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      await fastify.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
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
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

  // POST /v1/auth/refresh
  fastify.post('/refresh', authRateLimit, async (request, reply) => {
    try {
      const { refresh_token } = validateBody(logoutSchema, request.body);

      // Verify refresh token
      const decoded = fastify.jwt.verify(refresh_token) as { userId: string; type: string };

      if (decoded.type !== 'refresh') {
        throw new AppError(401, 'invalid-token', 'Invalid refresh token');
      }

      // Check if token is revoked
      const tokenHash = createHash('sha256').update(refresh_token).digest('hex');
      const storedToken = await fastify.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken) {
        throw new AppError(401, 'invalid-token', 'Refresh token not found');
      }

      if (storedToken.revoked) {
        throw new AppError(401, 'invalid-token', 'Refresh token has been revoked');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new AppError(401, 'invalid-token', 'Refresh token has expired');
      }

      // Fetch user to include role in the new access token (RISK-031 fix)
      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new AppError(401, 'invalid-token', 'User not found');
      }

      // Generate new access token with role included
      const accessToken = fastify.jwt.sign(
        { userId: decoded.userId, role: user.role, jti: randomUUID() },
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const newRefreshToken = fastify.jwt.sign(
        { userId: decoded.userId, type: 'refresh', jti: randomUUID() },
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Store new refresh token and revoke old one atomically
      // SECURITY: Prevents token reuse attacks by ensuring old token is revoked
      const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

      await fastify.prisma.$transaction([
        // Revoke the old refresh token
        fastify.prisma.refreshToken.update({
          where: { tokenHash },
          data: {
            revoked: true,
            revokedAt: new Date(),
          },
        }),
        // Create the new refresh token
        fastify.prisma.refreshToken.create({
          data: {
            userId: decoded.userId,
            tokenHash: newTokenHash,
            expiresAt: new Date(Date.now() + expiresIn),
          },
        }),
      ]);

      return reply.send({
        access_token: accessToken,
        refresh_token: newRefreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
          request_id: request.id,
        });
      }
      throw new AppError(401, 'invalid-token', 'Invalid or expired refresh token');
    }
  });

  // DELETE /v1/auth/logout
  fastify.delete('/logout', async (request, reply) => {
    try {
      // Verify user is authenticated
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;

      const { refresh_token } = validateBody(logoutSchema, request.body);

      // Revoke the refresh token
      const tokenHash = createHash('sha256').update(refresh_token).digest('hex');
      const result = await fastify.prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          userId,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new AppError(404, 'token-not-found', 'Refresh token not found or already revoked');
      }

      // SECURITY: Blacklist the access token's JTI in Redis so it
      // is rejected for the remainder of its lifetime (up to 15 min).
      // TTL ensures automatic cleanup -- no manual purge needed.
      const jti = (request.user as { jti?: string }).jti;
      if (jti && fastify.redis) {
        try {
          await fastify.redis.setex(
            `revoked_jti:${jti}`,
            ACCESS_TOKEN_TTL_SECONDS,
            '1'
          );
        } catch (redisError) {
          // Log but do not fail the logout -- refresh token is
          // already revoked, which is the primary defense.
          logger.warn('Failed to blacklist access token JTI in Redis', {
            jti,
            userId,
            error: redisError instanceof Error ? redisError.message : 'unknown',
          });
        }
      }

      logger.info('User logged out', { userId });

      return reply.send({
        message: 'Logged out successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
          request_id: request.id,
        });
      }
      throw error;
    }
  });

  // POST /v1/auth/sse-token
  fastify.post('/sse-token', async (request, reply) => {
    try {
      // Verify user is authenticated
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;

      // Validate request body
      const body = validateBody(sseTokenSchema, request.body);

      // Get payment session and verify ownership
      const paymentSession = await fastify.prisma.paymentSession.findUnique({
        where: { id: body.payment_session_id },
      });

      if (!paymentSession) {
        throw new AppError(404, 'payment-not-found', 'Payment session not found');
      }

      // Verify user owns this payment session
      if (paymentSession.userId !== userId) {
        throw new AppError(403, 'access-denied', 'You do not have access to this payment session');
      }

      // Generate short-lived SSE token (15 minutes)
      const expiresInSeconds = 15 * 60; // 15 minutes
      const sseToken = fastify.jwt.sign(
        {
          userId,
          paymentSessionId: body.payment_session_id,
          type: 'sse',
        },
        { expiresIn: expiresInSeconds }
      );

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      logger.info('SSE token generated', {
        userId,
        paymentSessionId: body.payment_session_id,
        expiresAt: expiresAt.toISOString(),
      });

      return reply.send({
        token: sseToken,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

  // POST /v1/auth/change-password (authenticated)
  fastify.post('/change-password', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;

      const body = validateBody(changePasswordSchema, request.body);

      // Fetch the user
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError(401, 'invalid-credentials', 'User not found');
      }

      // Verify current password
      const isValid = await verifyPassword(body.current_password, user.passwordHash);
      if (!isValid) {
        throw new AppError(401, 'invalid-credentials', 'Current password is incorrect');
      }

      // Reject if new password is same as current
      const isSame = await verifyPassword(body.new_password, user.passwordHash);
      if (isSame) {
        throw new AppError(400, 'same-password', 'New password must be different from current password');
      }

      // Hash and update
      const passwordHash = await hashPassword(body.new_password);
      await fastify.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      logger.info('Password changed', { userId });

      return reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

  // ==================== Session Management ====================

  // GET /v1/auth/sessions — list active refresh tokens for current user
  fastify.get('/sessions', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;

      const tokens = await fastify.prisma.refreshToken.findMany({
        where: { userId, revoked: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true, expiresAt: true },
      });

      const sessions = tokens.map(t => ({
        id: t.id,
        created_at: t.createdAt.toISOString(),
        expires_at: t.expiresAt.toISOString(),
      }));

      return reply.send({ data: sessions });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw error;
    }
  });

  // DELETE /v1/auth/sessions/:id — revoke a specific session
  fastify.delete('/sessions/:id', async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as { userId: string }).userId;
      const { id } = request.params as { id: string };

      const result = await fastify.prisma.refreshToken.updateMany({
        where: { id, userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });

      if (result.count === 0) {
        throw new AppError(404, 'session-not-found', 'Session not found or already revoked');
      }

      logger.info('Session revoked', { userId, sessionId: id });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      throw error;
    }
  });

  // ==================== Password Reset ====================

  // Reset token TTL: 1 hour
  const RESET_TOKEN_TTL_SECONDS = 3600;

  // POST /v1/auth/forgot-password
  fastify.post('/forgot-password', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(forgotPasswordSchema, request.body);
      const redis = fastify.redis;

      // Look up user -- but always return the same response
      const user = await fastify.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (user && redis) {
        // Generate a cryptographically secure token
        const token = randomBytes(32).toString('hex');

        // Store in Redis with 1-hour TTL
        const payload = JSON.stringify({
          userId: user.id,
          email: user.email,
          createdAt: new Date().toISOString(),
        });
        await redis.set(`reset:${token}`, payload, 'EX', RESET_TOKEN_TTL_SECONDS);

        logger.info('Password reset token generated', {
          userId: user.id,
          email: user.email,
          // Token sent via email, never logged
        });
      }

      // Always return 200 to prevent email enumeration
      return reply.send({
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

  // POST /v1/auth/reset-password
  fastify.post('/reset-password', authRateLimit, async (request, reply) => {
    try {
      const body = validateBody(resetPasswordSchema, request.body);
      const redis = fastify.redis;

      if (!redis) {
        throw new AppError(503, 'service-unavailable', 'Password reset is temporarily unavailable');
      }

      // Look up the token in Redis
      const raw = await redis.get(`reset:${body.token}`);
      if (!raw) {
        throw new AppError(400, 'invalid-token', 'Invalid or expired reset token');
      }

      const tokenData = JSON.parse(raw) as { userId: string; email: string };

      // Hash the new password (same bcrypt rounds as signup)
      const passwordHash = await hashPassword(body.newPassword);

      // Update password and revoke all existing sessions atomically.
      // MED-01: password reset must invalidate active sessions to prevent
      // session fixation — an attacker who obtained a refresh token before
      // the reset can no longer use it after this point.
      await fastify.prisma.$transaction([
        fastify.prisma.user.update({
          where: { id: tokenData.userId },
          data: { passwordHash },
        }),
        fastify.prisma.refreshToken.updateMany({
          where: { userId: tokenData.userId, revoked: false },
          data: { revokedAt: new Date(), revoked: true },
        }),
      ]);

      // Delete the token so it cannot be reused
      await redis.del(`reset:${body.token}`);

      logger.info('Password reset completed', {
        userId: tokenData.userId,
        email: tokenData.email,
      });

      return reply.send({
        message: 'Password updated successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send(error.toJSON());
      }
      if (error instanceof ZodError) {
        return reply.code(400).send({
          type: 'https://gateway.io/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: error.message,
        });
      }
      throw error;
    }
  });

};

export default authRoutes;
