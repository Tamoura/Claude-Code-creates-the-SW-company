# AI Fluency Platform

> Enterprise AI Fluency Assessment and Development Platform — powered by the 4D AI Fluency Framework.

---

## 1. Product Overview

### Why This Exists

The global AI training market is valued at $2.52T and growing at 44% year-over-year. Yet most organizations lack any structured way to measure whether their employees can work effectively with AI. Teams adopt AI tools, but adoption does not equal fluency. Without a rigorous measurement framework, L&D leaders cannot identify skill gaps, prioritize training investment, or demonstrate ROI to the C-suite.

AI Fluency solves this by giving enterprises a scientifically grounded way to measure, develop, and certify AI fluency at scale — from individual learners to org-wide readiness dashboards.

### What It Does

AI Fluency delivers:

- **Behavioral assessments** — 32-question assessments covering 24 behavioral indicators, using scenario-based questions and self-report Likert scales.
- **4D Fluency Profiles** — Individualized scores across four dimensions: Delegation, Description, Discernment, and Diligence.
- **Prevalence-weighted scoring** — An algorithm that accounts for how commonly each behavior is observed in high-performing AI collaborators.
- **Personalized learning paths** — Modules auto-sequenced weakest-dimension-first, with Discernment Gap detection that prepends critical reasoning content.
- **Digital credentials** — Open Badges v3 certificates issued via Badgr upon achieving a score of 80%+.
- **LMS integration** — LTI 1.3 grade passback for universities and corporate LMS platforms.
- **Enterprise SSO** — SAML 2.0 and OIDC via per-org Identity Provider configuration.

### Target Users

| Persona | Role | Primary Need |
|---------|------|-------------|
| Alex | Individual Learner | Understand personal AI fluency, follow a personalized path |
| Lisa | L&D Manager | Configure team assessments, view team-level dashboards |
| David | C-Suite Executive | Org-level AI readiness reports, ROI metrics |
| Prof. Sarah | University Instructor | Assign assessments to students, receive LTI grade passback |
| Raj | IT Administrator | Configure SAML/OIDC SSO, manage data retention |

### Business Context

- **Revenue target**: $500K ARR from 20 enterprise customers in 12 months (Q3 2026 MVP)
- **Pricing model**: Per-seat subscription, tiered by org size
- **Strategic alignment**: ConnectSW's L&D vertical — complements ConnectIn (professional networking) and ConnectGRC (governance, risk, compliance)

---

## 2. Architecture Overview

### C4 Level 1 — System Context

```mermaid
graph TD
    subgraph Users["External Users"]
        learner["Alex — Individual Learner\nAssessments + fluency profile"]
        ldm["Lisa — L&D Manager\nTeam management + dashboards"]
        exec["David — C-Suite\nOrg-level AI readiness"]
        instructor["Prof. Sarah — Instructor\nLTI grade passback"]
        itadmin["Raj — IT Admin\nSSO configuration"]
    end

    subgraph Platform["AI Fluency Platform (ConnectSW)"]
        aifluency["AI Fluency Platform\nEnterprise AI Fluency Assessment\n& Development System"]
    end

    subgraph External["External Systems"]
        idp["Enterprise IdP\nOkta / Azure AD\nSAML 2.0 / OIDC"]
        lms["LMS Platforms\nCanvas / Moodle\nLTI 1.3"]
        email["SendGrid\nEmail Delivery"]
        openbadges["Open Badges Registry\nBadgr / Credly"]
        analytics["PostHog\nProduct Analytics"]
    end

    learner -->|HTTPS| aifluency
    ldm -->|HTTPS| aifluency
    exec -->|HTTPS| aifluency
    instructor -->|HTTPS - LTI 1.3| aifluency
    itadmin -->|HTTPS - SSO config| aifluency

    aifluency -->|SAML / OIDC| idp
    aifluency -->|LTI 1.3 grade passback| lms
    aifluency -->|REST API| email
    aifluency -->|Open Badges v3 REST| openbadges
    aifluency -->|Server-side event capture| analytics

    style Platform fill:#1168bd,color:#fff
    style aifluency fill:#1168bd,color:#fff
```

