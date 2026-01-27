# ADR-003: Backend Architecture & API Design

## Status
Accepted

## Context

Stablecoin Gateway needs a production backend to handle:
1. Merchant authentication and API key management
2. Payment session creation and management
3. Webhook configuration and delivery
4. Background jobs (blockchain monitoring, email sending)
5. Real-time status updates to frontend

Key decisions needed:
- **Backend framework?** (Fastify, Express, NestJS, tRPC?)
- **Database?** (PostgreSQL, MongoDB, MySQL?)
- **ORM?** (Prisma, TypeORM, Kysely?)
- **Job queue?** (BullMQ, Celery, AWS SQS?)
- **API style?** (REST, GraphQL, tRPC?)
- **Real-time updates?** (WebSocket, Server-Sent Events, polling?)

### Requirements from PRD
- NFR-003: API response time < 200ms (p95) for payment creation
- NFR-011: Rate limiting: 100 requests/minute per API key
- NFR-013: API uptime SLA of 99.9%
- FR-018: Webhook POST request on payment events with retry logic
- FR-022-025: Merchant dashboard (pagination, filtering, search, CSV export)

### Constraints
- Company standard: Fastify + Prisma + PostgreSQL
- TypeScript for type safety in payment logic
- Stateless API for horizontal scaling
- Low operational cost (0.5% fee margin)

---

## Decision

### 1. Backend Framework: **Fastify 4.x**

**Rationale**:
- **Company Standard**: Already established in company tech stack
- **Performance**: Fastest Node.js framework (65k req/sec vs. Express 34k req/sec)
- **TypeScript-First**: Excellent TypeScript support out of the box
- **Plugin Ecosystem**: Modular design, easy to extend
- **Developer Experience**: Great docs, active community

**Architecture**:
```typescript
// apps/api/src/server.ts
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip,
      }),
    },
  },
});

// Register plugins
await fastify.register(import('@fastify/cors'), { origin: process.env.FRONTEND_URL });
await fastify.register(import('@fastify/rate-limit'), { max: 100, timeWindow: 60000 });
await fastify.register(import('@fastify/jwt'), { secret: process.env.JWT_SECRET });
await fastify.register(import('./plugins/prisma'), { prisma });
await fastify.register(import('./plugins/auth'));

// Register routes
await fastify.register(import('./routes/v1/auth'), { prefix: '/v1/auth' });
await fastify.register(import('./routes/v1/payment-sessions'), { prefix: '/v1/payment-sessions' });
await fastify.register(import('./routes/v1/webhooks'), { prefix: '/v1/webhooks' });
await fastify.register(import('./routes/v1/api-keys'), { prefix: '/v1/api-keys' });

// Start server
await fastify.listen({ port: 5001, host: '0.0.0.0' });
```

**Trade-offs**:
- **Pro**: 2x faster than Express, critical for hitting < 200ms p95
- **Con**: Smaller ecosystem than Express (mitigated by mature plugin system)

---

### 2. Database: **PostgreSQL 15.x**

**Rationale**:
- **Company Standard**: Already established in company tech stack
- **ACID Compliance**: Critical for payment state transitions (prevent double-charges)
- **JSON Support**: Flexible metadata storage for payment details
- **Scalability**: Proven at massive scale (Instagram uses PostgreSQL)
- **Full-text Search**: Built-in support for payment description search
- **Foreign Keys**: Enforce referential integrity (payments belong to users)

**Schema Design Principles**:
- **Immutability**: Never update payment records, only append new records
- **Audit Trail**: Store who/when for every state change
- **Soft Deletes**: Add `deleted_at` column instead of DELETE
- **UTC Timestamps**: All times in UTC, convert in application layer
- **Indexed Lookups**: Index on frequently queried columns (user_id, status, created_at)

**Trade-offs**:
- **Pro**: Best choice for transactional data, ACID guarantees prevent payment bugs
- **Con**: Harder to scale horizontally than NoSQL (mitigated by read replicas + partitioning)

