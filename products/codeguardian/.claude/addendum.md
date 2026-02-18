# CodeGuardian -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on CodeGuardian.

## Product Overview

**Name**: CodeGuardian
**Tagline**: Multi-Model AI Code Review & Security Platform
**Type**: Web App (Full B2B SaaS Product)
**Status**: PRD Complete
**Product Directory**: `products/codeguardian/`
**Frontend Port**: 3115
**Backend Port**: 5011
**Database**: PostgreSQL (database name: `codeguardian_dev`)
**Redis**: Shared Redis instance (6379) -- used for job queue and caching

**What It Does**: CodeGuardian is a multi-model AI code review and security platform that integrates with GitHub pull requests. When a developer opens or updates a PR, CodeGuardian automatically extracts the diff, routes different analysis types (security, logic, performance, style) to specialized AI models, aggregates their findings, calculates a quality score (0-100), and posts review comments directly on the PR with inline suggestions. A web dashboard provides review history, team analytics, and quality trend charts.

**Key Differentiator**: The multi-model ensemble routing engine. Unlike competitors that use a single AI model for all checks, CodeGuardian routes security checks to security-specialized models, logic checks to reasoning models, performance checks to optimization models, and style checks to fast/efficient models. This produces higher-accuracy reviews.

**Target Users**: Individual developers, tech leads, security engineers, VPs of Engineering.

**Monetization**:
- Free: 5 PRs/month, 1 repo
- Pro: $49/user/month, unlimited PRs and repos, team analytics
- Enterprise: $199/user/month, SSO, audit logs, custom models

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Runtime | Node.js | 20+ | LTS |
| Language | TypeScript | 5+ | Strict mode |
| Backend Framework | Fastify | 4.x | Plugins for webhooks, auth, billing |
| Frontend Framework | Next.js | 14+ | App Router, Server Components |
| UI Library | React | 18+ | Client components for interactivity |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 5.x | Schema-first, migrations |
| Job Queue | Bull / BullMQ | 5.x | Redis-backed, for review processing |
| Cache | Redis | 7.x | Session cache, rate limiting, job queue |
| Styling | Tailwind CSS | 3.x | Utility-first |
| UI Components | shadcn/ui | Latest | Accessible, composable components |
| Charts | Recharts | 2.x | Dashboard trend charts |
| Auth | GitHub OAuth 2.0 | - | Authorization code + PKCE |
| Payments | Stripe | - | Checkout, subscriptions, webhooks |
| Email | SendGrid | - | Transactional notifications |
| Testing (Unit) | Jest | 29+ | Backend + Frontend |
| Testing (Component) | React Testing Library | 14+ | Frontend components |
| Testing (E2E) | Playwright | 1.x | Full user flows |
| AI Providers | Anthropic, OpenAI, Google | - | Multi-model routing |

## Site Map

| Route | Status | Purpose | Key Elements |
|-------|--------|---------|--------------|
| `/` | MVP | Landing page | Hero, features grid, pricing preview, CTA "Get Started Free" |
| `/login` | MVP | GitHub OAuth login | "Sign in with GitHub" button, redirect to GitHub OAuth |
| `/auth/callback` | MVP | OAuth callback handler | Processes GitHub OAuth code, creates session, redirects |
| `/onboarding` | MVP | Post-signup setup wizard | Step 1: Install GitHub App. Step 2: Select repos. Step 3: "Open a PR!" |
| `/onboarding/install` | MVP | GitHub App installation redirect | Redirects to GitHub App install page |
| `/dashboard` | MVP | Main dashboard overview | Total reviews, avg score, score trend chart, recent reviews, top issues |
| `/dashboard/reviews` | MVP | Review list | Filterable/sortable table: repo, PR, score, status, date. Pagination. |
| `/dashboard/reviews/:id` | MVP | Review detail | Score breakdown, findings list, diff viewer with annotations, link to GitHub PR |
| `/dashboard/repositories` | MVP | Repository list | All repos with monitoring toggles, last review date, avg score |
| `/dashboard/repositories/:id` | MVP | Repository detail | Repo-specific review history, score trend, settings |
| `/dashboard/repositories/:id/settings` | MVP | Repository settings | Monitoring toggle, routing config, score threshold, block-on-critical toggle |
| `/dashboard/team` | MVP | Team analytics | Per-member review counts, avg scores, most common issues, team trend |
| `/dashboard/team/members/:id` | MVP | Team member detail | Member's review history, score trend, top recurring issues |
| `/dashboard/analytics` | MVP | Organization analytics | Org-wide score trends, per-repo comparison, top issues across org |
| `/dashboard/settings` | MVP | Account settings | Profile (from GitHub), notification preferences, connected accounts |
| `/dashboard/settings/billing` | MVP | Billing & subscription | Current plan, usage (PRs this month), upgrade/downgrade buttons, invoices |
| `/dashboard/settings/organization` | MVP | Organization settings | Org name, default routing config, member management |
| `/dashboard/settings/security` | Phase 2 | Security policies | OWASP rule toggles, severity thresholds, blocking rules (Coming Soon) |
| `/dashboard/settings/integrations` | Phase 2 | Third-party integrations | Slack, Teams, Jira integration setup (Coming Soon) |
| `/dashboard/settings/sso` | Enterprise | SSO configuration | SAML/OIDC setup for enterprise customers (Coming Soon) |
| `/dashboard/settings/audit-log` | Enterprise | Audit log viewer | Filterable log of all security-relevant events (Coming Soon) |
| `/pricing` | MVP | Pricing page | Three-tier comparison table, FAQ, "Get Started" and "Contact Sales" CTAs |
| `/docs` | MVP | Documentation hub | Getting started guide, links to API reference, SDK docs |
| `/docs/api` | MVP | API reference | Endpoint documentation with request/response examples |
| `/docs/github-app` | MVP | GitHub App setup guide | Step-by-step installation instructions with screenshots |
| `/docs/scoring` | MVP | Scoring methodology | How the 0-100 score is calculated, weight explanation, severity deductions |
| `/docs/security` | MVP | Security detection docs | OWASP Top 10 mapping, what CodeGuardian detects, examples |
| `/privacy` | MVP | Privacy policy | Data handling, AI provider data processing, GDPR compliance |
| `/terms` | MVP | Terms of service | Usage terms, SLA details per tier |