### C4 Level 2 — Container Diagram

```mermaid
graph TD
    subgraph Browser["Web Browser"]
        spa["Next.js Web App\nReact 18 + Tailwind CSS\nPort 3118\nAssessment UI, dashboards,\nlearning paths, profiles"]
    end

    subgraph APILayer["API Layer"]
        api["Fastify API Server\nNode.js 20 + TypeScript 5\nPort 5014\nREST + OpenAPI\nBusiness logic + auth"]
        worker["Background Worker\nBullMQ on Redis\nPDF generation\nBadge issuance\nLTI grade passback"]
    end

    subgraph DataLayer["Data Layer"]
        pg["PostgreSQL 15\nPrimary data store\nRow Level Security\nMulti-tenant isolation"]
        redis["Redis 7\nRate limiting\nJob queue (BullMQ)\nSession cache"]
        storage["S3-Compatible Storage\nCertificate PDFs\nAvatar images"]
    end

    subgraph ExternalServices["External Services"]
        idp["Enterprise IdP\nSAML 2.0 / OIDC"]
        lms["LMS Platforms\nLTI 1.3"]
        sendgrid["SendGrid\nEmail"]
        badgr["Open Badges Registry\nDigital Credentials"]
    end

    spa -->|"REST + JSON / HTTPS"| api
    api -->|"Prisma ORM + RLS"| pg
    api -->|"ioredis"| redis
    api -->|"AWS SDK"| storage
    api -->|"BullMQ enqueue"| redis
    worker -->|"Dequeues jobs"| redis
    worker -->|"Reads/writes"| pg
    worker -->|"SMTP via REST"| sendgrid
    worker -->|"Badge assertion"| badgr
    worker -->|"LTI score service"| lms
    api -->|"SAML SP / OIDC client"| idp

    style spa fill:#85bbf0,color:#000
    style api fill:#1168bd,color:#fff
    style worker fill:#1168bd,color:#fff
    style pg fill:#336791,color:#fff
    style redis fill:#d82c20,color:#fff
    style storage fill:#f59e0b,color:#000
```

---

## 3. Getting Started

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | `node --version` to verify |
| npm | 10+ | Bundled with Node 20 |
| PostgreSQL | 15 | Run locally or via Docker |
| Redis | 7 | Run locally or via Docker |
| Docker | 24+ | Optional — recommended for PostgreSQL + Redis |

### Step 1 — Clone and enter the product directory

```bash
git clone https://github.com/connectsw/platform.git
cd products/ai-fluency
```

### Step 2 — Start infrastructure services

```bash
# Start PostgreSQL 15 and Redis 7 via Docker Compose
docker-compose up -d postgres redis
```

The `docker-compose.yml` at the product root exposes:
- PostgreSQL on port `5432`
- Redis on port `6379`

### Step 3 — Set up the backend API

```bash
cd apps/api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env — see Section 7 (Environment Variables) for required values

# Create databases and run migrations
npx prisma migrate dev

# Start the API server
npm run dev
# API is now running at http://localhost:5014
```

### Step 4 — Set up the frontend (new terminal)

```bash
cd apps/web

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local — minimum required: NEXT_PUBLIC_API_URL=http://localhost:5014

# Start the Next.js dev server
npm run dev
# Web app is now running at http://localhost:3118
```

### Step 5 — Verify everything is running

```bash
# Health check
curl http://localhost:5014/health
# Expected: {"status":"healthy","postgres":"up","redis":"up"}

# Open the web app
open http://localhost:3118
```

---

## 4. Running Tests

### Backend tests (Jest + Supertest, real PostgreSQL)

```bash
cd apps/api

# Run all tests
npm test

# Run a specific test file
npm test -- --testPathPattern="auth"

# Run with coverage
npm test -- --coverage
```

Tests use the `ai_fluency_test` database. Ensure it exists before running:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma
DATABASE_URL=postgresql://api_service_rls:password@localhost:5432/ai_fluency_test \
  npx prisma migrate deploy
