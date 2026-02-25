# ConnectSW Component Registry

> Before building anything, check this registry first. Reuse > rebuild.

Last updated: 2026-02-14

## Shared Packages

All reusable SaaS components are extracted to shared packages in `packages/`. **Always import from these packages instead of copying from another product.**

### `@connectsw/shared` — Core Utilities
Location: `packages/shared/`

- Logger (`@connectsw/shared/utils/logger`) — Structured logging with PII redaction
- Crypto Utils (`@connectsw/shared/utils/crypto`) — Password hashing, API key HMAC, webhook signatures
- Prisma Plugin (`@connectsw/shared/plugins/prisma`) — PrismaClient lifecycle with pool sizing
- Redis Plugin (`@connectsw/shared/plugins/redis`) — Redis connection with TLS, retry, graceful degradation

### `@connectsw/auth` — Authentication & Authorization (NEW)
Location: `packages/auth/`

**Backend** (`@connectsw/auth/backend`):
- **Auth Plugin** — JWT + API key dual authentication, JTI blacklist circuit breaker, configurable permissions, admin guard
- **Auth Routes** — Signup, login, refresh token rotation, logout (with JTI revocation), change password, forgot/reset password, session management
- **API Key Routes** — CRUD for API keys with configurable default permissions
- **Validation** — Zod schemas for all auth endpoints
- **AppError** — Typed error class with RFC 7807 JSON serialization

**Frontend** (`@connectsw/auth/frontend`):
- **useAuth hook** — Auth state management with login/logout/signup callbacks
- **ProtectedRoute** — Route guard with configurable login redirect
- **TokenManager** — XSS-safe in-memory JWT storage (never uses localStorage)
- **createAuthApiClient** — Pre-built auth API client (login, signup, logout, refresh, password reset, sessions)

**Prisma** (`@connectsw/auth/prisma`):
- Partial schema: User, RefreshToken, ApiKey, AuditLog models — copy into your product's schema.prisma

**Usage example (backend):**
```typescript
import { authPlugin, authRoutes, apiKeyRoutes } from '@connectsw/auth/backend';

app.register(authPlugin, { permissions: ['read', 'write', 'admin'] });
app.register(authRoutes, { prefix: '/v1/auth' });
app.register(apiKeyRoutes, { prefix: '/v1/api-keys', defaultPermissions: { read: true, write: true } });
```

**Usage example (frontend):**
```typescript
import { useAuth, ProtectedRoute, createAuthApiClient, TokenManager } from '@connectsw/auth/frontend';

const apiClient = createAuthApiClient({ baseUrl: 'http://localhost:5001' });
const { user, login, logout } = useAuth({
  loginFn: async (email, pw) => { const r = await apiClient.login(email, pw); return r; },
  logoutFn: () => apiClient.logout(),
});
```

### `@connectsw/ui` — Shared UI Component Library (NEW)
Location: `packages/ui/`

**Components** (`@connectsw/ui/components`):
- **Button** — Variants: primary, secondary, outline, ghost, danger. Sizes: sm, md, lg
- **Card** — Dark mode support. Padding: none, sm, md, lg
- **Input** — Label, error, helper text. Accessible with aria attributes
- **Badge** — Variants: default, success, warning, info, danger
- **Skeleton** — Variants: text, circular, rectangular, rounded. Multi-line support. SkeletonCard preset
- **StatCard** — KPI display with title, value, change indicator, icon
- **DataTable** — Generic typed table with columns config, row click, loading/empty states
- **ErrorBoundary** — React class component with customizable fallback and error callback
- **ThemeToggle** — Dark/light mode toggle with sun/moon icons

**Layout** (`@connectsw/ui/layout`):
- **Sidebar** — Configurable nav sections, brand slot, footer slot, mobile responsive with backdrop
- **DashboardLayout** — Full dashboard shell with sidebar, header, skip-to-content link, mobile hamburger

**Hooks** (`@connectsw/ui/hooks`):
- **useTheme** — Dark/light mode with localStorage persistence, system preference fallback, configurable storage key

**Usage example:**
```typescript
import { Button, Card, Input, Badge, StatCard, DataTable, ErrorBoundary } from '@connectsw/ui/components';
import { DashboardLayout, Sidebar } from '@connectsw/ui/layout';
import { useTheme } from '@connectsw/ui/hooks';
```

### `@connectsw/webhooks` — Webhook Delivery System (NEW)
Location: `packages/webhooks/`

**Backend** (`@connectsw/webhooks/backend`):
- **WebhookDeliveryService** — Queue webhooks for delivery, process queue with SELECT FOR UPDATE SKIP LOCKED, idempotent via composite unique key
- **WebhookDeliveryExecutorService** — Individual delivery with HMAC signing, SSRF-safe URL validation, AES-256-GCM secret decryption, TTL secret cache, exponential backoff retries with jitter
- **WebhookCircuitBreakerService** — Redis-based circuit breaker with atomic Lua scripts, configurable threshold/cooldown
- **WebhookSignatureService** — HMAC-SHA256 signing/verification with timing-safe comparison, replay attack prevention
- **Webhook Routes** — Full CRUD + secret rotation, HTTPS enforcement, paginated listing
- **Webhook Worker Route** — Internal cron endpoint with timing-safe API key auth
- **Encryption Utils** — AES-256-GCM encrypt/decrypt for secrets at rest, production enforcement
- **URL Validator** — SSRF protection with DNS resolution, private IP blocking

**Frontend** (`@connectsw/webhooks/frontend`):
- **useWebhooks hook** — CRUD operations, secret rotation, loading/error state

**Prisma** (`@connectsw/webhooks/prisma`):
- WebhookEndpoint, WebhookDelivery models with idempotency constraint, WebhookStatus enum