---

### 3. ORM: **Prisma 5.x**

**Rationale**:
- **Company Standard**: Already established in company tech stack
- **Type Safety**: Generated TypeScript types from schema, catch errors at compile-time
- **Developer Experience**: Best-in-class DX (migrations, studio GUI, excellent docs)
- **Query Performance**: Optimized queries, connection pooling
- **Migrations**: Version-controlled schema changes with `prisma migrate`

**Example Schema**:
```prisma
// prisma/schema.prisma

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  apiKeys           ApiKey[]
  paymentSessions   PaymentSession[]
  webhookEndpoints  WebhookEndpoint[]
}

model PaymentSession {
  id             String   @id @default(cuid()) @map("id") // ps_xxx
  userId         String
  amount         Decimal  @db.Decimal(10, 2) // USD (e.g., 100.00)
  currency       String   @default("USD")
  description    String?
  status         PaymentStatus @default(PENDING)
  network        String   @default("polygon") // "polygon" | "ethereum"
  token          String   @default("USDC")    // "USDC" | "USDT"

  // Blockchain data
  txHash         String?  @unique
  blockNumber    Int?
  confirmations  Int      @default(0)

  // Wallet addresses
  customerAddress  String?
  merchantAddress  String

  // Metadata
  metadata       Json?    // Flexible JSON field for custom data

  // Timestamps
  createdAt      DateTime @default(now())
  expiresAt      DateTime // Default: createdAt + 7 days
  completedAt    DateTime?

  // Relations
  user           User     @relation(fields: [userId], references: [id])
  webhookEvents  WebhookEvent[]
  refunds        Refund[]

  @@index([userId, status])
  @@index([status, createdAt])
  @@map("payment_sessions")
}

enum PaymentStatus {
  PENDING      // Created, awaiting customer payment
  CONFIRMING   // Transaction detected, waiting for confirmations
  COMPLETED    // Confirmed on blockchain
  FAILED       // Transaction reverted or expired
  REFUNDED     // Refunded to customer
}

model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  name        String   // User-friendly name ("Production API Key")
  keyHash     String   @unique // SHA-256 hash of actual key
  keyPrefix   String   // First 8 chars for display (sk_live_abc123...)
  permissions Json     // { "read": true, "write": true, "refund": false }

  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("api_keys")
}

model WebhookEndpoint {
  id          String   @id @default(cuid())
  userId      String
  url         String   // https://merchant.com/webhooks/stablecoin-gateway
  secret      String   // Used to sign webhook payloads
  events      String[] // ["payment.completed", "payment.refunded"]
  enabled     Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries  WebhookDelivery[]

  @@index([userId])
  @@map("webhook_endpoints")
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  endpointId  String
  eventType   String   // "payment.completed"
  payload     Json

  attempts    Int      @default(0)
  status      WebhookStatus @default(PENDING)

  lastAttemptAt DateTime?
  nextAttemptAt DateTime?
  succeededAt   DateTime?

  responseCode   Int?
  responseBody   String?
  errorMessage   String?

  endpoint    WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)

  @@index([status, nextAttemptAt])
  @@map("webhook_deliveries")
}

enum WebhookStatus {
  PENDING
  DELIVERING
  SUCCEEDED
  FAILED
}

model Refund {
  id               String   @id @default(cuid())
  paymentSessionId String
  amount           Decimal  @db.Decimal(10, 2)
  reason           String?
  status           RefundStatus @default(PENDING)

  // Blockchain data
  txHash           String?  @unique
  blockNumber      Int?

  createdAt        DateTime @default(now())
  completedAt      DateTime?

  paymentSession   PaymentSession @relation(fields: [paymentSessionId], references: [id])

  @@index([paymentSessionId])
  @@map("refunds")
}

enum RefundStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

**Trade-offs**:
- **Pro**: Type-safe queries prevent runtime errors, migrations are version-controlled
- **Con**: Learning curve for developers new to Prisma (mitigated by excellent docs)

---

### 4. Job Queue: **BullMQ 5.x (Redis-backed)**

**Rationale**:
- **Reliability**: Redis persistence ensures jobs aren't lost on crash
- **Retry Logic**: Built-in exponential backoff for failed jobs
- **Priority Queues**: Prioritize urgent jobs (payment confirmations > emails)
- **Concurrency Control**: Limit concurrent jobs to prevent overload
- **Monitoring**: BullBoard UI for queue visualization
- **Mature**: Proven in production (used by large companies)

**Queue Design**:
```typescript
// apps/api/src/workers/queues.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Queue 1: Blockchain monitoring (high priority)
export const blockchainQueue = new Queue('blockchain-monitor', {
  connection: redis,
  defaultJobOptions: {
    attempts: 100, // Retry up to 100 times (5s × 100 = 8 minutes)
    backoff: { type: 'fixed', delay: 5000 }, // 5 seconds between retries
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 5000, // Keep last 5000 failed jobs
  },
});

