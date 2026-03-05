# @connectsw/observability

Cross-product observability utilities for all ConnectSW products.

## What This Provides

| Export | Purpose |
|--------|---------|
| `observabilityPlugin` | Fastify plugin: correlation IDs + request metrics |
| `healthPlugin` | Fastify plugin: `/health` (liveness) + `/health/ready` (readiness with dependency checks) |
| `metricsPlugin` | Fastify plugin: `/internal/metrics` with p50/p95/p99 per route |
| `correlationPlugin` | Fastify plugin: `X-Request-ID` propagation |
| `aiInstrumentation` | AI call tracker: logs model, tokens, cost, latency per call |

## Installation

```bash
# From any product
npm install ../../packages/observability
# Or via workspace protocol in package.json:
"@connectsw/observability": "workspace:*"
```

## Usage

### Basic Setup (Fastify)

```typescript
import { observabilityPlugin, healthPlugin } from '@connectsw/observability/backend';
import { prisma } from './plugins/prisma';

// Register observability (correlation IDs + metrics)
await app.register(observabilityPlugin);

// Register health checks
await app.register(healthPlugin, {
  checks: {
    db: async () => { await prisma.$queryRaw`SELECT 1`; },
    redis: async () => { await redis.ping(); },
  },
});
```

**Endpoints added:**
- `GET /health` → `{ status: "ok" }` — liveness check
- `GET /health/ready` → `{ status: "ok"|"degraded", checks: {...} }` — readiness (503 if any check fails)
- `GET /internal/metrics` → per-route request counts, error rates, p50/p95/p99 latency

### AI Call Instrumentation

```typescript
import { aiInstrumentation } from '@connectsw/observability/backend';

async function classifyContent(text: string) {
  const tracked = aiInstrumentation.track({
    model: 'claude-sonnet-4-6',
    feature: 'content-classifier',
    product: 'ai-fluency',
    promptVersion: 'v2',
    logger: request.log,  // optional — uses console if omitted
  });

  const response = await anthropic.messages.create({ ... });

  tracked.end({
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
  });

  return response;
}
```

**Log output:**
```json
{
  "event": "ai_call",
  "model": "claude-sonnet-4-6",
  "feature": "content-classifier",
  "product": "ai-fluency",
  "promptVersion": "v2",
  "tokensIn": 850,
  "tokensOut": 120,
  "totalTokens": 970,
  "costUsd": "0.002985",
  "durationMs": 1240
}
```

### Correlation IDs

Every request automatically gets an `X-Request-ID` header (uses incoming header if present, generates UUID otherwise). All log entries within a request include `requestId` automatically.

## Adding to COMPONENT-REGISTRY.md

When using this package, the component registry entry is:

```
Source: packages/observability/
Package: @connectsw/observability/backend
Components: observabilityPlugin, healthPlugin, aiInstrumentation
```