### Component Structure (Planned)

```
apps/web/src/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public marketing pages
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/page.tsx      # Pricing page
│   │   ├── privacy/page.tsx      # Privacy policy
│   │   └── terms/page.tsx        # Terms of service
│   ├── (auth)/                   # Auth pages
│   │   ├── login/page.tsx        # Login page
│   │   └── auth/callback/page.tsx # OAuth callback
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # App layout (sidebar + header)
│   │   ├── onboarding/           # Onboarding wizard
│   │   ├── dashboard/            # Dashboard pages
│   │   │   ├── page.tsx          # Overview
│   │   │   ├── reviews/          # Review list + detail
│   │   │   ├── repositories/     # Repo list + detail + settings
│   │   │   ├── team/             # Team analytics
│   │   │   ├── analytics/        # Org analytics
│   │   │   └── settings/         # Account, billing, org settings
│   │   └── docs/                 # Documentation pages
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── layout/                   # Header, Sidebar, Footer
│   ├── dashboard/                # Dashboard-specific components
│   │   ├── ScoreCard.tsx         # Quality score display (0-100)
│   │   ├── ScoreTrend.tsx        # Line chart of scores over time
│   │   ├── FindingsList.tsx      # Sortable/filterable findings table
│   │   ├── ReviewSummary.tsx     # Single review overview card
│   │   └── TopIssues.tsx         # Most common issues chart
│   ├── review/                   # Review detail components
│   │   ├── DiffViewer.tsx        # Code diff with annotations
│   │   ├── FindingCard.tsx       # Individual finding display
│   │   └── ScoreBreakdown.tsx    # Category score breakdown
│   └── onboarding/               # Onboarding wizard steps
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts                # Auth state and actions
│   ├── useReviews.ts             # Review data fetching
│   └── useDashboard.ts           # Dashboard data fetching
├── lib/                          # Utilities
│   ├── api.ts                    # API client (fetch wrapper)
│   ├── auth.ts                   # Auth helpers
│   └── format.ts                 # Date, number formatting
└── types/                        # TypeScript type definitions
    ├── review.ts
    ├── finding.ts
    ├── repository.ts
    └── user.ts
```

