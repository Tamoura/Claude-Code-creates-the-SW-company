/**
 * OpenAPI Schemas — Webhook Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const WebhookResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    url: { type: 'string' as const, format: 'uri' },
    events: { type: 'array' as const, items: { type: 'string' as const } },
    enabled: { type: 'boolean' as const },
    description: { type: 'string' as const, nullable: true },
    created_at: { type: 'string' as const, format: 'date-time' },
    updated_at: { type: 'string' as const, format: 'date-time' },
    secret: { type: 'string' as const, description: 'Only returned on creation and rotation' },
  },
  additionalProperties: true,
};

export const createWebhookRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'Create a webhook endpoint',
  description: 'The webhook secret is returned ONLY on creation. Store it securely.',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['url', 'events'],
    properties: {
      url: { type: 'string' as const, format: 'uri', description: 'HTTPS-only webhook URL' },
      events: { type: 'array' as const, items: { type: 'string' as const }, description: 'Event types to subscribe to' },
      enabled: { type: 'boolean' as const, default: true },
      description: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    201: { description: 'Webhook created (includes secret)', ...WebhookResponse },
    400: ErrorRef,
  },
};

export const listWebhooksRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'List webhook endpoints',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
      offset: { type: 'integer' as const, minimum: 0, default: 0 },
    },
    additionalProperties: true,
  },
  response: {
    200: {
      description: 'Paginated list of webhooks (secrets excluded)',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: WebhookResponse },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const getWebhookRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'Get webhook by ID',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'Webhook details (secret excluded)', ...WebhookResponse },
    404: ErrorRef,
  },
};

export const updateWebhookRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'Update webhook configuration',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  body: {
    type: 'object' as const,
    properties: {
      url: { type: 'string' as const, format: 'uri', description: 'HTTPS-only webhook URL' },
      events: { type: 'array' as const, items: { type: 'string' as const } },
      enabled: { type: 'boolean' as const },
      description: { type: 'string' as const },
    },
    additionalProperties: true,
  },
  response: {
    200: { description: 'Updated webhook (secret excluded)', ...WebhookResponse },
    400: ErrorRef,
    404: ErrorRef,
  },
};

export const deleteWebhookRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'Delete webhook endpoint',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    204: { description: 'Webhook deleted', type: 'null' as const },
    404: ErrorRef,
  },
};

export const rotateWebhookSecretRouteSchema: RouteSchema = {
  tags: ['webhooks'],
  summary: 'Rotate webhook secret',
  description: 'Generates a new secret. The new secret is returned ONLY once.',
  security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: {
      description: 'New secret (store securely, shown only once)',
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        secret: { type: 'string' as const, description: 'New webhook secret (whsec_...)' },
        rotatedAt: { type: 'string' as const, format: 'date-time' },
      },
      additionalProperties: true,
    },
    404: ErrorRef,
  },
};
