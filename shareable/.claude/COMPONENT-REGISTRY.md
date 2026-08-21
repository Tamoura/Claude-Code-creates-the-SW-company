# Component Registry

> Article II: check this registry before building anything. Reuse beats rebuild,
> and an agent that skips this step is skipping a constitutional requirement.

Every entry answers three questions: what it does, where it lives, and what it
costs to adopt. When you build something a second product could use, add it
here in the same shape — an unregistered component is invisible to every agent.

## Shared packages

Import these; never copy them between products.

| Package | Import | Provides |
|---------|--------|----------|
| `@connectsw/shared` | `packages/shared` | Structured logger with PII redaction, crypto helpers (password hashing, HMAC, webhook signatures), Prisma and Redis Fastify plugins |
| `@connectsw/auth` | `packages/auth` | JWT + API key authentication, refresh-token rotation, session management, `useAuth` hook, `ProtectedRoute`, XSS-safe in-memory token storage, Prisma models |
| `@connectsw/billing` | `packages/billing` | Subscription tiers, entitlement checks, usage metering, Stripe-shaped webhooks |
| `@connectsw/notifications` | `packages/notifications` | Templated transactional email, in-app notification feed, delivery retries |
| `@connectsw/webhooks` | `packages/webhooks` | Outbound webhook delivery with signing, retry and dead-letter handling |
| `@connectsw/audit` | `packages/audit` | Append-only audit log with actor, action and diff capture |
| `@connectsw/observability` | `packages/observability` | Request tracing, performance metrics, health-check composition |
| `@connectsw/ui` | `packages/ui` | Card, Input, StatCard, Skeleton, ErrorBoundary and friends — Tailwind, accessible by default |
| `@connectsw/eslint-config` | `packages/eslint-config` | The shared lint baseline required by Article XIV — `base`, `backend`, `frontend` |
| `@connectsw/saas-kit` | `packages/saas-kit` | Scaffold generator: creates a full product skeleton wired to the packages above |

```ts
// Correct: import from the package
import { logger } from '@connectsw/shared/utils/logger';

// Wrong: copy the file into your product and let the two drift apart
```

## Patterns in the demo product

`products/taskflow` is small on purpose, but these pieces are the reference
implementations agents are expected to copy when a package does not already
cover the need.

| Pattern | Source | Reuse |
|---------|--------|-------|
| RFC 7807 error hierarchy | `products/taskflow/apps/api/src/lib/errors.ts` | Copy as-is; pair with the error handler in `app.ts` |
| Zod boundary validation | `products/taskflow/apps/api/src/lib/validate.ts` | Copy as-is |
| Prisma lifecycle plugin | `products/taskflow/apps/api/src/plugins/prisma.ts` | Prefer `@connectsw/shared/plugins/prisma`; this is the minimal form |
| Layered routes → services → repositories | `products/taskflow/apps/api/src/` | Follow the layering; see ADR-001 in that product |
| Integration tests against a real database | `products/taskflow/apps/api/tests/` | Copy `tests/helpers/db.ts` as the truncation strategy |
| Server-rendered list + client mutations | `products/taskflow/apps/web/` | Follow the split: server component fetches, client component mutates |

## Adding an entry

```md
#### Component Name
- **Source**: path/to/file.ts
- **Maturity**: Prototype | Production
- **Reuse**: Import | Copy as-is | Copy and adapt
- **Dependencies**: what it needs to work
- **Used by**: products already on it
- **Description**: what it does in one or two sentences
- **To reuse**: the two lines of setup a caller needs
```

Register a component when the second product needs it — not before. Premature
extraction produces packages shaped by one caller's accident.
