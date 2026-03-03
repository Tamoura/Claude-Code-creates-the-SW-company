/**
 * types/index.ts — Shared TypeScript types for the AI Fluency API
 *
 * Extends Fastify's module augmentation to add app-level decorators.
 */

import { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

// ─────────────────────────────────────────────────────────────
// Auth types
// ─────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;      // User ID
  orgId: string;    // Organization ID
  role: string;     // User role
  jti?: string;     // JWT ID (for revocation)
  iat?: number;
  exp?: number;
}

// ─────────────────────────────────────────────────────────────
// API response types
// ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  redis: 'ok' | 'error' | 'disabled';
  version: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Fastify module augmentation
// ─────────────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis | null;
    authenticate: (request: import('fastify').FastifyRequest) => Promise<void>;
    requireRole: (
      role: 'LEARNER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN'
    ) => (request: import('fastify').FastifyRequest) => Promise<void>;
    /**
     * Execute a callback within a Prisma transaction that first sets the
     * PostgreSQL session variable app.current_org_id for RLS enforcement.
     *
     * All route handlers that query tenant-scoped tables MUST use this helper.
     * It ensures set_config and the DB query run on the SAME connection.
     *
     * @example
     * const users = await fastify.withRls(request, (tx) =>
     *   tx.user.findMany({ where: { orgId: request.currentUser!.orgId } })
     * );
     */
    withRls: <T>(
      request: import('fastify').FastifyRequest,
      callback: (tx: PrismaClient) => Promise<T>
    ) => Promise<T>;
  }

  interface FastifyRequest {
    startTime?: number;
    /** Org ID extracted from Bearer JWT in onRequest hook — used by withRls() */
    rlsOrgId?: string;
    currentUser?: {
      id: string;
      orgId: string;
      email: string;
      role: string;
      status: string;
    };
  }
}