**Usage example (backend):**
```typescript
import { webhookRoutes, webhookWorkerRoutes, WebhookDeliveryService, initializeEncryption } from '@connectsw/webhooks/backend';

initializeEncryption(); // reads WEBHOOK_ENCRYPTION_KEY
app.register(webhookRoutes, { prefix: '/v1/webhooks', validEvents: ['payment.completed', 'refund.created'] });
app.register(webhookWorkerRoutes, { prefix: '/internal' });

// Queue a webhook
const delivery = new WebhookDeliveryService(prisma, redis);
await delivery.queueWebhook(userId, 'payment.completed', paymentData);
```

### `@connectsw/notifications` — Email & In-App Notifications (NEW)
Location: `packages/notifications/`

**Backend** (`@connectsw/notifications/backend`):
- **EmailService** — Pluggable email with SMTP or console fallback, notification preferences CRUD
- **NotificationService** — In-app notification CRUD, read tracking, unread counts
- **Email Plugin** — Fastify plugin decorating `fastify.email` with send()
- **Notification Routes** — List, mark read, mark all read, delete, unread count
- **Preferences Routes** — GET/PATCH with auto-created defaults, configurable Zod schema
- **Email Templates** — HTML wrapper, detail rows, escaping utilities

**Frontend** (`@connectsw/notifications/frontend`):
- **useNotifications hook** — Load, mark read, mark all read, delete, unread count
- **useNotificationPreferences hook** — Load, toggle, bulk update with optimistic UI
- **NotificationBell** — Bell icon with unread badge (99+ overflow)
- **Toggle** — Switch component for notification preference settings

**Prisma** (`@connectsw/notifications/prisma`):
- Notification model (type enum, read tracking), NotificationPreference model

**Usage example:**
```typescript
// Backend
import { emailPlugin, notificationRoutes, preferencesRoutes, NotificationService } from '@connectsw/notifications/backend';

app.register(emailPlugin, { smtp: { host, port, user, pass } });
app.register(notificationRoutes, { prefix: '/v1/notifications' });
app.register(preferencesRoutes, { prefix: '/v1/notifications' });

const notifService = new NotificationService(prisma);
await notifService.create({ userId, type: 'SUCCESS', title: 'Payment received', message: '...' });

// Frontend
import { useNotifications, NotificationBell, Toggle } from '@connectsw/notifications/frontend';
```

### `@connectsw/audit` — Audit Logging (NEW)
Location: `packages/audit/`

**Backend** (`@connectsw/audit/backend`):
- **AuditLogService** — DB persistence with in-memory ring buffer fallback (10k entries), sensitive field redaction, fire-and-forget, queryable with filters + pagination
- **createAuditHook** — Fastify onResponse hook with configurable actor/action/resource extractors, auto-captures IP and User-Agent
- **Audit Routes** — Admin-only query endpoint with date range/actor/action filters, stats endpoint

**Prisma** (`@connectsw/audit/prisma`):
- AuditLog model (standalone, no relations) with indexes on actor, action, resourceType, timestamp

**Usage example:**
```typescript
import { AuditLogService, createAuditHook, auditRoutes } from '@connectsw/audit/backend';

const audit = new AuditLogService(prisma);
app.addHook('onResponse', createAuditHook({ auditService: audit }));
app.register(auditRoutes, { prefix: '/v1/audit-logs', auditService: audit });
```

### `@connectsw/billing` — Subscriptions & Tier Enforcement (NEW)
Location: `packages/billing/`

**Backend** (`@connectsw/billing/backend`):
- **SubscriptionService** — Plan management, feature access checks (boolean + numeric), plan changes, cancellation
- **UsageService** — Redis-backed counters with DB sync, per-feature per-period metering, limit checking
- **requireFeature()** — Fastify preHandler: 403 if plan doesn't include feature
- **requireUsageLimit()** — Fastify preHandler: 429 if usage exceeds limit, auto-increments counter
- **Subscription Routes** — Get current plan, list plans, change plan, cancel, usage dashboard

**Frontend** (`@connectsw/billing/frontend`):
- **useSubscription hook** — Load subscription + plans + usage, change plan, cancel
- **PricingCard** — Pricing card with feature list, monthly/annual toggle, "Most Popular" badge
- **UsageBar** — Progress bar with warning (80%) and danger (95%) thresholds

**Prisma** (`@connectsw/billing/prisma`):
- Subscription model (tier enum, status enum, external payment ID, billing period)
- UsageRecord model (per-feature per-period counters)

**Usage example:**
```typescript
import { SubscriptionService, requireFeature, subscriptionRoutes } from '@connectsw/billing/backend';
import { useSubscription, PricingCard, UsageBar } from '@connectsw/billing/frontend';
```

### `@connectsw/saas-kit` — Product Scaffold Generator (NEW)
Location: `packages/saas-kit/`

**CLI** (`connectsw-create`):
- Full SaaS product scaffold from a single command
- Configurable features: auth, billing, webhooks, notifications, audit
- Auto-generates Fastify backend + React/Vite frontend + Prisma schema + Docker Compose
- Kebab-case product names with automatic PascalCase/camelCase/UPPER_SNAKE derivatives
- Port configuration for API (5000-5099) and Web (3100-3199) ranges
- Template interpolation with `{{key}}` values and `{{#if feature.X}}` conditionals

**Generator API** (`@connectsw/saas-kit`):
- `generateProduct(config, outDir)` — Programmatic scaffold generation
- `buildContext(config)` — Build template context from ProductConfig
- `interpolate(template, ctx)` — Template interpolation engine
- Utility converters: `toPascalCase`, `toCamelCase`, `toUpperSnake`

**Templates generated:**
- **API**: Fastify app (app.ts, index.ts), Prisma/Redis plugins, health route, Prisma schema (with conditional models per feature), Jest config, ESLint config
- **Web**: React app (App.tsx, main.tsx), Vite config with API proxy, Tailwind CSS setup, Dashboard layout, Login page (when auth enabled), useApi hook
- **Root**: package.json (dev scripts), docker-compose.yml (Postgres + Redis), .env.example, README.md, docs/ scaffolding