```
apps/api/src/
├── app.ts                        # Fastify app factory
├── server.ts                     # Server entry point (port 5011)
├── plugins/
│   ├── auth.ts                   # JWT + GitHub OAuth plugin
│   ├── cors.ts                   # CORS configuration
│   ├── database.ts               # Prisma client plugin
│   ├── redis.ts                  # Redis connection plugin
│   ├── rate-limit.ts             # Rate limiting plugin
│   └── error-handler.ts          # Global error handler
├── routes/
│   ├── auth/                     # /auth/* endpoints
│   │   ├── github-redirect.ts
│   │   └── github-callback.ts
│   ├── webhooks/                 # /webhooks/* endpoints
│   │   ├── github.ts             # PR webhook handler
│   │   └── stripe.ts             # Billing webhook handler
│   ├── reviews/                  # /api/reviews/* endpoints
│   │   ├── list.ts
│   │   └── detail.ts
│   ├── repositories/             # /api/repositories/* endpoints
│   │   ├── list.ts
│   │   ├── detail.ts
│   │   └── settings.ts
│   ├── dashboard/                # /api/dashboard/* endpoints
│   │   ├── stats.ts
│   │   └── team.ts
│   ├── billing/                  # /api/billing/* endpoints
│   │   ├── checkout.ts
│   │   └── subscription.ts
│   └── health.ts                 # /health endpoint
├── services/
│   ├── review/
│   │   ├── review-service.ts     # Review orchestration
│   │   ├── diff-extractor.ts     # GitHub diff extraction
│   │   └── comment-poster.ts     # Post comments to GitHub
│   ├── model-router/
│   │   ├── router.ts             # Model routing engine
│   │   ├── providers/
│   │   │   ├── anthropic.ts      # Anthropic API client
│   │   │   ├── openai.ts         # OpenAI API client
│   │   │   └── google.ts         # Google AI client
│   │   └── aggregator.ts         # Finding aggregation
│   ├── scoring/
│   │   └── scorer.ts             # Quality score calculator
│   ├── billing/
│   │   └── stripe-service.ts     # Stripe integration
│   └── github/
│       ├── app-service.ts        # GitHub App management
│       └── oauth-service.ts      # OAuth flow handling
├── workers/
│   └── review-worker.ts          # Bull queue worker for reviews
├── middleware/
│   ├── auth-guard.ts             # JWT verification middleware
│   └── webhook-verify.ts         # Webhook signature verification
└── types/
    └── index.ts                  # Shared type definitions
```

## Business Logic

### Quality Scoring Algorithm

Every reviewed PR receives a composite quality score from 0 to 100.

**Formula**:
```
Total Score = (Security Score * 0.35) + (Logic Score * 0.30) + (Performance Score * 0.20) + (Style Score * 0.15)
```

**Category Score Calculation** (each starts at 100):
```
Category Score = max(0, 100 - sum_of_deductions)

Deductions per finding:
  Critical: -25 points
  High:     -15 points
  Medium:   -8 points
  Low:      -3 points
  Info:     -0 points (informational, no score impact)
```

**Example**:
- A PR has: 1 High security finding, 2 Medium logic findings, 1 Low style finding
- Security Score: 100 - 15 = 85
- Logic Score: 100 - 8 - 8 = 84
- Performance Score: 100 (no findings)
- Style Score: 100 - 3 = 97
- Total: (85 * 0.35) + (84 * 0.30) + (100 * 0.20) + (97 * 0.15) = 29.75 + 25.2 + 20.0 + 14.55 = **89.5 => 90**

**Score Interpretation**:

| Range | Label | Color | Action |
|-------|-------|-------|--------|
| 90-100 | Excellent | Green | Merge-ready |
| 75-89 | Good | Blue | Minor improvements recommended |
| 60-74 | Needs Work | Yellow | Address findings before merge |
| 40-59 | Poor | Orange | Significant issues found |
| 0-39 | Critical | Red | Blocking issues, do not merge |

### Multi-Model Routing Logic

The routing engine determines which AI model handles each analysis category.

**Default Routing Table**:

| Check Type | Purpose | Primary Model | Fallback Model | Timeout | Prompt Strategy |
|-----------|---------|--------------|----------------|---------|-----------------|
| Security | OWASP Top 10, CVE detection, secrets scanning | Claude Sonnet | GPT-4o | 30s | Security-focused system prompt with OWASP taxonomy |
| Logic | Business logic errors, null checks, edge cases, error handling | Claude Opus | Claude Sonnet | 45s | Reasoning-focused prompt with code flow analysis |
| Performance | N+1 queries, memory leaks, algorithmic complexity, caching opportunities | GPT-4o | Claude Sonnet | 30s | Performance-focused prompt with Big-O analysis |
| Style | Naming conventions, code organization, readability, unused imports | Claude Haiku | GPT-4o-mini | 15s | Style guide prompt (configurable per org) |

**Routing Process**:
1. Worker dequeues a review job from Redis.
2. Diff is split into chunks (max 500 lines per chunk).
3. For each chunk, 4 parallel requests are made (one per check type).
4. Each request goes to the primary model for that check type.
5. If the primary model fails (timeout or error), retry once with exponential backoff.
6. If retry fails, fall back to the fallback model.
7. If the fallback also fails, mark that check type as "skipped" and proceed with available results.
8. All findings from all chunks and all check types are collected by the aggregator.
9. Duplicate/overlapping findings are deduplicated by file path + line range.
10. The scorer calculates the composite score.
11. Results are posted to GitHub and stored in the database.