```

### Frontend tests (React Testing Library)

```bash
cd apps/web

# Run all tests
npm test

# Run in watch mode
npm test -- --watch
```

### E2E tests (Playwright)

Requires both API server and web app running on their respective ports.

```bash
# Terminal 1: Start API
cd apps/api && npm run dev

# Terminal 2: Start web
cd apps/web && npm run dev

# Terminal 3: Run E2E tests
cd e2e
npm install
npm test

# Run a specific spec
npx playwright test auth.spec.ts

# Open Playwright UI for debugging
npx playwright test --ui
```

---

## 5. Project Structure

```
products/ai-fluency/
├── apps/
│   ├── api/                        # Fastify API server (port 5014)
│   │   ├── src/
│   │   │   ├── index.ts            # Entry point — starts server on PORT env var
│   │   │   ├── app.ts              # buildApp() factory — registers all plugins + routes
│   │   │   ├── config.ts           # Zod env var schema — fails fast if missing
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.ts       # Prisma client lifecycle + RLS session middleware
│   │   │   │   ├── redis.ts        # ioredis connection with graceful fallback
│   │   │   │   ├── auth.ts         # JWT verification, admin guard, org guard
│   │   │   │   ├── rate-limit.ts   # @fastify/rate-limit via Redis
│   │   │   │   └── observability.ts # Pino logger + Prometheus /metrics
│   │   │   ├── routes/
│   │   │   │   ├── health.ts       # GET /health
│   │   │   │   ├── auth.ts         # POST /api/v1/auth/*
│   │   │   │   ├── organizations.ts # CRUD + SSO config
│   │   │   │   ├── teams.ts        # Team management
│   │   │   │   ├── users.ts        # Profile + GDPR
│   │   │   │   ├── assessment-templates.ts
│   │   │   │   ├── assessment-sessions.ts # Start, answer, complete
│   │   │   │   ├── fluency-profiles.ts
│   │   │   │   ├── learning-paths.ts
│   │   │   │   ├── certificates.ts
│   │   │   │   ├── dashboard.ts    # Org + team aggregates
│   │   │   │   └── admin.ts        # SUPER_ADMIN only
│   │   │   ├── services/
│   │   │   │   ├── scoring.ts      # ScoringService — prevalence-weighted algorithm
│   │   │   │   ├── learning-path.ts # LearningPathService — path generation
│   │   │   │   ├── badge.ts        # Open Badges v3 via Badgr
│   │   │   │   ├── lti.ts          # LTI 1.3 grade passback
│   │   │   │   ├── sso.ts          # SAML + OIDC per-org config
│   │   │   │   └── export.ts       # GDPR data export
│   │   │   ├── workers/
│   │   │   │   ├── badge-issuance.ts
│   │   │   │   ├── pdf-generation.ts
│   │   │   │   └── lti-grade-passback.ts
│   │   │   └── utils/
│   │   │       ├── errors.ts       # AppError + RFC 7807 error factory
│   │   │       ├── crypto.ts       # timingSafeEqual, SHA-256 helpers
│   │   │       └── logger.ts       # Pino with PII redaction
│   │   ├── tests/                  # Jest test suites (mirrors src/)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Data model
│   │   │   └── migrations/         # Prisma migration history
│   │   └── package.json
│   └── web/                        # Next.js 14 App Router (port 3118)
│       ├── src/
│       │   ├── app/                # 19 App Router routes
│       │   │   ├── (auth)/         # login, register, verify-email
│       │   │   ├── dashboard/      # org + team dashboards
│       │   │   ├── assess/         # assessment flow
│       │   │   ├── profile/        # fluency profile view
│       │   │   ├── learn/          # learning paths
│       │   │   └── certificates/   # credential verification
│       │   ├── components/
│       │   │   ├── layout/         # Sidebar, DashboardLayout, Header
│       │   │   ├── auth/           # LoginForm, RegisterForm, ProtectedRoute
│       │   │   └── ui/             # Button, Card, DataTable (from @connectsw/ui)
│       │   ├── hooks/
│       │   │   ├── useAuth.ts      # Authentication state + actions
│       │   │   └── useApi.ts       # TanStack Query wrappers for API calls
│       │   └── lib/
│       │       ├── api.ts          # Typed API client (axios-based)
│       │       └── i18n.ts         # Internationalization setup
│       ├── tests/                  # React Testing Library tests
│       └── package.json
├── e2e/                            # Playwright end-to-end tests
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── assessment.spec.ts
│   │   └── learning-path.spec.ts
│   └── package.json
├── docs/
│   ├── PRD.md                      # Product Requirements Document
│   ├── API.md                      # This file's companion — full API reference
│   ├── DEVELOPMENT.md              # Developer guide for contributors
│   ├── architecture.md             # Full C4 diagrams + sequence diagrams
│   ├── api-schema.yml              # OpenAPI 3.0 specification
│   ├── plan.md                     # Implementation plan (spec-kit)
│   ├── tasks.md                    # Task list (spec-kit)
│   └── ADRs/                       # Architecture Decision Records
├── docker-compose.yml              # Local dev: PostgreSQL + Redis
├── .claude/
│   └── addendum.md                 # Product-specific agent conventions
└── README.md                       # This file
```

---

## 6. Key Concepts

### 4D AI Fluency Framework

The assessment is built on Anthropic's 4D AI Fluency Framework, which identifies four dimensions of effective human-AI collaboration:

| Dimension | Definition | Example Behaviors |
|-----------|-----------|------------------|
| **Delegation** | Knowing when and what to delegate to AI | Identifying tasks where AI adds value; breaking complex tasks into AI-suitable subtasks |
| **Description** | Communicating effectively with AI | Writing clear, context-rich prompts; iterating on outputs through structured feedback |
| **Discernment** | Evaluating AI outputs critically | Spotting hallucinations; identifying missing context; verifying AI reasoning |
| **Diligence** | Using AI responsibly and ethically | Privacy-aware prompting; bias awareness; maintaining human accountability |

Each dimension contains 6 behavioral indicators (24 total). 11 indicators are directly observable via scenario questions; 13 are self-reported via Likert scales.

### Multi-Tenancy via PostgreSQL RLS

Every organization's data is isolated at the database layer using PostgreSQL Row Level Security (RLS). This means:

- A bug in application code cannot expose one org's data to another
- The database enforces isolation even if `WHERE` clauses are omitted
- The API sets a session variable (`app.current_org_id`) before every query
- Application code uses the `api_service_rls` database role (RLS enforced)
- Migrations use the `api_service` role (RLS bypassed)

See `docs/architecture.md` — Multi-Tenancy Architecture section for the full SQL policy definitions.

### Prevalence-Weighted Scoring

Standard assessments weight all questions equally. AI Fluency uses prevalence weights — derived from observational research into how commonly each behavior appears in high-performing AI collaborators. More prevalent behaviors receive higher weight in the dimension score.

**Score formula:**

```
Indicator score:
  Scenario question  = 0.0 (incorrect) | 0.5 (partial) | 1.0 (correct)
  Self-report Likert = (answer - 1) / 4   [normalizes 1–5 to 0.0–1.0]

