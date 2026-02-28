/**
 * OpenAPI Schemas — Analytics Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

export const analyticsOverviewRouteSchema: RouteSchema = {
  tags: ['analytics'],
  summary: 'Get payment analytics overview',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  response: {
    200: {
      description: 'Summary statistics',
      type: 'object' as const,
      properties: {
        total_volume: { type: 'number' as const },
        transaction_count: { type: 'integer' as const },
        average_transaction_value: { type: 'number' as const },
        success_rate: { type: 'number' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
  },
};

export const analyticsVolumeRouteSchema: RouteSchema = {
  tags: ['analytics'],
  summary: 'Get payment volume time-series data',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      period: { type: 'string' as const, enum: ['day', 'week', 'month'], default: 'day' },
      days: { type: 'integer' as const, minimum: 1, maximum: 365, default: 30 },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Time-series volume data',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
        period: { type: 'string' as const },
        days: { type: 'integer' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
  },
};

export const analyticsPaymentsRouteSchema: RouteSchema = {
  tags: ['analytics'],
  summary: 'Get payment breakdown by dimension',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    required: ['group_by'],
    properties: {
      group_by: { type: 'string' as const, enum: ['status', 'network', 'token'] },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Payment breakdown',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: { type: 'object' as const, additionalProperties: true } },
        group_by: { type: 'string' as const },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
  },
};
