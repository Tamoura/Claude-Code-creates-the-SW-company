/**
 * OpenAPI Schemas — Payment Link Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const PaymentLinkResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    name: { type: 'string' as const, nullable: true },
    short_code: { type: 'string' as const },
    amount: { type: 'number' as const, nullable: true, description: 'null = customer chooses amount' },
    currency: { type: 'string' as const },
    network: { type: 'string' as const },
    token: { type: 'string' as const },
    merchant_address: { type: 'string' as const },
    description: { type: 'string' as const, nullable: true },
    metadata: { type: 'object' as const, additionalProperties: true, nullable: true },
    active: { type: 'boolean' as const },
    max_usages: { type: 'integer' as const, nullable: true },
    usage_count: { type: 'integer' as const },
    expires_at: { type: 'string' as const, format: 'date-time', nullable: true },
    created_at: { type: 'string' as const, format: 'date-time' },
    payment_url: { type: 'string' as const, format: 'uri' },
    qr_code_url: { type: 'string' as const, format: 'uri' },
  },
  additionalProperties: true,
};

export const createPaymentLinkRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Create a reusable payment link',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['merchant_address'],
    properties: {
      name: { type: 'string' as const, maxLength: 200 },
      amount: { type: 'number' as const, minimum: 1, maximum: 10000, nullable: true, description: 'null = customer chooses amount' },
      currency: { type: 'string' as const, enum: ['USD'], default: 'USD' },
      network: { type: 'string' as const, enum: ['polygon', 'ethereum'], default: 'polygon' },
      token: { type: 'string' as const, enum: ['USDC', 'USDT'], default: 'USDC' },
      merchant_address: { type: 'string' as const, pattern: '^0x[a-fA-F0-9]{40}$' },
      success_url: { type: 'string' as const, format: 'uri' },
      cancel_url: { type: 'string' as const, format: 'uri' },
      description: { type: 'string' as const, maxLength: 500 },
      metadata: { type: 'object' as const, additionalProperties: true, description: 'Max 50 keys, 16KB total' },
      max_usages: { type: 'integer' as const, nullable: true, description: 'null = unlimited' },
      expires_at: { type: 'string' as const, format: 'date-time' },
    },
    additionalProperties: true,
  },
  response: {
    201: { description: 'Payment link created', ...PaymentLinkResponse },
    400: ErrorRef,
  },
};

export const listPaymentLinksRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'List payment links with filtering',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 50 },
      offset: { type: 'integer' as const, minimum: 0, default: 0 },
      active: { type: 'boolean' as const },
      created_after: { type: 'string' as const, format: 'date-time' },
      created_before: { type: 'string' as const, format: 'date-time' },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated list of payment links',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: PaymentLinkResponse },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const resolvePaymentLinkRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Resolve a payment link by short code (public)',
  description: 'No authentication required. Used by the checkout UI.',
  params: {
    type: 'object' as const,
    required: ['shortCode'],
    properties: { shortCode: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Payment link details', ...PaymentLinkResponse },
    404: ErrorRef,
  },
};

export const qrCodeRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Generate QR code for payment link (public)',
  description: 'No authentication required. Returns QR code as data URL.',
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: {
      description: 'QR code data',
      type: 'object' as const,
      properties: {
        qr_code: { type: 'string' as const, description: 'QR code as PNG data URL' },
        payment_url: { type: 'string' as const, format: 'uri' },
      },
      additionalProperties: true,
    },
    400: ErrorRef,
    404: ErrorRef,
  },
};

export const getPaymentLinkRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Get payment link by ID',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Payment link details', ...PaymentLinkResponse },
    404: ErrorRef,
  },
};

export const updatePaymentLinkRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Update payment link',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  body: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const, maxLength: 200 },
      active: { type: 'boolean' as const },
      success_url: { type: 'string' as const, format: 'uri' },
      cancel_url: { type: 'string' as const, format: 'uri' },
      description: { type: 'string' as const, maxLength: 500 },
      metadata: { type: 'object' as const, additionalProperties: true },
      max_usages: { type: 'integer' as const, nullable: true },
      expires_at: { type: 'string' as const, format: 'date-time' },
    },
    additionalProperties: true,
  },
  response: {
    200: { description: 'Updated payment link', ...PaymentLinkResponse },
    400: ErrorRef,
    404: ErrorRef,
  },
};

export const deletePaymentLinkRouteSchema: RouteSchema = {
  tags: ['payment-links'],
  summary: 'Deactivate payment link',
  description: 'Soft-deletes by setting active=false.',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Deactivated payment link', ...PaymentLinkResponse },
    404: ErrorRef,
  },
};