**Usage (CLI):**
```bash
connectsw-create my-product \
  --api-port 5010 --web-port 3110 \
  --all-features \
  --description "My awesome SaaS product"
```

**Usage (programmatic):**
```typescript
import { generateProduct } from '@connectsw/saas-kit';

const files = generateProduct({
  name: 'my-product',
  displayName: 'My Product',
  description: 'A new SaaS product',
  apiPort: 5010,
  webPort: 3110,
  dbName: 'my_product_db',
  features: { auth: true, billing: true, webhooks: false, notifications: true, audit: true },
}, '/path/to/products/my-product');
```

### `@connectsw/huggingface` — HuggingFace AI/ML Integration (NEW)
Location: `packages/huggingface/`

**InferenceClient** (`@connectsw/huggingface/clients/inference`):
- Text Generation — Run LLMs (Llama, Mistral, etc.)
- Embeddings — Generate vector embeddings for search/recommendations
- Text Classification — Sentiment analysis, topic classification
- Summarization — Summarize long text
- Question Answering — Extract answers from context
- Image Classification — Classify images
- Text to Image — Generate images from prompts (Stable Diffusion, etc.)
- Sentence Similarity — Compare sentence semantics
- Token Classification (NER) — Named entity recognition
- Zero-Shot Classification — Classify without training data

**HubClient** (`@connectsw/huggingface/clients/hub`):
- Search models/datasets with filters (author, task, library, sort)
- Get model/dataset details and file listings
- Trending models/datasets, models by task
- Download files from model/dataset repos

**DatasetLoader** (`@connectsw/huggingface/utils/datasets`):
- Get dataset info and splits
- Fetch rows with pagination
- Search within datasets
- Get Parquet file URLs for direct access
- Async generator for batch processing (`iterateRows()`)

**Fastify Plugin** (`@connectsw/huggingface/plugins/huggingface`):
- Registers `fastify.hf.inference`, `fastify.hf.hub`, `fastify.hf.datasets`
- Auto-reads `HUGGINGFACE_API_KEY` or `HF_API_KEY` from env
- Configurable timeout, base URLs

**Usage example (Fastify plugin):**
```typescript
import { huggingfacePlugin } from '@connectsw/huggingface';

app.register(huggingfacePlugin);

// In routes:
const result = await fastify.hf.inference.textGeneration({
  model: 'meta-llama/Llama-3.1-8B-Instruct',
  inputs: 'Explain quantum computing:',
  parameters: { max_new_tokens: 200 },
});

const models = await fastify.hf.hub.searchModels({ pipeline_tag: 'text-generation', limit: 10 });

for await (const batch of fastify.hf.datasets.iterateRows('imdb', { batchSize: 100 })) {
  // process batch
}
```

---

## How to Use This Registry

- **Agents**: Read this file before starting any backend, frontend, or infrastructure work.
- **When adding a new component**: Update this registry with source path, maturity, and dependencies.
- **When a component is extracted to a shared package**: Update the source path to the package location.
- **Paths are relative to**: `products/` directory root.

---

## "I Need To..." Quick Reference

| I need...                  | Use these components                                                           |
|----------------------------|-------------------------------------------------------------------------------|
| Auth (JWT + API key)       | Auth Plugin + useAuth hook + TokenManager + ProtectedRoute                    |
| API keys                   | Crypto Utils (hashApiKey, generateApiKey) + API Key routes + useApiKeys hook  |
| Webhooks                   | Webhook Delivery Service + Circuit Breaker + Crypto Utils (signWebhookPayload)|
| A data table               | TransactionsTable component (paginated, sortable)                             |
| Billing / Stripe           | Stripe Plugin (see stablecoin-gateway patterns)                              |
| Real-time updates (SSE)    | SSE pattern (api-client.createEventSource) + TokenManager                     |
| Rate limiting              | Redis Rate Limit Store + Redis Plugin                                         |
| Encryption at rest         | Encryption Utils (AES-256-GCM)                                               |
| Structured logging         | Logger + Observability Plugin                                                 |
| Error handling             | AppError (stablecoin-gateway) + validation helpers                            |
| Pagination                 | listQuerySchemas (stablecoin-gateway)                                         |
| Audit trail                | Audit Log Service (DB-backed + in-memory fallback)                            |
| Email notifications        | Email Service (HTML templates, XSS-safe)                                      |
| Dark/light theme           | useTheme hook + ThemeToggle component                                         |
| Docker (production)        | Dockerfile (multi-stage, non-root, dumb-init) + docker-compose.yml            |
| CI/CD                      | GitHub Actions quality gate workflow (test + lint + security + frontend)       |
| E2E tests                  | Playwright Config + Auth Fixture (rate-limit-aware)                           |
| DB connection              | Prisma Plugin (pool sizing, graceful shutdown)                                |
| Redis connection           | Redis Plugin (TLS, graceful degradation, health monitoring)                   |
| Request metrics            | Observability Plugin (p50/p95/p99, error rate, correlation IDs)               |
| KPI display card           | StatCard component                                                            |
| Navigation sidebar         | Sidebar component (role-aware, admin sections)                                |
| Error boundary             | ErrorBoundary component (React class component with fallback UI)              |
| Route protection           | ProtectedRoute component (token-based redirect)                               |
| A/B testing                | Experiment Assignment (deterministic hash) + Statistics (z-test, Wilson CI)   |
| Real-time counters         | Redis Counters (pipeline-based daily counters with TTL)                       |
| Embeddable JS SDK          | SDK pattern (IIFE bundle via esbuild, auto-init from script attributes)       |
| New SaaS product scaffold  | `@connectsw/saas-kit` (CLI: `connectsw-create`, API: `generateProduct()`)    |
| AI text generation         | `@connectsw/huggingface` InferenceClient.textGeneration()                    |
| Embeddings / vectors       | `@connectsw/huggingface` InferenceClient.embeddings()                        |
| Text classification / NLP  | `@connectsw/huggingface` InferenceClient (classification, NER, Q&A, etc.)    |
| Image generation           | `@connectsw/huggingface` InferenceClient.textToImage()                       |
| Browse HF models/datasets  | `@connectsw/huggingface` HubClient (search, details, download)               |
| Load/process datasets      | `@connectsw/huggingface` DatasetLoader (rows, search, batch iterate)         |

