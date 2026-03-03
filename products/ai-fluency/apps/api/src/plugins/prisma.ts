/**
 * plugins/prisma.ts — Prisma client plugin with RLS session middleware
 *
 * Registration order: MUST be registered before authPlugin and routes.
 *
 * Features:
 * - Prisma client lifecycle management (connect/disconnect)
 * - Slow query logging
 * - Fastify onRequest hook: sets app.current_org_id for RLS
 *   so PostgreSQL Row Level Security automatically filters all tenant data
 *
 * SECURITY: All tenant-scoped tables require app.current_org_id to be set.
 * NEVER query tenant tables without an active RLS context.
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || '500',
  10
);

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });

  // Log slow queries for performance monitoring
  prisma.$on('query', (e: { query: string; params: string; duration: number; target: string }) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow query detected', {
        query: e.query,
        duration_ms: e.duration,
        threshold_ms: SLOW_QUERY_THRESHOLD_MS,
        target: e.target,
      });
    }
  });

  try {
    await prisma.$connect();
    logger.info('Database connected', {
      slow_query_threshold_ms: SLOW_QUERY_THRESHOLD_MS,
    });
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }

  fastify.decorate('prisma', prisma);

  // ── RLS SESSION MIDDLEWARE ─────────────────────────────────────────────────
  // Implements multi-tenant Row Level Security via a per-request orgId context.
  //
  // RLS policy (applied via migration SQL on all tenant-scoped tables):
  //   CREATE POLICY org_isolation ON <table>
  //     USING (org_id = current_setting('app.current_org_id')::uuid);
  //
  // Architecture:
  // Prisma uses a connection pool — the connection used by $executeRaw in
  // onRequest may differ from the connection used by handler queries. Setting
  // a session variable on connection A does not affect queries on connection B.
  //
  // Solution: Store the orgId per-request in a request-scoped context
  // (request.rlsOrgId). The auth plugin sets request.currentUser in preHandler.
  // Then a server-level preHandler hook (runs after route preHandlers) calls
  // set_config on the same Prisma operation as the DB query — via $transaction
  // in route handlers that need RLS. This is the only reliable pattern with
  // connection pooling.
  //
  // SIMPLER APPROACH (implemented here): Store the orgId on request in onRequest,
  // and expose a helper via fastify.withRls() that services call to execute
  // queries in a RLS-aware transaction:
  //
  //   await fastify.withRls(request, async (tx) => {
  //     return tx.user.findMany({ where: { orgId: ... } });
  //   });
  //
  // This ensures set_config and the query run on the SAME connection.
  //
  // SECURITY: Uses parameterized $executeRaw (tagged template) — never
  // $executeRawUnsafe. orgId is UUID-validated before use.
  //
  // onRequest: Extract orgId from JWT Bearer token (decode-only, not verify).
  // JWT verification happens in the auth plugin's authenticate preHandler.
  // Extracting here allows us to have orgId available throughout the request.
  fastify.addHook('onRequest', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return; // Unauthenticated request — no RLS context needed
    }

    try {
      // Decode JWT payload without signature verification.
      // Full verification happens in the auth plugin's authenticate preHandler.
      const token = authHeader.slice(7);
      const [, payloadB64] = token.split('.');
      if (!payloadB64) return;

      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      ) as { orgId?: string };

      const orgId = payload.orgId;

      // Validate UUID format — rejects malformed or injected values early
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!orgId || !UUID_REGEX.test(orgId)) {
        return;
      }

      // Store on request for use by route handlers via fastify.withRls()
      request.rlsOrgId = orgId;
    } catch {
      // Malformed JWT — skip. Auth plugin will reject in preHandler.
    }
  });

  // Expose withRls() helper: executes a callback within a Prisma interactive
  // transaction that first sets app.current_org_id for RLS enforcement.
  // Route handlers and services MUST use this for all tenant-scoped queries.
  fastify.decorate(
    'withRls',
    async <T>(
      request: import('fastify').FastifyRequest,
      callback: (tx: PrismaClient) => Promise<T>
    ): Promise<T> => {
      const orgId = request.rlsOrgId;

      if (!orgId) {
        // Unauthenticated context — execute without RLS (for global-only queries)
        return callback(prisma);
      }

      return prisma.$transaction(async (tx) => {
        // Set RLS variable within this transaction — same connection guaranteed
        await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
        return callback(tx as unknown as PrismaClient);
      });
    }
  );

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