// Queue 2: Webhook delivery (medium priority)
export const webhookQueue = new Queue('webhook-delivery', {
  connection: redis,
  defaultJobOptions: {
    attempts: 4, // Retry 4 times (0s, 10s, 60s, 600s)
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// Queue 3: Email sending (low priority)
export const emailQueue = new Queue('email-sender', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
  },
});

// Worker: Blockchain Monitor
const blockchainWorker = new Worker('blockchain-monitor', async (job) => {
  const { paymentSessionId, txHash, network } = job.data;
  const provider = await getProvider(network);

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error('Transaction not found'); // Retry

  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber;
  const threshold = network === 'ethereum' ? 3 : 64;

  if (confirmations < threshold) {
    throw new Error(`Only ${confirmations}/${threshold} confirmations`); // Retry
  }

  // Payment confirmed!
  await prisma.paymentSession.update({
    where: { id: paymentSessionId },
    data: { status: 'COMPLETED', completedAt: new Date(), confirmations },
  });

  // Trigger webhook
  await webhookQueue.add('deliver', {
    paymentSessionId,
    eventType: 'payment.completed',
  });

  // Send email
  await emailQueue.add('send', {
    to: user.email,
    template: 'payment-completed',
    data: { amount, description },
  });
}, {
  connection: redis,
  concurrency: 50, // Process 50 payments in parallel
});
```

**Trade-offs**:
- **Pro**: Reliable async processing, handles failures gracefully
- **Con**: Redis dependency (mitigated by Redis Cluster for HA)

---

### 5. API Style: **REST (JSON over HTTPS)**

**Rationale**:
- **Simplicity**: Easy to understand, curl-friendly, language-agnostic
- **Stripe Compatibility**: Developers expect REST for payment APIs (Stripe uses REST)
- **Caching**: HTTP caching headers work out of the box
- **Standard**: Every language has HTTP client libraries

**API Design Principles**:
```
POST   /v1/payment-sessions          # Create payment session
GET    /v1/payment-sessions/:id      # Get payment status
GET    /v1/payment-sessions          # List payments (paginated)
POST   /v1/payment-sessions/:id/refund  # Issue refund

POST   /v1/webhooks                  # Create webhook endpoint
GET    /v1/webhooks                  # List webhooks
PATCH  /v1/webhooks/:id              # Update webhook
DELETE /v1/webhooks/:id              # Delete webhook

POST   /v1/api-keys                  # Create API key
GET    /v1/api-keys                  # List API keys
DELETE /v1/api-keys/:id              # Revoke API key

POST   /v1/auth/signup               # User signup
POST   /v1/auth/login                # User login
POST   /v1/auth/refresh              # Refresh access token
```

**Error Response Format** (RFC 7807 Problem Details):
```json
{
  "type": "https://gateway.io/errors/insufficient-balance",
  "title": "Insufficient Balance",
  "status": 400,
  "detail": "The customer's wallet has insufficient USDC balance to complete this payment.",
  "instance": "/v1/payment-sessions/ps_abc123",
  "request_id": "req_xyz789"
}
```

**Pagination**:
```json
GET /v1/payment-sessions?limit=50&offset=0&status=completed

Response:
{
  "data": [ /* 50 payment sessions */ ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1234,
    "has_more": true
  }
}
```

**Alternatives Considered**:
- **GraphQL**: Too complex for payment API, overkill for simple CRUD operations
- **tRPC**: Excellent for monorepos, but requires TypeScript client (limits 3rd-party integrations)
- **gRPC**: High performance, but poor browser support and steep learning curve

**Why REST**: Stripe uses REST, developers expect it, simple to implement and consume.

---

### 6. Real-time Updates: **Server-Sent Events (SSE)**

**Rationale**:
- **Simplicity**: Easier than WebSocket, built on HTTP
- **One-way Communication**: Perfect for status updates (server → client)
- **Auto-reconnect**: Browser handles reconnection automatically
- **Firewall-friendly**: Works over HTTP (no special ports)

**Implementation**:
```typescript
// apps/api/src/routes/v1/payment-sessions.ts
fastify.get('/v1/payment-sessions/:id/events', async (req, reply) => {
  const { id } = req.params;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial status
  const payment = await prisma.paymentSession.findUnique({ where: { id } });
  reply.raw.write(`data: ${JSON.stringify(payment)}\n\n`);

  // Subscribe to Redis pub/sub for updates
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`payment:${id}`);

  subscriber.on('message', (channel, message) => {
    reply.raw.write(`data: ${message}\n\n`);
  });

  // Clean up on disconnect
  req.raw.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});
