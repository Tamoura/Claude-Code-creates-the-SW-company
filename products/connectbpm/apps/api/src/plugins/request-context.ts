/**
 * Correlation IDs (NFR-013, ADR-004 §5 logging rule).
 *
 * The id is minted by Fastify's `genReqId` (see `app.ts`) so that it exists
 * BEFORE the request logger's child is created — otherwise every log line
 * carries an empty `reqId` and correlation silently does not work. This plugin
 * only echoes it back on the response.
 *
 * Downstream agents: `request.id` and `tenantId` belong on every log line.
 * Never log a field marked `/// @pii` in the Prisma schema (FR-097).
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

/** Accepts a caller-supplied id; mints one otherwise. */
export function resolveRequestId(req: { headers: Record<string, unknown> }): string {
  // Literal index, not a dynamic key — the object-injection sink does not apply.
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string') {
    const trimmed = incoming.trim();
    // Bound it: an unbounded caller-controlled value ends up in every log line.
    if (trimmed.length > 0 && trimmed.length <= 128) return trimmed;
  }
  return randomUUID();
}

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    void reply.header('X-Request-ID', request.id);
  });
};

export default fp(requestContextPlugin, { name: 'request-context-plugin' });
