/**
 * OpenAPI Schemas — Payment Session Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const PaymentSessionResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    amount: { type: 'number' as const },
    currency: { type: 'string' as const, enum: ['USD'] },
    network: { type: 'string' as const, enum: ['polygon', 'ethereum'] },
    token: { type: 'string' as const, enum: ['USDC', 'USDT'] },
    merchant_address: { type: 'string' as const, pattern: '^0x[a-fA-F0-9]{40}$' },
    customer_address: { type: 'string' as const, nullable: true },
    status: { type: 'string' as const, enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
    description: { type: 'string' as const, nullable: true },
    tx_hash: { type: 'string' as const, nullable: true },
    block_number: { type: 'integer' as const, nullable: true },
    confirmations: { type: 'integer' as const },
    checkout_url: { type: 'string' as const, format: 'uri' },
    success_url: { type: 'string' as const, nullable: true },
    cancel_url: { type: 'string' as const, nullable: true },
    metadata: { type: 'object' as const, additionalProperties: true, nullable: true },
    idempotency_key: { type: 'string' as const, nullable: true },
    created_at: { type: 'string' as const, format: 'date-time' },
    expires_at: { type: 'string' as const, format: 'date-time' },
    completed_at: { type: 'string' as const, format: 'date-time', nullable: true },
  },
  additionalProperties: true,
};

export const createPaymentSessionRouteSchema: RouteSchema = {
  tags: ['payments'],
  summary: 'Create a new payment session',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  headers: {
    type: 'object' as const,
    properties: {
      'idempotency-key': { type: 'string' as const, format: 'uuid', description: 'Idempotency key (UUID v4)' },
    },
  },
  body: {
    type: 'object' as const,
    required: ['amount', 'merchant_address'],
    properties: {
      amount: { type: 'number' as const, exclusiveMinimum: 0, description: 'Payment amount in USD' },
      currency: { type: 'string' as const, enum: ['USD'], default: 'USD' },
      network: { type: 'string' as const, enum: ['polygon', 'ethereum'], default: 'polygon' },
      token: { type: 'string' as const, enum: ['USDC', 'USDT'], default: 'USDC' },
      merchant_address: { type: 'string' as const, pattern: '^0x[a-fA-F0-9]{40}$' },
      description: { type: 'string' as const },
      success_url: { type: 'string' as const, format: 'uri' },
      cancel_url: { type: 'string' as const, format: 'uri' },
      metadata: { type: 'object' as const, additionalProperties: true },
    },
    additionalProperties: true,
  },
  response: {
    201: { description: 'Payment session created', ...PaymentSessionResponse },
    200: { description: 'Existing payment session returned (idempotent)', ...PaymentSessionResponse },
    400: ErrorRef,
    409: ErrorRef,
  },
};

export const listPaymentSessionsRouteSchema: RouteSchema = {
  tags: ['payments'],
  summary: 'List payment sessions with filtering',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer' as const, minimum: 0, default: 0 },
      status: { type: 'string' as const, enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
      network: { type: 'string' as const, enum: ['polygon', 'ethereum'] },
      created_after: { type: 'string' as const, format: 'date-time' },
      created_before: { type: 'string' as const, format: 'date-time' },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated list of payment sessions',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: PaymentSessionResponse },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const getPaymentSessionRouteSchema: RouteSchema = {
  tags: ['payments'],
  summary: 'Get payment session by ID',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Payment session details', ...PaymentSessionResponse },
    404: ErrorRef,
  },
};

export const updatePaymentSessionRouteSchema: RouteSchema = {
  tags: ['payments'],
  summary: 'Update payment session (status transition with blockchain verification)',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  body: {
    type: 'object' as const,
    properties: {
      customer_address: { type: 'string' as const, pattern: '^0x[a-fA-F0-9]{40}$' },
      tx_hash: { type: 'string' as const },
      block_number: { type: 'integer' as const },
      confirmations: { type: 'integer' as const },
      status: { type: 'string' as const, enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
    },
    additionalProperties: true,
  },
  response: {
    200: { description: 'Updated payment session', ...PaymentSessionResponse },
    400: ErrorRef,
    404: ErrorRef,
  },
};

export const paymentSessionEventsRouteSchema: RouteSchema = {
  tags: ['payments'],
  summary: 'Subscribe to real-time payment status updates (SSE)',
  description: 'Requires a short-lived SSE token obtained from POST /v1/auth/sse-token',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: {
      description: 'SSE event stream',
      type: 'string' as const,
    },
    401: { description: 'Unauthorized', type: 'string' as const },
    429: { description: 'Too many SSE connections', type: 'string' as const },
  },
};
