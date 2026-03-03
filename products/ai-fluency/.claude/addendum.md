# AI Fluency Platform — Product Addendum

> This file is the single source of truth for all AI Fluency product-specific technical conventions.
> ALL agents working on this product MUST read this file before starting any task.

**Product**: ai-fluency
**Created**: 2026-03-03 (ARCH-01)
**Ports**: API 5014, Web 3118

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend framework | Fastify | 4.x | Plugin registration order is mandatory (see below) |
| Language | TypeScript | 5.x | Strict mode enabled |
| ORM | Prisma | 5.x | With RLS middleware — see multi-tenancy section |
| Database | PostgreSQL | 15 | RLS policies on all tenant-scoped tables |
| Cache / Queue | Redis | 7 | BullMQ for async jobs |
| Frontend | Next.js | 14 (App Router) | Port 3118 |
| UI library | React | 18 | |
| Styling | Tailwind CSS | 3.x | |
| Charts | Recharts | 2.x | Lazy-load on non-dashboard pages |
| LTI 1.3 | ltijs | 5.9.9 | For LMS grade passback |
| Auth | @connectsw/auth/backend | latest | JWT + sessions |
| Password hashing | argon2 | latest | Argon2id (NOT bcrypt) |
| Testing (API) | Jest + Supertest | latest | Real DB — no mocks |
| Testing (Web) | React Testing Library | latest | |
| Testing (E2E) | Playwright | latest | |

---

## Ports

| Service | Port | Local URL |
|---------|------|-----------|
| Fastify API | 5014 | http://localhost:5014 |
| Next.js Web | 3118 | http://localhost:3118 |
| PostgreSQL | 5432 | postgresql://localhost:5432/ai_fluency_dev |
| Redis | 6379 | redis://localhost:6379 |

---

## Environment Variables

All required — app fails fast with descriptive error if any are missing.

```bash
# Database
DATABASE_URL=postgresql://api_service_rls:password@localhost:5432/ai_fluency_dev
DATABASE_ADMIN_URL=postgresql://api_service:password@localhost:5432/ai_fluency_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=<RS256 private key or HS256 secret>
JWT_REFRESH_SECRET=<separate secret>
JWT_ACCESS_EXPIRY=900                  # 15 minutes in seconds
JWT_REFRESH_EXPIRY=604800              # 7 days in seconds

# Email
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@ai-fluency.connectsw.com

# Object Storage
S3_BUCKET=ai-fluency-assets
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Open Badges (Badgr)
BADGR_API_URL=https://api.badgr.io
BADGR_API_TOKEN=xxx
BADGR_ISSUER_ID=xxx

# Encryption (for SSO config secrets — AES-256-GCM)
SSO_ENCRYPTION_KEY=<32-byte hex>

# Analytics (optional in dev)
POSTHOG_API_KEY=xxx
NODE_ENV=development
```

---

## Multi-Tenancy — MANDATORY

**Every query touching a tenant-scoped table MUST operate within an RLS context.**

### How it works

1. JWT payload contains `orgId`
2. Fastify `onRequest` hook calls `SET LOCAL app.current_org_id = :orgId` via Prisma
3. PostgreSQL RLS policy filters all rows to current org automatically

### Tables with RLS (never bypass in application code)

`users`, `user_sessions`, `sso_configs`, `teams`, `assessment_templates`, `assessment_sessions`, `responses`, `fluency_profiles`, `learning_paths`, `learning_path_modules`, `module_completions`, `certificates`, `audit_logs`

### Tables WITHOUT RLS (global data)

`organizations`, `questions`, `behavioral_indicators`, `learning_modules`, `algorithm_versions`

### Rules for Backend Engineers

- NEVER query a tenant-scoped table without having set `app.current_org_id` first
- NEVER use the admin/BYPASSRLS DB connection for user requests
- ALWAYS verify ownership in route handler (JWT orgId matches resource orgId) — defense in depth
- Use `api_service_rls` DB role for all application queries
- Use `api_service` DB role only for migrations and admin scripts

---

## Auth Conventions

### Token lifecycle

| Token | Storage | Expiry | Notes |
|-------|---------|--------|-------|
| JWT access token | In-memory (TokenManager) | 15 min | Never localStorage |
| Refresh token | httpOnly Secure cookie | 7 days | SameSite=Strict |
| Refresh token hash | PostgreSQL user_sessions | 7 days | SHA-256 hex, not plaintext |

### Password hashing

Use **Argon2id** (NOT bcrypt). Import from `argon2` npm package.

```typescript
import { hash, verify } from 'argon2';
// Hash: hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 })
// Verify: verify(hash, password)
```

### Token comparison

ALWAYS use `crypto.timingSafeEqual` for token comparisons. Never `===`.

---

## Scoring Algorithm

- Scoring is **server-side only** in `ScoringService`
- Algorithm version stored per session (`assessment_sessions.algorithm_version_id`)
- Historical sessions NEVER rescored — algorithm version is immutable per session
- ScoringService is a **pure function** — takes inputs, returns ScoredProfile, no DB writes
- Caller (route handler) persists the result

### Score formula

