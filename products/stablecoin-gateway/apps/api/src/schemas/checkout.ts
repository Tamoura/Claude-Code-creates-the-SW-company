/**
 * OpenAPI Schemas — Checkout Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

export const getCheckoutRouteSchema: RouteSchema = {
  tags: ['checkout'],
  summary: 'Get checkout page data (public)',
  description: 'No authentication required. Returns minimal payment info for the customer-facing checkout UI. Sensitive fields excluded.',
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: {
      description: 'Checkout data',
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        amount: { type: 'number' as const },
        currency: { type: 'string' as const },
        description: { type: 'string' as const, nullable: true },
        status: { type: 'string' as const, enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
        network: { type: 'string' as const },
        token: { type: 'string' as const },
        expires_at: { type: 'string' as const, format: 'date-time' },
      },
      additionalProperties: true,
    },
    404: ErrorRef,
    410: {
      description: 'Payment session expired',
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const },
        title: { type: 'string' as const },
        status: { type: 'integer' as const },
        detail: { type: 'string' as const },
      },
      additionalProperties: true,
    },
  },
};
