import { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schemas';
import { sendSuccess, sendError } from '../../lib/response';
import { ValidationError } from '../../lib/errors';

function zodToDetails(
  err: ZodError
): Array<{ field: string; message: string }> {
  return err.errors.map((e) => ({
    field: e.path.join('.') || 'unknown',
    message: e.message,
  }));
}

// Reusable OpenAPI schema fragments
const errorResponseSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    error: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const },
        code: { type: 'string' as const },
        message: { type: 'string' as const },
        details: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              field: { type: 'string' as const },
              message: { type: 'string' as const },
            },
          },
        },
      },
    },
  },
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(
    fastify.prisma,
    fastify
  );

  // POST /api/v1/auth/register
  fastify.post(
    '/register',
    {
      schema: {
        description: 'Register a new user account',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'displayName'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
            },
            password: {
              type: 'string',
              minLength: 8,
              description:
                'Must contain uppercase, number, special char',
            },
            displayName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
          409: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = registerSchema.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await authService.register(result.data);
      return sendSuccess(reply, data, 201);
    }
  );

  // POST /api/v1/auth/login
  fastify.post(
    '/login',
    {
      schema: {
        description:
          'Authenticate with email and password',
        tags: ['Auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
            },
            password: {
              type: 'string',
              minLength: 1,
            },
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
                  accessToken: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      displayName: {
                        type: 'string',
                      },
                      role: { type: 'string' },
                      emailVerified: {
                        type: 'boolean',
                      },
                      languagePreference: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
          401: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = loginSchema.safeParse(request.body);
      if (!result.success) {
        throw new ValidationError(
          'Validation failed',
          zodToDetails(result.error)
        );
      }

      const data = await authService.login(result.data);

      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return sendSuccess(reply, data);
    }
  );

  // POST /api/v1/auth/refresh
  fastify.post(
    '/refresh',
    {
      schema: {
        description:
          'Refresh access token using refresh token',
        tags: ['Auth'],
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
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
                  accessToken: { type: 'string' },
                },
              },
            },
          },
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const refreshToken =
        (
          request.cookies as Record<
            string,
            string | undefined
          >
        )?.refreshToken ||
        (
          request.body as
            | { refreshToken?: string }
            | undefined
        )?.refreshToken;

      if (!refreshToken) {
        return sendError(
          reply,
          401,
          'UNAUTHORIZED',
          'Refresh token required'
        );
      }

      const data =
        await authService.refresh(refreshToken);
      return sendSuccess(reply, data);
    }
  );

  // POST /api/v1/auth/logout
  fastify.post(
    '/logout',
    {
      schema: {
        description: 'Logout and invalidate session',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
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
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const refreshToken =
        (
          request.cookies as Record<
            string,
            string | undefined
          >
        )?.refreshToken ||
        (
          request.body as
            | { refreshToken?: string }
            | undefined
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

  // GET /api/v1/auth/verify-email/:token
  fastify.get<{ Params: { token: string } }>(
    '/verify-email/:token',
    {
      schema: {
        description:
          'Verify email with verification token',
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
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  message: { type: 'string' },
                  redirectTo: { type: 'string' },
                },
              },
            },
          },
          400: errorResponseSchema,
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

};

export default authRoutes;
