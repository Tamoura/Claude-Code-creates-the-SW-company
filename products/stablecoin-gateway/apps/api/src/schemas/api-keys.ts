/**
 * OpenAPI Schemas — API Key Routes
 *
 * Documentation-only schemas for Swagger UI. Zod handles runtime validation.
 */

import { RouteSchema } from './shared.js';

const ErrorRef = { $ref: '#/components/schemas/ErrorResponse' };

const ApiKeyResponse = {
  type: 'object' as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    name: { type: 'string' as const },
    key: { type: 'string' as const, description: 'Full API key (only returned on creation)' },
    key_prefix: { type: 'string' as const, description: 'Key prefix for identification (e.g. sk_live_abc...)' },
    permissions: {
      type: 'object' as const,
      properties: {
        read: { type: 'boolean' as const },
        write: { type: 'boolean' as const },
        refund: { type: 'boolean' as const },
      },
    },
    last_used_at: { type: 'string' as const, format: 'date-time', nullable: true },
    created_at: { type: 'string' as const, format: 'date-time' },
  },
  additionalProperties: true,
};

export const createApiKeyRouteSchema: RouteSchema = {
  tags: ['api-keys'],
  summary: 'Create a new API key',
  description: 'The full key is returned ONLY on creation. Store it securely.',
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object' as const,
    required: ['name', 'permissions'],
    properties: {
      name: { type: 'string' as const },
      permissions: {
        type: 'object' as const,
        properties: {
          read: { type: 'boolean' as const },
          write: { type: 'boolean' as const },
          refund: { type: 'boolean' as const },
        },
      },
    },
    additionalProperties: true,
  },
  response: {
    201: { description: 'API key created (includes full key)', ...ApiKeyResponse },
    400: ErrorRef,
  },
};

export const listApiKeysRouteSchema: RouteSchema = {
  tags: ['api-keys'],
  summary: 'List API keys',
  security: [{ bearerAuth: [] }],
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
      description: 'Paginated list of API keys (full key excluded)',
      type: 'object' as const,
      properties: {
        data: { type: 'array' as const, items: ApiKeyResponse },
        pagination: { $ref: '#/components/schemas/PaginationResponse' },
      },
      additionalProperties: true,
    },
  },
};

export const getApiKeyRouteSchema: RouteSchema = {
  tags: ['api-keys'],
  summary: 'Get API key by ID',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    200: { description: 'API key details (full key excluded)', ...ApiKeyResponse },
    404: ErrorRef,
  },
};

export const deleteApiKeyRouteSchema: RouteSchema = {
  tags: ['api-keys'],
  summary: 'Delete (revoke) an API key',
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object' as const,
    required: ['id'],
    properties: { id: { type: 'string' as const } },
  },
  response: {
    204: { description: 'API key deleted', type: 'null' as const },
    404: ErrorRef,
  },
};
