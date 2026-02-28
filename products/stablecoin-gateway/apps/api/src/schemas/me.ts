/**
 * OpenAPI Schemas — Account Self-Service Routes (/v1/me)
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

export const getProfileRouteSchema: RouteSchema = {
  tags: ['account'],
  summary: 'Get current user profile (GDPR Article 15)',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'User profile',
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const, format: 'uuid' },
        email: { type: 'string' as const },
        role: { type: 'string' as const, enum: ['MERCHANT', 'ADMIN'] },
        createdAt: { type: 'string' as const, format: 'date-time' },
        updatedAt: { type: 'string' as const, format: 'date-time' },
      },
      additionalProperties: true,
    },
  },
};

export const exportDataRouteSchema: RouteSchema = {
  tags: ['account'],
  summary: 'Export all user data (GDPR Article 20)',
  description: 'Returns JSON export of all user data. Sets Content-Disposition for download.',
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      description: 'Complete user data export',
      type: 'object' as const,
      properties: {
        user: { type: 'object' as const, additionalProperties: true },
        paymentSessions: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
        apiKeys: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
        webhookEndpoints: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
        paymentLinks: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
      },
      additionalProperties: true,
    },
  },
};

export const deleteAccountRouteSchema: RouteSchema = {
  tags: ['account'],
  summary: 'Delete account permanently (GDPR Article 17)',
  description: 'Permanently deletes user and all associated data. This action cannot be undone.',
  security: [{ bearerAuth: [] }],
  response: {
    204: { description: 'Account deleted', type: 'null' as const },
  },
};