Dimension score = Σ(indicatorScore × prevalenceWeight) / Σ(prevalenceWeight)

Overall score   = Σ(dimensionScore × dimensionWeight) × 100
```

### Observed vs Self-Reported Scores

The fluency profile separates two score types:

- **Observed scores**: Derived from scenario questions where there is a correct answer. These reflect demonstrated capability.
- **Self-reported scores**: Derived from Likert scale questions for the 13 behaviors that cannot be assessed via scenario (e.g., "I always check AI outputs for bias"). These reflect self-perception.

Both are displayed on the profile with visual distinction to avoid conflating demonstrated and claimed fluency.

### Discernment Gap Detection

A Discernment Gap is flagged when a learner fails both:
1. `DELEGATION_REASONING` indicator (cannot identify when AI reasoning is flawed)
2. `DISCERNMENT_MISSING_CONTEXT` indicator (does not notice when AI lacks key information)

When detected, the "Question AI Reasoning" module is prepended to the learning path — before all other Discernment content — because this is the foundational critical thinking skill required for the other modules to be effective.

---

## 7. Environment Variables

All variables are required unless marked optional. The app fails fast with a descriptive error if any required variable is missing (enforced by `config.ts` Zod schema).

### Backend (`apps/api/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection — uses `api_service_rls` role (RLS enforced) | `postgresql://api_service_rls:pw@localhost:5432/ai_fluency_dev` |
| `DATABASE_ADMIN_URL` | PostgreSQL connection — uses `api_service` role (RLS bypassed, migrations only) | `postgresql://api_service:pw@localhost:5432/ai_fluency_dev` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | HS256 secret or RS256 private key — generate with `openssl rand -base64 64` | `<64-byte base64 string>` |
| `JWT_REFRESH_SECRET` | Separate secret for refresh tokens | `<64-byte base64 string>` |
| `JWT_ACCESS_EXPIRY` | Access token TTL in seconds | `900` (15 minutes) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL in seconds | `604800` (7 days) |
| `SENDGRID_API_KEY` | SendGrid API key for email delivery | `SG.xxx` |
| `EMAIL_FROM` | Sender address for transactional email | `noreply@ai-fluency.connectsw.com` |
| `S3_BUCKET` | S3 bucket name for certificate PDFs and avatars | `ai-fluency-assets` |
| `S3_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | `xxx` |
| `BADGR_API_URL` | Badgr API base URL | `https://api.badgr.io` |
| `BADGR_API_TOKEN` | Badgr API token for badge issuance | `xxx` |
| `BADGR_ISSUER_ID` | Your Badgr issuer ID | `xxx` |
| `SSO_ENCRYPTION_KEY` | AES-256-GCM key for encrypting SSO config secrets at rest (32-byte hex) | `<64-char hex string>` |
| `POSTHOG_API_KEY` | PostHog API key (optional in dev) | `phc_xxx` |
| `NODE_ENV` | Environment | `development` |