**Chunk Splitting Rules**:
- Diffs under 500 lines: single chunk, no splitting.
- Diffs 500-2000 lines: split by file (each file is a chunk).
- Diffs over 2000 lines: split by file, then further split files over 500 lines at logical boundaries (function definitions, class definitions).
- Maximum 20 chunks per review (to bound cost). If exceeded, warn the user that the diff is too large for a complete review.

### Billing Rules

**Free Tier Enforcement**:
- Each user gets 5 PR reviews per calendar month.
- Counter resets on the 1st of each month at 00:00 UTC.
- When the limit is reached, new PRs are acknowledged (webhook returns 200) but not reviewed.
- The user receives an email notification: "You have used all 5 free reviews this month. Upgrade to Pro for unlimited reviews."
- The PR status check is set to "pending" with description: "CodeGuardian: Monthly limit reached. Upgrade for unlimited reviews."

**Pro Tier**:
- Unlimited PR reviews.
- Billed per user seat per month ($49/seat).
- Minimum 1 seat. Organization owner can add/remove seats.
- Prorated billing: adding a seat mid-cycle charges the remaining portion of the month.
- Grace period: if payment fails, 14 days to update payment method. During grace period, features remain active. After 14 days, downgrade to Free.

**Enterprise Tier**:
- Unlimited PR reviews.
- Billed per user seat per month ($199/seat).
- Minimum 5 seats. Annual commitment option with 15% discount.
- Custom contract via sales team.
- Net-30 payment terms.
- Non-payment triggers suspension (read-only access) after 30 days, termination after 60 days.

**Subscription Lifecycle Events** (tracked via Stripe webhooks):

| Stripe Event | CodeGuardian Action |
|-------------|---------------------|
| `checkout.session.completed` | Create/upgrade subscription, activate features |
| `invoice.paid` | Record payment, extend billing period |
| `invoice.payment_failed` | Send warning email, start 14-day grace period |
| `customer.subscription.updated` | Update seat count, plan tier |
| `customer.subscription.deleted` | Downgrade to Free at period end |

### GitHub App Permissions

The CodeGuardian GitHub App requires the following permissions:

| Permission | Access | Purpose |
|-----------|--------|---------|
| Pull requests | Read & Write | Read PR diffs, post review comments |
| Checks | Read & Write | Post status checks (pass/fail) |
| Contents | Read | Read file contents for context |
| Metadata | Read | Repository and organization metadata |
| Members | Read | Organization member list for team features |

**Webhook Events Subscribed**:
- `pull_request` (opened, synchronize, reopened, closed)
- `installation` (created, deleted, suspend, unsuspend)
- `installation_repositories` (added, removed)

### Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| API (per user) | 100 requests | 1 minute |
| API (per organization) | 1,000 requests | 1 minute |
| Webhook processing | 50 concurrent jobs | System-wide |
| AI model calls (per provider) | Governed by provider limits | Varies |

Rate limit headers are returned on every API response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1708300800
```

### Data Retention

| Plan | Review Data | Analytics | Audit Logs |
|------|------------|-----------|------------|
| Free | 30 days | 30 days | N/A |
| Pro | 1 year | 1 year | N/A |
| Enterprise | Unlimited | Unlimited | Unlimited |

When retention expires, review data and findings are soft-deleted (marked for deletion) and purged by a nightly cleanup job 7 days later.

### Environment Variables (Expected)

```bash
# Server
PORT=5011
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://postgres@localhost:5432/codeguardian_dev

# Redis
REDIS_URL=redis://localhost:6379

# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_APP_ID=xxx
GITHUB_APP_PRIVATE_KEY=xxx
GITHUB_WEBHOOK_SECRET=xxx

# AI Providers
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx
GOOGLE_AI_API_KEY=xxx

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
STRIPE_PRO_PRICE_ID=xxx
STRIPE_ENTERPRISE_PRICE_ID=xxx

# Email
SENDGRID_API_KEY=xxx

# JWT
JWT_SECRET=xxx
JWT_EXPIRY=7d

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5011
NEXT_PUBLIC_GITHUB_CLIENT_ID=xxx
```

### Conventions

- **File naming**: kebab-case for files (`review-service.ts`), PascalCase for components (`ScoreCard.tsx`).
- **Database naming**: snake_case for tables and columns (Prisma convention with `@@map`).
- **API naming**: REST, kebab-case paths (`/api/reviews/:id`), camelCase JSON keys.
- **Error responses**: Standard format: `{ "error": { "code": "REVIEW_NOT_FOUND", "message": "...", "statusCode": 404 } }`.
- **Logging**: Pino (Fastify default). Structured JSON logs. Request ID tracing.
- **Testing**: Jest for unit/integration. Playwright for E2E. No mocks -- real database, real Redis.
