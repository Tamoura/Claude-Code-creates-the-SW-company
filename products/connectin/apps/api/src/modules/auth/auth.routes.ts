import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schemas';
import { sendSuccess, sendError } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const errorResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma, fastify);

  // POST /api/v1/auth/register
  fastify.post('/register', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await authService.register(result.data);
    return sendSuccess(reply, data, 201);
  });

  // POST /api/v1/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await authService.login(result.data, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    // Set refresh token as httpOnly cookie
    reply.setCookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Return accessToken + user in body; refreshToken is in httpOnly cookie only
    const { refreshToken: _rt, ...responseData } = data;
    return sendSuccess(reply, responseData);
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const refreshToken =
      (request.cookies as Record<string, string | undefined>)
        ?.refreshToken ||
      (
        request.body as { refreshToken?: string } | undefined
      )?.refreshToken;

    if (!refreshToken) {
      return sendError(
        reply,
        401,
        'UNAUTHORIZED',
        'Refresh token required'
      );
    }

    const data = await authService.refresh(refreshToken);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/logout
  fastify.post(
    '/logout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const refreshToken =
        (request.cookies as Record<string, string | undefined>)
          ?.refreshToken ||
        (
          request.body as { refreshToken?: string } | undefined
        )?.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      reply.clearCookie('refreshToken', {
        path: '/api/v1/auth',
      });

      return sendSuccess(reply, {
        message: 'Logged out successfully',
      });
    }
  );

  // DELETE /api/v1/auth/account
  fastify.delete(
    '/account',
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      await authService.deleteAccount(request.user.sub);

      reply.clearCookie('refreshToken', {
        path: '/api/v1/auth',
      });

      return sendSuccess(reply, {
        message: 'Account deleted successfully',
      });
    }
  );

  // GET /api/v1/auth/export — GDPR data export
  fastify.get(
    '/export',
    {
      preHandler: [fastify.authenticate],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      const data = await authService.exportUserData(
        request.user.sub
      );
      return sendSuccess(reply, data);
    }
  );

  // GET /api/v1/auth/verify-email/:token
  fastify.get<{ Params: { token: string } }>(
    '/verify-email/:token',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const data = await authService.verifyEmail(
        request.params.token
      );
      return sendSuccess(reply, {
        ...data,
        redirectTo: '/profile/setup',
      });
    }
  );

  // GET /api/v1/auth/sessions -- List active sessions
  fastify.get(
    '/sessions',
    {
      schema: {
        description: 'List all active sessions for the current user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    ipAddress: { type: 'string', nullable: true },
                    userAgent: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    current: { type: 'boolean' },
                  },
                },
              },
            },
          },
          401: errorResponseSchema,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const sessions = await authService.listSessions(
        request.user.sub,
        request.user.jti
      );
      return sendSuccess(reply, sessions);
    }
  );

  // DELETE /api/v1/auth/sessions/:id -- Revoke a session
  fastify.delete<{ Params: { id: string } }>(
    '/sessions/:id',
    {
      schema: {
        description: 'Revoke a specific session',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      await authService.revokeSession(
        request.params.id,
        request.user.sub
      );
      return sendSuccess(reply, {
        message: 'Session revoked successfully',
      });
    }
  );
};

export default authRoutes;