```

**Frontend Usage**:
```typescript
// apps/web/hooks/usePaymentStatus.ts
import { useEffect, useState } from 'react';

export function usePaymentStatus(paymentId: string) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/v1/payment-sessions/${paymentId}/events`);

    eventSource.onmessage = (event) => {
      const payment = JSON.parse(event.data);
      setStatus(payment.status);
    };

    return () => eventSource.close();
  }, [paymentId]);

  return status;
}
```

**Trade-offs**:
- **Pro**: Simple, works everywhere, auto-reconnect
- **Con**: One-way only (can't send from client, but we don't need to)

**Alternative Considered**: WebSocket
- **Why not**: More complex, requires socket.io or ws library, bi-directional communication not needed

---

### 7. Webhook Delivery System

**Design**:
```typescript
// apps/api/src/workers/webhook-delivery.ts
import { Worker } from 'bullmq';
import crypto from 'crypto';
import axios from 'axios';

const webhookWorker = new Worker('webhook-delivery', async (job) => {
  const { endpointId, eventType, payload } = job.data;

  // Get webhook endpoint config
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint || !endpoint.enabled) {
    return; // Skip disabled webhooks
  }

  // Sign payload with HMAC-SHA256
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(signedPayload)
    .digest('hex');

  // Create delivery record
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId,
      eventType,
      payload,
      status: 'DELIVERING',
      attempts: job.attemptsMade + 1,
      lastAttemptAt: new Date(),
    },
  });

  try {
    // Deliver webhook
    const response = await axios.post(endpoint.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Id': delivery.id,
      },
      timeout: 10000, // 10 second timeout
    });

    // Success!
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'SUCCEEDED',
        succeededAt: new Date(),
        responseCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000), // Truncate
      },
    });
  } catch (error) {
    // Failed - will retry via BullMQ
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: job.attemptsMade >= 3 ? 'FAILED' : 'PENDING',
        responseCode: error.response?.status,
        errorMessage: error.message,
        nextAttemptAt: new Date(Date.now() + getRetryDelay(job.attemptsMade)),
      },
    });

    throw error; // Trigger BullMQ retry
  }
}, {
  connection: redis,
  concurrency: 20,
});

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 10s, 60s, 600s (10 min)
  return Math.min(10000 * Math.pow(6, attempt), 600000);
}
```

