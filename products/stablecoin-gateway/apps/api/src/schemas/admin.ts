/**
 * OpenAPI Schemas — Admin Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

export const kmsRotateRouteSchema: RouteSchema = {
  tags: ['admin'],
  summary: 'Rotate KMS encryption key',
  description: 'Admin only. Performs health check after rotation; auto-rolls back on failure.',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['newKeyId'],
    properties: {
      newKeyId: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Key rotation successful',
      type: 'object' as const,
      properties: {
        success: { type: 'boolean' as const },
        message: { type: 'string' as const },
        keyId: { type: 'string' as const, description: 'Truncated key ID' },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
    503: {
      description: 'New key unhealthy, rolled back',
      type: 'object' as const,
      properties: {
        error: { type: 'string' as const },
        message: { type: 'string' as const },
      },
      additionalProperties: true,
    },
  },
};

export const merchantsListRouteSchema: RouteSchema = {
  tags: ['admin'],
  summary: 'List all merchants with payment statistics',
  description: 'Admin only. Uses database-level aggregation for efficiency.',
  security: [{ bearerAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer' as const, minimum: 0, maximum: 10000, default: 0 },
      search: { type: 'string' as const, description: 'Search merchants by email' },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated merchant list with stats',
      type: 'object' as const,
      properties: {
        data: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              email: { type: 'string' as const },
              role: { type: 'string' as const },
              created_at: { type: 'string' as const, format: 'date-time' },
              payment_count: { type: 'integer' as const },
              total_volume: { type: 'number' as const },
              status_summary: { type: 'object' as const, additionalProperties: { type: 'integer' as const } },
            },
            additionalProperties: true,
          },
        },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const merchantPaymentsRouteSchema: RouteSchema = {
  tags: ['admin'],
  summary: 'List payments for a specific merchant',
  description: 'Admin only.',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer' as const, minimum: 0, maximum: 10000, default: 0 },
      status: { type: 'string' as const, enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated merchant payments',
      type: 'object' as const,
      properties: {
        data: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              amount: { type: 'number' as const },
              currency: { type: 'string' as const },
              description: { type: 'string' as const, nullable: true },
              status: { type: 'string' as const },
              network: { type: 'string' as const },
              token: { type: 'string' as const },
              merchant_address: { type: 'string' as const },
              customer_address: { type: 'string' as const, nullable: true },
              tx_hash: { type: 'string' as const, nullable: true },
              created_at: { type: 'string' as const, format: 'date-time' },
              completed_at: { type: 'string' as const, format: 'date-time', nullable: true },
            },
            additionalProperties: true,
          },
        },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
    404: ErrorRef,
  },
};
