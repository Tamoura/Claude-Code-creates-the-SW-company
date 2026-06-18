/**
 * Plugin registration — wires the shared cross-cutting plugins onto the API.
 *
 * Order matters:
 *  1. `observabilityPlugin`  — correlation id + JSON route metrics.
 *  2. `prismaPlugin`         — Prisma client lifecycle (connect/disconnect),
 *                              decorates `app.prisma`.
 *  3. `prometheusPlugin`     — `GET /metrics` in Prometheus exposition format.
 *  4. `healthPlugin`         — `GET /health/live` + `GET /health/ready`;
 *                              readiness runs a real `SELECT 1` against the DB.
 *
 * All four are imported from shared packages (Article II) except the thin
 * `prometheusPlugin` adapter (see its file header for why).
 */
import type { FastifyInstance } from 'fastify';
import { observabilityPlugin, healthPlugin } from '@connectsw/observability/backend';
import prismaPlugin from '@connectsw/shared/plugins/prisma';
import prometheusPlugin from './prometheus.js';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(observabilityPlugin);
  await app.register(prismaPlugin);
  await app.register(prometheusPlugin);

  await app.register(healthPlugin, {
    path: '/health/live',
    readinessPath: '/health/ready',
    checks: {
      database: async () => {
        await app.prisma.$queryRaw`SELECT 1`;
      },
    },
  });
}
