/**
 * Shared OpenAPI Schema Components
 *
 * Common schema definitions reused across multiple route groups.
 * These are documentation-only — Zod continues to handle runtime validation.
 */

/**
 * Broad type for route schemas. Prevents Fastify from narrowing
 * reply.code() based on declared response status codes.
 * These schemas exist for OpenAPI/Swagger documentation, not for
 * TypeScript type inference.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteSchema = Record<string, any>;

export const ErrorResponse = {
  type: 'object' as const,
  properties: {
    type: { type: 'string' as const, format: 'uri' },
    title: { type: 'string' as const },
    status: { type: 'integer' as const },
    detail: { type: 'string' as const },
    request_id: { type: 'string' as const },
  },
};

export const PaginationQuery = {
  type: 'object' as const,
  properties: {
    limit: { type: 'integer' as const, minimum: 1, maximum: 100, default: 20 },
    offset: { type: 'integer' as const, minimum: 0, maximum: 10000, default: 0 },
  },
};

export const PaginationResponse = {
  type: 'object' as const,
  properties: {
    limit: { type: 'integer' as const },
    offset: { type: 'integer' as const },
    total: { type: 'integer' as const },
    has_more: { type: 'boolean' as const },
  },
};

export const IdParam = {
  type: 'object' as const,
  required: ['id'],
  properties: {
    id: { type: 'string' as const },
  },
};
