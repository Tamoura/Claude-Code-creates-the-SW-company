/**
 * OpenAPI Schemas — Auth Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

export const signupRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Register a new merchant account',
  body: {
    type: 'object' as const,
    required: ['email', 'password'],
    properties: {
      email: { type: 'string' as const, format: 'email' },
      password: { type: 'string' as const, minLength: 12, description: 'Strong password (12+ chars, mixed case, number, symbol)' },
    },
    additionalProperties: true,
  },
  response: {
    201: {
      description: 'Account created with tokens',
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, format: 'uuid' },
        email: { type: 'string' as const },
        role: { type: 'string' as const, enum: ['MERCHANT', 'ADMIN'] },
        created_at: { type: 'string' as const, format: 'date-time' },
        access_token: { type: 'string' as const },
        refresh_token: { type: 'string' as const },
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
    429: ErrorRef,
  },
};

export const loginRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Authenticate and receive tokens',
  body: {
    type: 'object' as const,
    required: ['email', 'password'],
    properties: {
      email: { type: 'string' as const, format: 'email' },
      password: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Login successful',
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, format: 'uuid' },
        email: { type: 'string' as const },
        role: { type: 'string' as const, enum: ['MERCHANT', 'ADMIN'] },
        access_token: { type: 'string' as const },
        refresh_token: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    401: ErrorRef,
    429: ErrorRef,
  },
};

export const refreshRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Refresh access token using refresh token',
  body: {
    type: 'object' as const,
    required: ['refresh_token'],
    properties: {
      refresh_token: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'New token pair',
      type: 'object' as const,
      properties: {
        access_token: { type: 'string' as const },
        refresh_token: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    401: ErrorRef,
  },
};

export const logoutRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Revoke refresh token and logout',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['refresh_token'],
    properties: {
      refresh_token: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Logged out successfully',
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    404: ErrorRef,
  },
};

export const sseTokenRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Generate short-lived SSE token for payment events',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['payment_session_id'],
    properties: {
      payment_session_id: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'SSE token generated (15-minute expiry)',
      type: 'object' as const,
      properties: {
        token: { type: 'string' as const },
        expires_at: { type: 'string' as const, format: 'date-time' },
      },
      additionalProperties: true,
    },
    403: ErrorRef,
    404: ErrorRef,
  },
};

export const changePasswordRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Change password for authenticated user',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['current_password', 'new_password'],
    properties: {
      current_password: { type: 'string' as const },
      new_password: { type: 'string' as const, minLength: 12 },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Password changed',
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
    401: ErrorRef,
  },
};

export const sessionsListRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'List active sessions for current user',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Active sessions',
      type: 'object' as const,
      properties: {
        data: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              created_at: { type: 'string' as const, format: 'date-time' },
              expires_at: { type: 'string' as const, format: 'date-time' },
            },
          },
        },
      },
      additionalProperties: true,
    },
  },
};

export const sessionRevokeRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Revoke a specific session',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: {
      id: { type: 'string' as const },
    },
  },
  response: {
    204: { description: 'Session revoked', type: 'null' as const },
    404: ErrorRef,
  },
};

export const forgotPasswordRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Request password reset email',
  body: {
    type: 'object' as const,
    required: ['email'],
    properties: {
      email: { type: 'string' as const, format: 'email' },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Reset link sent (always returns 200 to prevent email enumeration)',
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
  },
};

export const resetPasswordRouteSchema: RouteSchema = {
  tags: ['auth'],
  summary: 'Reset password using token from email',
  body: {
    type: 'object' as const,
    required: ['token', 'newPassword'],
    properties: {
      token: { type: 'string' as const },
      newPassword: { type: 'string' as const, minLength: 12 },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Password reset successful',
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
    503: ErrorRef,
  },
};