---

## Backend Components

### Plugins (Fastify)

#### Auth Plugin
- **Source**: `stablecoin-gateway/apps/api/src/plugins/auth.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is for JWT+API-key auth; adapt for different permission models
- **Dependencies**: `fastify-plugin`, `@fastify/jwt`, Prisma Plugin, Crypto Utils (hashApiKey), Logger
- **Used by**: stablecoin-gateway
- **Description**: Dual authentication supporting JWT bearer tokens (user sessions) and HMAC-SHA256 API keys. Includes Redis-backed circuit breaker for token revocation checks (JTI blacklist), optional auth decorator, permission enforcement (read/write/refund), and admin role guard. Falls back gracefully when Redis is unavailable within a 30-second window.
- **To reuse**: Copy the file. Adjust the permission enum in `requirePermission()` to match your domain. Ensure `@fastify/jwt` and Prisma Plugin are registered first. Requires `User` and `ApiKey` models in your Prisma schema.

#### Redis Plugin
- **Source**: `stablecoin-gateway/apps/api/src/plugins/redis.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: `fastify-plugin`, `ioredis`, Logger
- **Used by**: stablecoin-gateway
- **Description**: Redis connection management with TLS support, password auth, retry strategy with exponential backoff, graceful shutdown on app close, and health monitoring via ping. Decorates Fastify with `redis` (nullable -- graceful degradation if REDIS_URL not set). Configurable via REDIS_URL, REDIS_TLS, REDIS_TLS_REJECT_UNAUTHORIZED, REDIS_PASSWORD environment variables.
- **To reuse**: Copy the file. No changes needed. Set REDIS_URL in your environment.

#### Observability Plugin
- **Source**: `stablecoin-gateway/apps/api/src/plugins/observability.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: `fastify-plugin`, `crypto` (Node built-in), Logger
- **Used by**: stablecoin-gateway
- **Description**: Request/response logging with correlation IDs (X-Request-ID), automatic performance timing, error rate monitoring, and in-memory metrics collection with p50/p95/p99 percentile calculation. Provides a protected `/internal/metrics` endpoint (requires INTERNAL_API_KEY with timing-safe comparison). Sanitizes PII from logs. Log level varies by status code (5xx=error, 4xx=warn, 2xx=info).
- **To reuse**: Copy the file. Set INTERNAL_API_KEY for metrics access. Optionally replace in-memory metrics with Prometheus/StatsD.

#### Prisma Plugin
- **Source**: `stablecoin-gateway/apps/api/src/plugins/prisma.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: `fastify-plugin`, `@prisma/client`, Logger
- **Used by**: stablecoin-gateway
- **Description**: PrismaClient lifecycle management with configurable connection pool sizing (DATABASE_POOL_SIZE, DATABASE_POOL_TIMEOUT env vars), connection testing on startup, and graceful disconnect on app close. Decorates Fastify with `prisma`. Logs queries in development mode.
- **To reuse**: Copy the file. Works with any Prisma schema.

#### Stripe Plugin
- **Source**: `invoiceforge/apps/api/src/plugins/stripe.ts`
- **Maturity**: Solid
- **Reuse**: Copy as-is
- **Dependencies**: `fastify-plugin`, `stripe` npm package, app config
- **Used by**: invoiceforge
- **Description**: Initializes a Stripe client with the configured API version and decorates the Fastify instance with `stripe`. Simple and minimal -- a good starting point for any Stripe integration.
- **To reuse**: Copy the file. Update the config import to use your project's config module or environment variable for `stripeSecretKey`.

---

### Services

#### Webhook Circuit Breaker Service
- **Source**: `stablecoin-gateway/apps/api/src/services/webhook-circuit-breaker.service.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is; works with any Redis-like interface
- **Dependencies**: Redis (via `RedisLike` interface -- not tightly coupled)
- **Used by**: stablecoin-gateway (via Webhook Delivery Service)
- **Description**: Tracks consecutive delivery failures per endpoint using Redis. After 10 failures (configurable), the circuit opens for 5 minutes, pausing deliveries. Uses a Lua script for atomic increment + circuit-open in a single Redis round-trip, preventing race conditions between concurrent workers. Falls back to non-atomic approach if Lua eval is unavailable. Automatically resets on success or after cooldown.
- **To reuse**: Copy the file. The `RedisLike` interface accepts any object with `get/set/incr/del/expire/eval` methods. Adjust `CIRCUIT_THRESHOLD` and `CIRCUIT_RESET_MS` constants as needed.

#### Audit Log Service
- **Source**: `stablecoin-gateway/apps/api/src/services/audit-log.service.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is; requires AuditLog Prisma model
- **Dependencies**: `@prisma/client` (optional -- works in-memory without it)
- **Used by**: stablecoin-gateway
- **Description**: Fire-and-forget audit trail for security-critical actions (API key management, webhook changes, auth events, refunds). Persists to database via Prisma when available, falls back to in-memory ring buffer (10,000 entries). Automatically redacts sensitive fields (password, secret, token, key, authorization). Supports querying by actor, action, resourceType, and date range. The `record()` method never throws, ensuring audit failures do not block business operations.
- **To reuse**: Copy the file. Add the AuditLog model to your Prisma schema (see Prisma Patterns section). Pass PrismaClient to the constructor for database persistence, or omit for in-memory-only.

#### Email Service
- **Source**: `stablecoin-gateway/apps/api/src/services/email.service.ts`
- **Maturity**: Production
- **Reuse**: Adapt (swap templates for your domain)
- **Dependencies**: `@prisma/client` (for NotificationPreference model)
- **Used by**: stablecoin-gateway
- **Description**: Email notification system with professional HTML templates for customer receipts and merchant notifications. Manages per-user notification preferences (auto-created with defaults on first access). All user-controlled values are HTML-escaped (XSS prevention). Currently console-based for development; production path is SMTP via nodemailer or Resend/SendGrid.
- **To reuse**: Copy the file. Replace the HTML templates in `generateReceiptHtml()` and `generateMerchantNotificationHtml()` with your domain-specific templates. The `sendEmail()` method is the integration point for your email provider.