```
Indicator score = answer_score (SCENARIO: 0.0/0.5/1.0) or likert_normalized (SELF_REPORT: (n-1)/4)
Dimension score = Σ(score × prevalenceWeight) / Σ(prevalenceWeight)
Overall score = Σ(dimensionScore × dimensionWeight) × 100
```

### Discernment Gap

Flag `discernmentGap = true` when:
- `DELEGATION_REASONING` indicator status = FAIL, AND
- `DISCERNMENT_MISSING_CONTEXT` indicator status = FAIL

This triggers prepending the "Question AI Reasoning" module to learning paths.

---

## Fastify Plugin Registration Order

**Always register in this exact order — Fastify dependencies require it:**

1. `configPlugin` — env var validation
2. `prismaPlugin` — Prisma client + RLS session middleware
3. `redisPlugin` — ioredis connection
4. `authPlugin` — JWT verification, admin guard
5. `rateLimitPlugin` — @fastify/rate-limit via Redis
6. `observabilityPlugin` — Pino logger, Prometheus /metrics
7. Route modules (all after above plugins are ready)

---

## API Conventions

### Base URL

```
/api/v1/[resource]
```

### Error format (RFC 7807 — mandatory for ALL errors)

```json
{
  "type": "https://api.ai-fluency.connectsw.com/errors/[error-code]",
  "title": "[error-code]",
  "status": 400,
  "detail": "Human-readable message",
  "instance": "req-correlation-id"
}
```

### Pagination (all list endpoints)

```
GET /api/v1/teams?page=1&limit=20
Response: { data: [], total: 100, page: 1, limit: 20, totalPages: 5 }
```

Maximum limit: 100 (enforced by Zod schema).

---

## Commit Message Format

```
type(scope): description [US-XX][FR-XXX]
```

Examples:
```
feat(assess): implement session start endpoint [US-01][FR-001]
test(scoring): add prevalence-weighted scoring unit tests [US-03][FR-002]
fix(rls): set LOCAL instead of SET for PgBouncer compatibility [FR-016]
```

**Traceability is mandatory** (enforced by commit-msg hook). Arch/chore commits may use `SKIP_TRACEABILITY=1`.

---

## Libraries to Use / Avoid

### Use

| Need | Library |
|------|---------|
| Auth | @connectsw/auth/backend, @connectsw/auth/frontend |
| Logging | @connectsw/shared/utils/logger |
| Crypto | @connectsw/shared/utils/crypto, argon2 |
| Validation | zod |
| Charts | recharts (RadarChart for 4D profile, LineChart for progress) |
| UI | @connectsw/ui, shadcn/ui |
| Job Queue | bullmq |
| LTI 1.3 | ltijs |
| SAML | samlify |
| OIDC | openid-client |

### Do NOT use

| Library | Why |
|---------|-----|
| bcrypt | Use argon2 instead |
| ims-lti | LTI 1.1 only, outdated |
| Chart.js | SSR incompatible with Next.js |
| D3.js | Too imperative for React — use Recharts |
| localStorage for tokens | XSS risk — use in-memory TokenManager |
| jsonwebtoken | Use @fastify/jwt (included in @connectsw/auth) |

---

## Testing Conventions

### API tests (Jest + Supertest)

- Use real PostgreSQL (ai_fluency_test database)
- Use real Redis
- NO mocks — real DB state verified
- Set `app.current_org_id` in beforeAll for RLS context
- Reset DB in afterEach for isolation

```typescript
// Standard test setup pattern
let app: FastifyInstance;
let orgId: string;
let authToken: string;

beforeAll(async () => {
  app = await buildApp();
  // Create test org + user, get JWT
  const { org, token } = await createTestOrg(app);
  orgId = org.id;
  authToken = token;
});

afterAll(async () => {
  await cleanupTestOrg(orgId, app.prisma);
  await app.close();
});
```

### Frontend tests (React Testing Library)

- Test behavior, not implementation
- Use `screen.getByRole()` over `getByTestId()`
- Test accessibility (keyboard nav, ARIA labels)

---

## WCAG 2.1 AA Requirements (NFR-003)

- All form fields have associated `<label>` elements
- Color is not the sole indicator of meaning (use text + icon)
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text
- All interactive elements keyboard-accessible
- Assessment question options: use radio buttons with visible focus indicator
- Recharts charts include `<title>` and `<desc>` for screen readers

---

## Background Workers (BullMQ)

Three job queues:

| Queue | Jobs | Retry |
|-------|------|-------|
| `badge-issuance` | Issue Open Badges v3 cert when score >= 80 | 3x, exponential backoff |
| `pdf-generation` | Generate certificate PDF via Puppeteer | 3x, exponential backoff |
| `lti-grade-passback` | Send score to LMS via LTI 1.3 | 3x, then admin email alert |

Workers live in `apps/api/src/workers/`. Run as separate process in production.

---

## Git Safety

- NEVER `git add .` or `git add -A`
- Always stage specific files: `git add apps/api/src/routes/assessment-sessions.ts`
- Verify staged files before commit: `git diff --cached --stat`
- Verify after commit: `git show --stat`
- Pre-commit hook blocks >30 files or >5000 deleted lines
