import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas';
import { sendSuccess, sendError } from '../../lib/response';
import { ValidationError } from '../../lib/errors';
import { zodToDetails } from '../../lib/validation';

const errorResponseSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    success: { type: 'boolean' },
    error: {
      type: 'object',
      additionalProperties: true,
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
    schema: {
      description: 'Register a new user account',
      tags: ['Auth'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password', 'displayName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          displayName: { type: 'string', minLength: 2, maxLength: 100 },
        },
      },
      response: {
        201: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                userId: { type: 'string' },
                email: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
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
    schema: {
      description: 'Authenticate with email and password',
      tags: ['Auth'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                accessToken: { type: 'string' },
                user: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        // Higher limit in dev/test to allow E2E test suites (each test does a fresh login)
        max: process.env.NODE_ENV === 'production' ? 5 : 100,
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
      path: '/', // Path=/ so Next.js middleware can read it for auth checks
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set lightweight session flag (non-httpOnly) so the Next.js middleware and
    // the client-side useAuth hook can detect an active session without needing
    // to read the httpOnly refreshToken cookie.
    reply.setCookie('session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    // Return accessToken + user in body; refreshToken is in httpOnly cookie only
    const { refreshToken: _rt, ...responseData } = data;
    return sendSuccess(reply, responseData);
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', {
    config: {
      rateLimit: {
        // Higher limit in dev/test — E2E tests trigger a refresh on every page navigation
        max: process.env.NODE_ENV === 'production' ? 10 : 200,
        timeWindow: '1 minute',
      },
    },
    // Allow empty or missing body — the refresh token comes from the httpOnly cookie
    schema: {
      description: 'Refresh the access token using the httpOnly refresh token cookie',
      tags: ['Auth'],
      body: {
        type: 'object',
        additionalProperties: true,
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                accessToken: { type: 'string' },
                user: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
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

    // Rotate the refresh token cookie — the new token was generated and
    // stored in the DB; send it to the client so subsequent refreshes work.
    reply.setCookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Keep the session flag fresh so the client knows the session is alive.
    reply.setCookie('session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    // Strip the raw refreshToken from the response body — it lives in the
    // httpOnly cookie only.
    const { refreshToken: _rt, ...responseData } = data;
    return sendSuccess(reply, responseData);
  });

  // POST /api/v1/auth/logout
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Logout and revoke the current access token immediately',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const refreshToken =
        (request.cookies as Record<string, string | undefined>)
          ?.refreshToken ||
        (
          request.body as { refreshToken?: string } | undefined
        )?.refreshToken;

      if (refreshToken) {
        await authService.logout(refreshToken, request.user.sub);
      }

      // Blacklist the current access token so it cannot be reused
      // during the remainder of its 15-minute lifetime.
      const jti = (request.user as { jti?: string }).jti;
      if (jti) {
        // TTL matches the access token max lifetime (15 minutes = 900 s).
        await fastify.redis.set(`blacklist:${jti}`, '1', { EX: 900 });
      }

      reply.clearCookie('refreshToken', { path: '/' });
      reply.clearCookie('session', { path: '/' });

      return sendSuccess(reply, {
        message: 'Logged out successfully',
      });
    }
  );

  // DELETE /api/v1/auth/account
  fastify.delete(
    '/account',
    {
      schema: {
        description: 'Permanently delete the current user account and all data (GDPR)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
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

      reply.clearCookie('refreshToken', { path: '/' });

      return sendSuccess(reply, {
        message: 'Account deleted successfully',
      });
    }
  );

  // GET /api/v1/auth/export — GDPR data export
  fastify.get(
    '/export',
    {
      schema: {
        description: 'Export all personal data for the current user (GDPR Article 20)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
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

  // POST /api/v1/auth/forgot-password
  fastify.post('/forgot-password', {
    schema: {
      description: 'Request a password reset link',
      tags: ['Auth'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = forgotPasswordSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await authService.forgotPassword(result.data);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/reset-password
  fastify.post('/reset-password', {
    schema: {
      description: 'Reset password using the token from the reset email',
      tags: ['Auth'],
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: true,
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const result = resetPasswordSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(
        'Validation failed',
        zodToDetails(result.error)
      );
    }

    const data = await authService.resetPassword(result.data);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/auth/verify-email/:token
  fastify.get<{ Params: { token: string } }>(
    '/verify-email/:token',
    {
      schema: {
        description: 'Verify email address via token sent in the verification email',
        tags: ['Auth'],
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  accessToken: { type: 'string' },
                  message: { type: 'string' },
                  redirectTo: { type: 'string' },
                },
              },
            },
          },
        },
      },
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
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
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
            additionalProperties: true,
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
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