#### Webhook Delivery Service
- **Source**: `stablecoin-gateway/apps/api/src/services/webhook-delivery.service.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is for webhook delivery; adapt event types for your domain
- **Dependencies**: `@prisma/client`, Logger, Webhook Circuit Breaker Service, Webhook Delivery Executor Service
- **Used by**: stablecoin-gateway
- **Description**: Full webhook delivery pipeline. Queues webhooks to all subscribed endpoints, processes the queue with concurrent workers using `SELECT FOR UPDATE SKIP LOCKED` (safe for multi-instance deployments), and delegates actual HTTP delivery to the executor service. Supports composite idempotency keys (endpointId + eventType + resourceId) to prevent duplicate deliveries. Retries with exponential backoff (1m, 5m, 15m, 1h, 2h) up to 5 attempts.
- **To reuse**: Copy along with `webhook-circuit-breaker.service.ts` and `webhook-delivery-executor.service.ts`. Update the `WebhookEventType` union to match your domain events. Requires WebhookEndpoint and WebhookDelivery Prisma models.

---

### Utilities

#### Crypto Utils
- **Source**: `stablecoin-gateway/apps/api/src/utils/crypto.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: Node `crypto` built-in, `bcrypt`
- **Used by**: stablecoin-gateway
- **Description**: Cryptographic utility belt. Provides bcrypt password hashing (12 rounds), HMAC-SHA256 API key hashing (with API_KEY_HMAC_SECRET env var; falls back to plain SHA-256 in dev), API key generation with prefix (`sk_live_`/`sk_test_`), webhook secret generation (`whsec_` prefix), webhook payload signing with timestamp (timing-safe comparison), and ID generators for payment sessions (`ps_`) and refunds (`ref_`).
- **To reuse**: Copy the file. Set API_KEY_HMAC_SECRET in production. Adjust prefixes and ID generators for your domain.

#### Encryption Utils
- **Source**: `stablecoin-gateway/apps/api/src/utils/encryption.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: Node `crypto` built-in, AppError type
- **Used by**: stablecoin-gateway
- **Description**: AES-256-GCM authenticated encryption for sensitive data at rest (webhook secrets, API credentials). Uses random 96-bit IVs per operation, 128-bit auth tags for tamper detection. Output format: `iv:authTag:ciphertext` (all base64). Requires initialization at startup with WEBHOOK_ENCRYPTION_KEY (exactly 64 hex chars / 32 bytes). Key is used directly (not hashed) for OpenSSL interoperability.
- **To reuse**: Copy the file. Rename the env var from WEBHOOK_ENCRYPTION_KEY to a more generic name if desired. Generate key with `openssl rand -hex 32`.

#### Logger
- **Source**: `stablecoin-gateway/apps/api/src/utils/logger.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: None
- **Used by**: stablecoin-gateway (all plugins and services)
- **Description**: Structured logging utility with automatic sensitive field redaction. Patterns redacted: password, secret, token, authorization, apikey, api_key, private_key, creditcard, ssn, cookie, encryption_key, hmac, mnemonic, seed_phrase. Outputs JSON in production, human-readable format in development. Supports info/warn/error/debug levels (configurable via LOG_LEVEL env var). The error method accepts both Error objects and arbitrary data.
- **To reuse**: Copy the file. No changes needed.

#### Redis Rate Limit Store
- **Source**: `stablecoin-gateway/apps/api/src/utils/redis-rate-limit-store.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: `ioredis`
- **Used by**: stablecoin-gateway
- **Description**: Distributed rate limiting store implementing the `@fastify/rate-limit` store interface. Uses Redis atomic INCR for token bucket counting with automatic TTL cleanup. Supports route-specific TTL via the `child()` method. Works across multiple server instances. The static `setRedis()` method allows setting the Redis instance once at startup.
- **To reuse**: Copy the file. Call `RedisRateLimitStore.setRedis(redisInstance)` at startup, then pass the class to `@fastify/rate-limit` config.

#### Experiment Assignment
- **Source**: `recomengine/apps/api/src/modules/experiments/assignment.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: Node `crypto` built-in
- **Used by**: recomengine
- **Description**: Deterministic A/B test user assignment using SHA-256 hash of `userId:experimentId` mod 100. Returns variant ('control' or 'variant') and bucket number (0-99). Same input always produces same output (consistent experience across sessions). Configurable traffic split percentage.
- **To reuse**: Copy the file. Call `getExperimentAssignment(userId, experimentId, trafficSplit)`.