### Frontend (`apps/web/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5014` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog key for client-side analytics (optional in dev) | `phc_xxx` |

---

## 8. Contributing

### Branch Naming

```
feature/ai-fluency/[feature-name]   # New features
fix/ai-fluency/[issue-id]           # Bug fixes
docs/ai-fluency/[description]       # Documentation
```

### Commit Format

```
type(scope): description [US-XX][FR-XXX]
```

| Type | When to Use |
|------|------------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `test` | Test additions or corrections |
| `docs` | Documentation only |
| `refactor` | Code restructuring without behavior change |
| `chore` | Tooling, config, dependency updates |

**Examples:**

```bash
feat(assess): implement session start endpoint [US-01][FR-001]
test(scoring): add prevalence-weighted scoring unit tests [US-03][FR-002]
fix(rls): use SET LOCAL instead of SET for PgBouncer compatibility [FR-016]
docs(api): add authentication sequence diagram [DOCS-01]
```

Traceability IDs (US-XX, FR-XXX) are enforced by the commit-msg hook. Arch and chore commits may skip with `SKIP_TRACEABILITY=1`.

### PR Process

1. Work on a feature branch (never directly on `main`)
2. Follow TDD: write tests first, then implementation
3. Ensure all tests pass: `npm test` in both `apps/api` and `apps/web`
4. Run the linter: `npm run lint`
5. Open a PR targeting `main`
6. PR description must reference the relevant user stories and functional requirements
7. Docs must be updated alongside code — documentation is a first-class deliverable

### Development Guide

For detailed development setup, testing conventions, code standards, and troubleshooting, see:

- `docs/DEVELOPMENT.md` — Full developer guide
- `docs/API.md` — Complete API reference
- `docs/architecture.md` — Architecture diagrams and decisions
- `.claude/addendum.md` — Product-specific agent conventions
