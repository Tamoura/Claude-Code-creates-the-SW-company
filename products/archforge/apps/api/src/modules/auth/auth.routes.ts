/**
 * Auth Routes - /api/v1/auth
 *
 * Thin route handlers that delegate to AuthService.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AppError } from '../../types/index.js';
import { AuthService } from './auth.service.js';
import { AuthRecoveryService } from './auth.recovery.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

function handleValidationError(error: unknown, _requestId: string) {
  if (error instanceof AppError) throw error;
  if (error instanceof z.ZodError) {
    throw new AppError(400, 'validation-error', error.errors.map(e => e.message).join('; '));
  }
  throw error;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);
  const recoveryService = new AuthRecoveryService(fastify);

  // POST /register
  fastify.post('/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const ip = request.ip;
      const ua = (request.headers['user-agent'] as string) || '';
      const result = await authService.register(body.email, body.password, body.fullName, ip, ua);
      return reply.code(201).send(result);
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // POST /login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const ip = request.ip;
      const userAgent = (request.headers['user-agent'] as string) || '';
      const result = await authService.login(body.email, body.password, ip, userAgent);

      reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
      return reply.send({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        user: result.user,
      });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // POST /refresh
  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies?.refreshToken;
      if (!refreshToken) {
        throw new AppError(401, 'unauthorized', 'Missing refresh token');
      }

      const ip = request.ip;
      const userAgent = (request.headers['user-agent'] as string) || '';
      const result = await authService.refresh(refreshToken, ip, userAgent);

      reply.setCookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
      return reply.send({
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const decoded = fastify.jwt.decode(
        request.headers.authorization!.substring(7)
      ) as { jti?: string } | null;
      const refreshToken = request.cookies?.refreshToken;

      const logoutIp = request.ip;
      const logoutUa = (request.headers['user-agent'] as string) || '';
      await authService.logout(user.id, decoded?.jti || '', refreshToken, logoutIp, logoutUa);

      reply.clearCookie('refreshToken', {
        path: '/api/v1/auth',
      });
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // GET /me
  fastify.get('/me', async (request, reply) => {
    try {
      await fastify.authenticate(request);
      const user = request.currentUser!;
      const profile = await authService.getProfile(user.id);
      return reply.send(profile);
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    try {
      const body = forgotPasswordSchema.parse(request.body);
      const fpIp = request.ip;
      const fpUa = (request.headers['user-agent'] as string) || '';
      await recoveryService.forgotPassword(body.email, fpIp, fpUa);
      return reply.send({
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);
      const rpIp = request.ip;
      const rpUa = (request.headers['user-agent'] as string) || '';
      await recoveryService.resetPassword(body.token, body.password, rpIp, rpUa);
      return reply.send({ message: 'Password reset successfully.' });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });

  // GET /verify-email/:token
  fastify.get('/verify-email/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      await recoveryService.verifyEmail(token);
      return reply.send({ message: 'Email verified successfully.' });
    } catch (error) {
      handleValidationError(error, request.id);
    }
  });
};

export default authRoutes;