#### Experiment Statistics
- **Source**: `recomengine/apps/api/src/modules/experiments/statistics.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: None
- **Used by**: recomengine
- **Description**: Two-proportion z-test for comparing CTR, conversion rate, and revenue per visitor between control and variant groups. Computes lift, p-value (via normal CDF approximation), statistical significance at alpha=0.05, and Wilson score 95% confidence intervals. Handles edge cases (zero impressions, identical metrics).
- **To reuse**: Copy the file. Call `computeExperimentResults(metric, controlMetrics, variantMetrics)`.

#### Real-time Redis Counters
- **Source**: `recomengine/apps/api/src/modules/events/counters.ts`
- **Maturity**: Production
- **Reuse**: Copy and adapt counter keys
- **Dependencies**: `ioredis`
- **Used by**: recomengine
- **Description**: Redis pipeline-based daily counter service. Atomically increments multiple counters per event (total events, event type, impressions, clicks, conversions) with 48-hour TTL. Uses date-based keys for natural aggregation. Fire-and-forget pattern — failures don't block request processing.
- **To reuse**: Copy the file. Adjust the counter key patterns and increment logic for your domain's metrics.

#### Validation Schemas (generic parts)
- **Source**: `stablecoin-gateway/apps/api/src/utils/validation.ts`
- **Maturity**: Production
- **Reuse**: Pattern reference (extract the generic schemas)
- **Dependencies**: `zod`
- **Used by**: stablecoin-gateway
- **Description**: Zod validation schemas. The reusable parts are: auth schemas (signup with strong password rules, login, logout, password reset), idempotency key schema (alphanumeric, 1-64 chars), pagination query schemas (limit/offset with coercion and bounds), metadata schema (key/value limits, 50 keys max, 16KB size limit), and the `validateBody`/`validateQuery` helper functions. Domain-specific schemas (payment, webhook, Ethereum address) should stay product-specific.
- **To reuse**: Extract the auth, idempotency, pagination, and metadata schemas. Copy the `validateBody`/`validateQuery` helpers.

#### Error Classes
- **Source**: `invoiceforge/apps/api/src/lib/errors.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: None
- **Used by**: invoiceforge
- **Description**: Typed error hierarchy for consistent HTTP error responses. Base `AppError` with statusCode and code fields, plus convenience subclasses: NotFoundError (404), UnauthorizedError (401), ForbiddenError (403), BadRequestError (400), ConflictError (409), ValidationError (422, with field-level error map). All extend native Error for proper stack traces.
- **To reuse**: Copy the file. Use with a Fastify error handler that maps `AppError.statusCode` to HTTP responses.

#### Pagination Helper
- **Source**: `invoiceforge/apps/api/src/lib/pagination.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: None
- **Used by**: invoiceforge
- **Description**: Standard pagination utilities. `parsePagination()` extracts and bounds-checks page/limit from query strings (defaults: page=1, limit=20, max limit=100). `paginatedResult()` wraps data arrays with pagination metadata (page, limit, total, totalPages, hasMore). Provides TypeScript interfaces: `PaginationParams`, `PaginatedResult<T>`.
- **To reuse**: Copy the file. Works with any data type.

---

## Frontend Components

### Libraries

#### Token Manager
- **Source**: `stablecoin-gateway/apps/web/src/lib/token-manager.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: None
- **Used by**: stablecoin-gateway
- **Description**: XSS-safe JWT storage using in-memory variables only -- tokens are never written to localStorage or sessionStorage. Provides setToken, getToken, clearToken, hasToken methods. Session persistence is handled via httpOnly refresh token cookies (server-side). Tokens are cleared on page refresh by design; the refresh token flow restores them.
- **To reuse**: Copy the file. No changes needed.

#### API Client Base
- **Source**: `stablecoin-gateway/apps/web/src/lib/api-client.ts`
- **Maturity**: Production
- **Reuse**: Adapt (extract base class, remove product-specific endpoints)
- **Dependencies**: `event-source-polyfill`, Token Manager
- **Used by**: stablecoin-gateway
- **Description**: Full-featured HTTP API client with automatic Bearer token injection from TokenManager, 401 response handling (clears token), mock mode for development/testing (localStorage-backed), SSE support via EventSourcePolyfill (tokens sent in Authorization header, not URL), and typed request/response methods. The `ApiClientError` class provides structured error information (status, title, detail).
- **To reuse**: Copy the file. Remove product-specific methods (payment sessions, webhooks, etc.) and mock implementations. Keep the base `request<T>()` method, auth methods (login/logout/signup), token injection, and error handling as your foundation.

---

### Hooks

#### useAuth
- **Source**: `stablecoin-gateway/apps/web/src/hooks/useAuth.tsx`
- **Maturity**: Production
- **Reuse**: Copy as-is (depends on API Client)
- **Dependencies**: API Client, Token Manager
- **Used by**: stablecoin-gateway
- **Description**: React hook providing authentication state (user, isAuthenticated, isLoading, error) and methods (login, logout). Stores minimal user info (id, email, role) in a module-level variable alongside the token for cross-render persistence without a /me endpoint. Checks for existing token on mount. Login stores token via TokenManager; logout clears everything.
- **To reuse**: Copy the file. Update the import path for your API client. Adjust the User type fields if your auth response differs.

#### useTheme
- **Source**: `stablecoin-gateway/apps/web/src/hooks/useTheme.ts`
- **Maturity**: Solid
- **Reuse**: Copy as-is
- **Dependencies**: None (uses localStorage + document.documentElement)
- **Used by**: stablecoin-gateway
- **Description**: Dark/light theme toggle with localStorage persistence. Adds/removes the `dark` class on `<html>` element (compatible with Tailwind dark mode). Returns `{ theme, toggleTheme }`. Storage key is configurable (currently `stableflow-theme`).
- **To reuse**: Copy the file. Change the `STORAGE_KEY` constant to your product name.

#### useApiKeys
- **Source**: `stablecoin-gateway/apps/web/src/hooks/useApiKeys.ts`
- **Maturity**: Solid
- **Reuse**: Adapt (depends on API Client types)
- **Dependencies**: API Client
- **Used by**: stablecoin-gateway
- **Description**: CRUD hook for API key management. Provides: apiKeys list, isLoading, error state, createdKey (holds the full key shown only once after creation), and methods: createApiKey, deleteApiKey, clearCreatedKey. Auto-loads on mount. Optimistic removal on delete.
- **To reuse**: Copy the file. A good pattern reference for any CRUD resource hook.

#### useWebhooks
- **Source**: `stablecoin-gateway/apps/web/src/hooks/useWebhooks.ts`
- **Maturity**: Solid
- **Reuse**: Adapt (depends on API Client types)
- **Dependencies**: API Client
- **Used by**: stablecoin-gateway
- **Description**: Full CRUD hook for webhook management. Provides: webhooks list, isLoading, error state, createdWebhook (with secret), rotatedSecret, and methods: createWebhook, updateWebhook, deleteWebhook, rotateSecret, clearCreatedWebhook, clearRotatedSecret. Exports `WEBHOOK_EVENTS` constant and `WebhookEvent` type. Auto-loads on mount.
- **To reuse**: Copy the file. Update event types for your domain.