**Webhook Verification** (Merchant Side):
```javascript
// Merchant's server (example in Node.js)
const crypto = require('crypto');

app.post('/webhooks/stablecoin-gateway', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const payload = JSON.stringify(req.body);

  // Verify timestamp (prevent replay attacks)
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return res.status(400).send('Timestamp too old');
  }

  // Verify signature
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  // Webhook verified! Process event
  const { type, data } = req.body;
  if (type === 'payment.completed') {
    fulfillOrder(data.payment_session_id);
  }

  res.status(200).send('OK');
});
```

---

## Consequences

### Positive
1. **Performance**: Fastify is 2x faster than Express, helps hit < 200ms p95 target
2. **Type Safety**: Prisma + TypeScript prevent payment bugs at compile-time
3. **Reliability**: BullMQ ensures webhooks retry on failure, no lost events
4. **Developer Experience**: REST API matches Stripe's pattern (familiar to developers)
5. **Real-time Updates**: SSE provides live status updates without WebSocket complexity
6. **Scalability**: Stateless API scales horizontally, PostgreSQL handles 10M+ rows

### Negative
1. **Redis Dependency**: BullMQ requires Redis (mitigation: Redis Cluster for HA)
2. **Database Lock-in**: PostgreSQL-specific features (mitigated by Prisma abstraction)
3. **SSE Browser Support**: Not supported in IE11 (acceptable, IE11 < 0.5% market share)
4. **Webhook Delivery Cost**: Each webhook is HTTP request (mitigated by batching in future)

### Neutral
1. **REST vs. GraphQL**: REST is simpler but less flexible (good for payment API)
2. **Prisma Learning Curve**: Takes 1-2 days to learn (mitigated by excellent docs)

---

## Alternatives Considered

### Alternative 1: Express Instead of Fastify

**Pros**:
- Larger ecosystem, more examples
- More developers familiar with it

**Cons**:
- 50% slower (34k req/sec vs. 65k req/sec)
- Poor TypeScript support
- Less modern API design

**Why Rejected**: Performance matters for < 200ms p95 target, Fastify's TypeScript support is critical

---

### Alternative 2: MongoDB Instead of PostgreSQL

**Pros**:
- Easier horizontal scaling (sharding)
- Flexible schema (no migrations)

**Cons**:
- No ACID transactions (risky for payment state changes)
- No foreign keys (easier to create orphaned records)
- Eventual consistency (can't guarantee payment state is correct)

**Why Rejected**: ACID transactions are non-negotiable for payment systems

---

### Alternative 3: GraphQL Instead of REST

**Pros**:
- Flexible queries (clients request exactly what they need)
- Introspection (auto-generated docs)
- Single endpoint

**Cons**:
- Overkill for CRUD operations
- Harder to cache (no HTTP caching)
- Steeper learning curve for merchants
- Stripe uses REST (developer expectations)

**Why Rejected**: REST is simpler and matches Stripe's API pattern

---

### Alternative 4: WebSocket Instead of SSE

**Pros**:
- Bi-directional communication
- Lower latency (persistent connection)

**Cons**:
- More complex (requires socket.io or ws library)
- No auto-reconnect (have to implement manually)
- Firewall issues (non-HTTP port)
- Bi-directional not needed (we only send updates to client)

**Why Rejected**: SSE is simpler and sufficient for one-way status updates

---

## References

- [Fastify Documentation](https://fastify.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Stripe API Design](https://stripe.com/docs/api)

---

**Date**: 2026-01-27
**Author**: Claude Architect
**Reviewers**: CEO (pending)
**Status**: Accepted
