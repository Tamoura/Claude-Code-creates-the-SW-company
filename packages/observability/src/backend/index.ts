/**
 * @connectsw/observability/backend
 *
 * Cross-product backend observability:
 * - Structured request logging (method, route, status, duration, request ID)
 * - Performance metrics (p50/p95/p99 latency, error rate, request rate)
 * - Health check utilities (dependency liveness, readiness)
 * - Correlation ID propagation (X-Request-ID header)
 * - AI call instrumentation (model, tokens_in, tokens_out, latency, cost_usd)
 *
 * Usage:
 *   import { observabilityPlugin, healthPlugin, aiInstrumentation } from '@connectsw/observability/backend';
 *
 *   app.register(observabilityPlugin);
 *   app.register(healthPlugin, { checks: { db: () => prisma.$queryRaw`SELECT 1` } });
 *
 *   // Instrument an AI call
 *   const tracked = aiInstrumentation.track({ model: 'claude-sonnet-4-6', feature: 'classify', product: 'ai-fluency' });
 *   const result = await llm.call(...);
 *   tracked.end({ tokensIn: result.usage.input_tokens, tokensOut: result.usage.output_tokens });
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthCheck {
  name: string;
  check: () => Promise<void>;
}

export interface HealthPluginOptions {
  checks: Record<string, () => Promise<void>>;
  path?: string;
  readinessPath?: string;
}

export interface AiCallMetadata {
  model: string;
  feature: string;
  product: string;
  promptVersion?: string;
}

export interface AiCallResult {
  tokensIn: number;
  tokensOut: number;
  /** Cost in USD. Provide if known; otherwise computed from model rates. */
  costUsd?: number;
}

// Model rates (USD per 1M tokens) — update as pricing changes
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':          { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':        { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00 },
  'gpt-4o':                   { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':              { input: 0.15,  output: 0.60 },
};

// ---------------------------------------------------------------------------
// Correlation ID Plugin
// ---------------------------------------------------------------------------

const correlationPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const existing = request.headers['x-request-id'];
    (request as any).requestId = existing ?? crypto.randomUUID();
    request.log = request.log.child({ requestId: (request as any).requestId });
  });

  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Request-ID', (request as any).requestId ?? '');
  });
};

// ---------------------------------------------------------------------------
// Request Metrics Plugin
// ---------------------------------------------------------------------------

interface RouteMetrics {
  count: number;
  errorCount: number;
  totalMs: number;
  latencies: number[];
}

const routeMetrics = new Map<string, RouteMetrics>();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const metricsPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `${request.method} ${request.routeOptions?.url ?? request.url}`;
    const duration = reply.elapsedTime;

    if (!routeMetrics.has(key)) {
      routeMetrics.set(key, { count: 0, errorCount: 0, totalMs: 0, latencies: [] });
    }

    const m = routeMetrics.get(key)!;
    m.count++;
    m.totalMs += duration;
    m.latencies.push(duration);
    if (reply.statusCode >= 500) m.errorCount++;

    // Keep only last 1000 latencies per route to bound memory
    if (m.latencies.length > 1000) m.latencies.shift();

    request.log.info({
      event: 'request_complete',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: Math.round(duration),
    });
  });

  // Metrics endpoint
  app.get('/internal/metrics', async () => {
    const result: Record<string, object> = {};
    for (const [route, m] of routeMetrics.entries()) {
      const sorted = [...m.latencies].sort((a, b) => a - b);
      result[route] = {
        requests: m.count,
        errors: m.errorCount,
        errorRate: m.count > 0 ? (m.errorCount / m.count).toFixed(4) : '0',
        avgMs: m.count > 0 ? Math.round(m.totalMs / m.count) : 0,
        p50Ms: Math.round(percentile(sorted, 50)),
        p95Ms: Math.round(percentile(sorted, 95)),
        p99Ms: Math.round(percentile(sorted, 99)),
      };
    }
    return result;
  });
};

// ---------------------------------------------------------------------------
// Health Check Plugin
// ---------------------------------------------------------------------------

const healthPlugin = fp(async (app, opts: HealthPluginOptions) => {
  const livenessPath = opts.path ?? '/health';
  const readinessPath = opts.readinessPath ?? '/health/ready';

  // Liveness: is the process alive?
  app.get(livenessPath, async (_req, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness: are all dependencies healthy?
  app.get(readinessPath, async (_req, reply) => {
    const results: Record<string, string> = {};
    let allHealthy = true;

    await Promise.all(
      Object.entries(opts.checks).map(async ([name, check]) => {
        try {
          await check();
          results[name] = 'ok';
        } catch (err) {
          results[name] = err instanceof Error ? err.message : 'unhealthy';
          allHealthy = false;
        }
      })
    );

    const statusCode = allHealthy ? 200 : 503;
    reply.code(statusCode).send({
      status: allHealthy ? 'ok' : 'degraded',
      checks: results,
      timestamp: new Date().toISOString(),
    });
  });
}, { name: 'connectsw-health' });

// ---------------------------------------------------------------------------
// AI Call Instrumentation
// ---------------------------------------------------------------------------

interface TrackedCall {
  end(result: AiCallResult): void;
}

function computeCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const rates = MODEL_RATES[model];
  if (!rates) return 0;
  return (tokensIn / 1_000_000) * rates.input + (tokensOut / 1_000_000) * rates.output;
}

const aiInstrumentation = {
  track(meta: AiCallMetadata & { logger?: { info: (obj: object) => void } }): TrackedCall {
    const startMs = Date.now();
    return {
      end(result: AiCallResult) {
        const durationMs = Date.now() - startMs;
        const costUsd = result.costUsd ?? computeCostUsd(meta.model, result.tokensIn, result.tokensOut);
        const log = meta.logger ?? console;
        log.info({
          event: 'ai_call',
          model: meta.model,
          feature: meta.feature,
          product: meta.product,
          promptVersion: meta.promptVersion ?? 'v1',
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          totalTokens: result.tokensIn + result.tokensOut,
          costUsd: costUsd.toFixed(6),
          durationMs,
        });
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Combined Observability Plugin
// ---------------------------------------------------------------------------

const observabilityPlugin = fp(
  async (app) => {
    await app.register(correlationPlugin);
    await app.register(metricsPlugin);
  },
  { name: 'connectsw-observability' }
);

export { observabilityPlugin, healthPlugin, metricsPlugin, correlationPlugin, aiInstrumentation };
export type { AiCallMetadata, AiCallResult, HealthPluginOptions };