---

### UI Components

#### ErrorBoundary
- **Source**: `stablecoin-gateway/apps/web/src/components/ErrorBoundary.tsx`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: React
- **Used by**: stablecoin-gateway
- **Description**: React class-based error boundary with a styled fallback UI. Shows an error icon, friendly message, expandable technical details, and a "Go to Homepage" button. Uses Tailwind CSS for styling. Logs errors to console via `componentDidCatch`.
- **To reuse**: Copy the file. Wrap your app's root or page layouts with `<ErrorBoundary>`.

#### ProtectedRoute
- **Source**: `stablecoin-gateway/apps/web/src/components/ProtectedRoute.tsx`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: `react-router-dom`, Token Manager
- **Used by**: stablecoin-gateway
- **Description**: Route guard component for React Router. Checks `TokenManager.hasToken()` and redirects to `/login` if unauthenticated. Uses `<Navigate replace />` for clean history. Renders `<Outlet />` for nested routes.
- **To reuse**: Copy the file. Adjust the redirect path if your login route differs.

#### StatCard
- **Source**: `stablecoin-gateway/apps/web/src/components/dashboard/StatCard.tsx`
- **Maturity**: Production
- **Reuse**: Copy as-is
- **Dependencies**: Tailwind CSS (uses semantic color tokens: card-bg, card-border, text-primary, text-secondary, accent-green)
- **Used by**: stablecoin-gateway
- **Description**: KPI display card with title, large value, optional trend indicator (with upward arrow icon), and optional subtitle. Clean, minimal design suitable for dashboard overview sections.
- **To reuse**: Copy the file. Ensure your Tailwind config includes the semantic color tokens, or replace with standard Tailwind colors.

#### Sidebar
- **Source**: `stablecoin-gateway/apps/web/src/components/dashboard/Sidebar.tsx`
- **Maturity**: Production
- **Reuse**: Pattern reference (navigation structure is product-specific)
- **Dependencies**: `react-router-dom`, useAuth hook, ThemeToggle, Tailwind CSS
- **Used by**: stablecoin-gateway
- **Description**: Fixed-position navigation sidebar with role-aware sections (main nav, developer tools, admin-only section, settings). Uses React Router's `NavLink` with active state styling. Includes ThemeToggle at the bottom. Each nav item has an SVG icon, label, and route path.
- **To reuse**: Copy as a pattern. Replace the nav items array with your product's routes and icons. The `NavItem` component and role-based section rendering are the reusable parts.

#### ThemeToggle
- **Source**: `stablecoin-gateway/apps/web/src/components/dashboard/ThemeToggle.tsx`
- **Maturity**: Solid
- **Reuse**: Copy as-is (requires useTheme hook)
- **Dependencies**: useTheme hook
- **Used by**: stablecoin-gateway
- **Description**: Toggle button for dark/light mode with sun/moon icons. Pairs with the useTheme hook for state management.
- **To reuse**: Copy alongside useTheme hook.

#### TransactionsTable
- **Source**: `stablecoin-gateway/apps/web/src/components/dashboard/TransactionsTable.tsx`
- **Maturity**: Production
- **Reuse**: Pattern reference (column definitions are product-specific)
- **Dependencies**: Tailwind CSS
- **Used by**: stablecoin-gateway
- **Description**: Paginated, sortable data table for displaying transaction records. Includes status badges, amount formatting, date formatting, and responsive layout. A good pattern for building any data table component.
- **To reuse**: Use as a pattern reference. Extract the table skeleton (header, rows, pagination controls) and customize columns for your data model.

---

## Infrastructure

### Docker

#### Multi-Stage Dockerfile (API)
- **Source**: `stablecoin-gateway/apps/api/Dockerfile`
- **Maturity**: Production
- **Reuse**: Copy as-is; adjust paths and port
- **Description**: Two-stage build (builder + runner). Builder installs deps, generates Prisma client, and compiles TypeScript. Runner uses Alpine, installs `dumb-init` for proper PID 1 signal handling, creates a non-root `nodejs` user (UID 1001), copies only built artifacts. Includes a health check on `/health`. Exposes port 5001.
- **To reuse**: Copy and update: port number (EXPOSE), health check URL, source copy paths. The dumb-init + non-root user pattern is production-ready.

#### Docker Compose (Full Stack)
- **Source**: `stablecoin-gateway/docker-compose.yml`
- **Maturity**: Production
- **Reuse**: Adapt for your service topology
- **Description**: PostgreSQL 15 Alpine + Redis 7 Alpine + API + Web frontend. Features: health checks on all services, volume persistence, environment variable injection with required-secret validation (`${VAR:?error message}`), localhost-only port binding for databases (`127.0.0.1:port:port`), automatic Prisma migration on API startup. Optional merchant-demo service behind a Docker profile.
- **To reuse**: Copy and update service names, ports, and environment variables for your product.

---

### CI/CD

#### GitHub Actions Quality Gate Workflow
- **Source**: `.github/workflows/test-stablecoin-gateway.yml`
- **Maturity**: Production
- **Reuse**: Copy and adapt per product
- **Description**: Four parallel jobs (test, lint, security, test-frontend) with a final quality-gate job that fails if any predecessor failed. Test job runs against a real PostgreSQL 15 service container. Lint job runs ESLint + TypeScript type checking. Security job runs `npm audit`. Frontend job runs Jest tests. Uses Node 20, npm caching, and path-based triggering (only runs when product files change).
- **To reuse**: Copy the file. Update: working-directory paths, path triggers, database name, and cache-dependency-path.

---

### Playwright (E2E Testing)

