/**
 * OpenAPI Schemas — Refund Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const RefundResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    payment_session_id: { type: 'string' as const, format: 'uuid' },
    amount: { type: 'number' as const },
    reason: { type: 'string' as const, nullable: true },
    status: { type: 'string' as const, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
    created_at: { type: 'string' as const, format: 'date-time' },
    updated_at: { type: 'string' as const, format: 'date-time' },
  },
  additionalProperties: true,
};

export const createRefundRouteSchema: RouteSchema = {
  tags: ['refunds'],
  summary: 'Create a refund request',
  description: 'Rate limited to 10 refund requests per minute per user. Supports idempotency via Idempotency-Key header.',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  headers: {
    type: 'object' as const,
    properties: {
      'idempotency-key': { type: 'string' as const, description: 'Idempotency key for safe retries' },
    },
  },
  body: {
    type: 'object' as const,
    required: ['payment_session_id', 'amount'],
    properties: {
      payment_session_id: { type: 'string' as const },
      amount: { type: 'number' as const, exclusiveMinimum: 0, description: 'Refund amount (max 6 decimal places for USDC/USDT)' },
      reason: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    201: { description: 'Refund created', ...RefundResponse },
    200: { description: 'Existing refund returned (idempotent)', ...RefundResponse },
    400: ErrorRef,
    429: ErrorRef,
  },
};

export const listRefundsRouteSchema: RouteSchema = {
  tags: ['refunds'],
  summary: 'List refunds with filtering',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      payment_session_id: { type: 'string' as const },
      status: { type: 'string' as const, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer' as const, minimum: 0, default: 0 },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated list of refunds',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: RefundResponse },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const getRefundRouteSchema: RouteSchema = {
  tags: ['refunds'],
  summary: 'Get refund by ID',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Refund details', ...RefundResponse },
    404: ErrorRef,
  },
};