#### Playwright Config
- **Source**: `stablecoin-gateway/apps/web/playwright.config.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is; adjust baseURL and webServer command
- **Description**: Single-worker sequential execution (rate-limit-safe), Chromium only, HTML reporter, trace on first retry, CI-aware retries (2 in CI, 0 locally). Configures webServer to auto-start `npm run dev` with 120s startup timeout and existing-server reuse in local dev.
- **To reuse**: Copy and update `baseURL` and `webServer.command` for your product.

#### Auth Fixture
- **Source**: `stablecoin-gateway/apps/web/e2e/fixtures/auth.fixture.ts`
- **Maturity**: Production
- **Reuse**: Copy as-is; adjust API_URL and user creation
- **Description**: Playwright test fixture providing authenticated pages without consuming rate-limit slots. Creates unique users via API (one per worker, reused across tests). Authenticates browser pages by intercepting login API calls with `page.route()` and returning pre-fetched tokens -- zero API calls for browser auth. Includes helpers: `navigateTo()` for client-side routing (avoids token-clearing full reloads), `loginAsAdmin()` with cached admin tokens, `createUserWithApiKey()` for payment tests, and `loginViaUI()` for testing the login flow itself.
- **To reuse**: Copy the file. Update `API_URL`, `TEST_PASSWORD`, and the user creation flow to match your auth endpoints.

---

### Prisma Patterns

These Prisma model patterns are ready to copy into new product schemas.

#### User Model
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role     @default(MERCHANT)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@map("users")
}
```
- **Source**: `stablecoin-gateway/apps/api/prisma/schema.prisma`

#### ApiKey Model
```prisma
model ApiKey {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  name        String
  keyHash     String    @unique @map("key_hash")
  keyPrefix   String    @map("key_prefix")
  permissions Json      @default("{\"read\":true,\"write\":true,\"refund\":false}")
  lastUsedAt  DateTime? @map("last_used_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([keyHash])
  @@map("api_keys")
}
```
- **Source**: `stablecoin-gateway/apps/api/prisma/schema.prisma`

#### WebhookEndpoint Model
```prisma
model WebhookEndpoint {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  url         String
  secret      String
  events      String[]
  enabled     Boolean  @default(true)
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("webhook_endpoints")
}
```
- **Source**: `stablecoin-gateway/apps/api/prisma/schema.prisma`

#### WebhookDelivery Model
```prisma
model WebhookDelivery {
  id            String        @id @default(cuid())
  endpointId    String        @map("endpoint_id")
  eventType     String        @map("event_type")
  payload       Json
  resourceId    String        @map("resource_id")
  attempts      Int           @default(0)
  status        WebhookStatus @default(PENDING)
  lastAttemptAt DateTime?     @map("last_attempt_at")
  nextAttemptAt DateTime?     @map("next_attempt_at")
  succeededAt   DateTime?     @map("succeeded_at")
  responseCode  Int?          @map("response_code")
  responseBody  String?       @map("response_body") @db.Text
  errorMessage  String?       @map("error_message") @db.Text
  endpoint      WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  @@unique([endpointId, eventType, resourceId], name: "webhook_delivery_idempotency")
  @@index([endpointId, status])
  @@index([status, nextAttemptAt])
  @@map("webhook_deliveries")
}
```
- **Source**: `stablecoin-gateway/apps/api/prisma/schema.prisma`

#### AuditLog Model
```prisma
model AuditLog {
  id           String   @id @default(cuid())
  actor        String
  action       String
  resourceType String   @map("resource_type")
  resourceId   String   @map("resource_id")
  details      Json?
  ip           String?
  userAgent    String?  @map("user_agent")
  timestamp    DateTime @default(now())
  @@index([actor])
  @@index([action])
  @@index([resourceType])
  @@index([timestamp])
  @@map("audit_logs")
}
```
- **Source**: `stablecoin-gateway/apps/api/prisma/schema.prisma`

---

## Product Inventory

Components in this registry are sourced from these products:

| Product              | Status     | Backend | Frontend | Has Docker | Has CI |
|----------------------|------------|---------|----------|------------|--------|
| stablecoin-gateway   | Production | Yes     | Yes      | Yes        | Yes    |
| muaththir            | Production | Yes     | Yes      | Yes        | Yes    |
| connectgrc           | MVP        | Yes     | Yes      | Yes        | Yes    |
| recomengine          | Foundation | Yes     | Yes      | Yes        | --     |

---

## Shared Package Extraction — COMPLETED

All reusable SaaS components have been extracted into `@connectsw/*` packages:

| Package | Contents | Status |
|---------|----------|--------|
| `@connectsw/shared` | Logger, crypto, Prisma/Redis plugins | Production |
| `@connectsw/auth` | JWT + API key auth, sessions, token management | Production |
| `@connectsw/ui` | Button, Card, Input, Badge, Skeleton, StatCard, DataTable, ErrorBoundary, ThemeToggle, Sidebar, DashboardLayout, useTheme | Production |
| `@connectsw/webhooks` | Webhook delivery, circuit breaker, HMAC signing, SSRF protection, encryption | Production |
| `@connectsw/notifications` | Email + in-app notifications, preferences, templates | Production |
| `@connectsw/audit` | Audit logging with DB + ring buffer fallback, sensitive field redaction | Production |
| `@connectsw/billing` | Subscription tiers, usage metering, tier gates, pricing UI | Production |
| `@connectsw/saas-kit` | Full product scaffold generator (CLI + programmatic API) | Production |

**New products**: Run `connectsw-create <name> --all-features` to scaffold a complete product using all packages.

---

## Conventions

### Naming
- Fastify plugins: `[name].ts` in `src/plugins/`, registered via `fastify-plugin` with a `name` property
- Services: `[name].service.ts` in `src/services/`, class-based with constructor injection
- Utilities: `[name].ts` in `src/utils/`, pure functions exported directly
- React hooks: `use[Name].ts` in `src/hooks/`
- React components: `[Name].tsx` in `src/components/` or `src/components/[section]/`

### Maturity Levels
- **Production**: Battle-tested, fully covered by tests, used in deployed products
- **Solid**: Well-tested, used in development, ready for production with minor review
- **Prototype**: Functional but needs hardening before production use
