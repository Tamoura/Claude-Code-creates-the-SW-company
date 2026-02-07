# Pulse -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on Pulse.

## Product Overview

**Name**: Pulse
**Type**: Web App + Mobile App (Full SaaS Product)
**Status**: Pre-Development (PRD Complete)
**Product Directory**: `products/pulse/`
**Frontend Port**: 3106
**Backend Port**: 5003
**Mobile Port**: 8081
**Database**: PostgreSQL (database name: `pulse_dev`)

**What It Does**: Pulse is an AI-Powered Developer Intelligence Platform. It connects to GitHub repositories via OAuth, ingests commit/PR/deployment activity data, and presents real-time dashboards showing team velocity, code quality trends, and AI-predicted sprint risks. Engineering leaders get a daily "pulse" on their team's health through a web dashboard, real-time WebSocket-powered activity feeds, and mobile push notifications for anomalies.

**Target Users**: Engineering Managers, Tech Leads, Senior Developers, VPs of Engineering.

**Monetization**: Free-only for MVP. Planned paid tiers:
- Free: 3 repos, 1 team, 7-day retention
- Pro ($15/user/month): 20 repos, 90-day retention, mobile, AI risk
- Team ($25/user/month): Unlimited repos, 12-month retention, Slack
- Enterprise (custom): SSO/SAML, on-prem, SLA

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing page (value prop, feature highlights, CTA) |
| `/signup` | MVP | Registration (email/password + GitHub OAuth) |
| `/login` | MVP | Login |
| `/forgot-password` | MVP | Password reset request |
| `/reset-password` | MVP | Password reset with token |
| `/verify-email` | MVP | Email verification |
| `/dashboard` | MVP | Main dashboard (risk score, velocity cards, activity feed, repo status) |
| `/dashboard/activity` | MVP | Real-time activity feed (WebSocket, filters) |
| `/dashboard/velocity` | MVP | Team velocity metrics (PR merge chart, cycle time, review time) |
| `/dashboard/quality` | MVP | Code quality trends (coverage, PR size, review comments) |
| `/dashboard/risk` | MVP | AI sprint risk (gauge, explanation, factors, recommendations) |
| `/dashboard/risk/history` | MVP | Risk score history (line chart, event correlation) |
| `/dashboard/repos` | MVP | Connected repositories (cards with status, add/remove) |
| `/dashboard/repos/:id` | MVP | Single repository detail |
| `/dashboard/team` | MVP | Team overview (member list, velocity cards, review load) |
| `/dashboard/team/:id` | MVP | Individual member view |
| `/dashboard/settings` | MVP | Account settings (profile, GitHub connection) |
| `/dashboard/settings/notifications` | MVP | Notification preferences (toggles, quiet hours) |
| `/dashboard/settings/team` | MVP | Team management (invite, roles, remove) |
| `/dashboard/overview` | MVP | Cross-team overview (VP view, team risk cards) |
| `/pricing` | MVP | Pricing page (plan comparison, FAQ) |
| `/docs` | MVP | Documentation |
| `/dashboard/settings/billing` | Phase 2 | Subscription management |
| `/dashboard/integrations` | Phase 2 | Jira, Linear, Slack connections |
| `/dashboard/goals` | Phase 2 | Team goals and targets |
| `/dashboard/reports` | Phase 2 | Scheduled reports and exports |

## Business Logic

### GitHub OAuth Flow

1. User clicks "Connect GitHub" on settings page.
2. Redirect to `https://github.com/login/oauth/authorize` with scopes: `repo`, `read:org`, `read:user`.
3. GitHub redirects back with authorization code.
4. Backend exchanges code for access token via `POST https://github.com/login/oauth/access_token`.
5. Access token stored encrypted (AES-256) in database, associated with user.
6. Token used for API calls and webhook setup.

### Repository Ingestion Process

1. User selects repositories to monitor from the available list.
2. System registers webhooks on selected repos (push, pull_request, deployment, deployment_status).
3. Background job fetches last 90 days of historical data using GitHub REST API:
   - Commits: `GET /repos/{owner}/{repo}/commits`
   - Pull Requests: `GET /repos/{owner}/{repo}/pulls?state=all`
   - Deployments: `GET /repos/{owner}/{repo}/deployments`
4. Data stored in normalized format (Commit, PullRequest, Deployment, Review models).
5. Most recent 30 days loaded first for immediate visibility; older data backfilled.
6. Progress tracked per-repo with percentage; visible to user on dashboard.

### GitHub API Rate Limit Strategy

- GitHub allows 5,000 requests/hour per authenticated user.
- Budget: consume no more than 80% of rate limit (4,000 req/hour).
- Use conditional requests (If-None-Match/ETag) to avoid consuming quota for unchanged data.
- Prioritize webhook-driven real-time data over polling for updates.
- For initial ingestion of large repos: paginate with 100 items/page, respect `X-RateLimit-Remaining`.
- If rate limit is within 10% of exhaustion: pause ingestion, resume after reset window.

### Metric Calculation Rules

**PRs Merged Per Week**:
- Count PRs with `merged_at` timestamp falling within the week (Monday 00:00 UTC to Sunday 23:59 UTC).
- Attribute to the PR author, not the merger.
- Group by team, repository, or individual developer as requested.

**Cycle Time**:
- Calculated as `merged_at - created_at` for each merged PR.
- Reported as median (not mean) to reduce impact of outliers.
- Computed daily for the trailing 7-day window.
- Excludes PRs tagged as "draft" while in draft state (time starts when draft is removed).

**Time-to-First-Review**:
- Calculated as `first_review_submitted_at - pr_created_at`.
- "Review" includes both comments and approvals, but not bot comments.
- Reported as median daily for trailing 7-day window.

**Test Coverage**:
- Extracted from GitHub Checks API (`check_runs` with coverage data).
- Falls back to parsing coverage artifacts if Checks API data is unavailable.
- Stored as a percentage with 1 decimal place precision (e.g., 87.3%).
- One data point per commit that triggers CI; not every commit has coverage.

**PR Size**:
- Calculated as `additions + deletions` from the GitHub PR API.
- Categorized: Small (<100 lines), Medium (100-500), Large (500-1000), XL (>1000).

### Sprint Risk Scoring Algorithm

The risk score is a weighted composite of individual risk factors:

| Factor | Weight | Threshold for Concern |
|--------|--------|----------------------|
| Velocity trend (PRs merged vs sprint average) | 25% | <70% of sprint average pace |
| PR review backlog (PRs open >24h without review) | 20% | >3 PRs waiting |
| Cycle time trend (vs 4-week average) | 15% | >150% of 4-week average |
| Commit frequency drop (vs sprint average) | 15% | >40% drop day-over-day |
| Test coverage delta (vs sprint start) | 10% | >3% decrease |
| Large PR ratio (>500 lines) | 10% | >30% of open PRs |
| Review load imbalance (max/min reviews per person) | 5% | >3:1 ratio |

Each factor produces a sub-score (0-100). The overall risk score is the weighted sum, capped at 100.

**Natural Language Explanation**: Generated using a template system with variable slots:
- "Sprint risk is [score] ([low/medium/high]). Top factors: [factor 1] ([detail]), [factor 2] ([detail]), [factor 3] ([detail])."
- Example: "Sprint risk is 72 (high). Top factors: PR review backlog (5 PRs waiting >24h, longest: PR #142 at 52h), velocity trend (only 4 of 12 expected PRs merged with 3 days remaining), commit frequency drop (35% below sprint average today)."

### Anomaly Detection Rules

| Anomaly | Trigger | Severity | Notification |
|---------|---------|----------|-------------|
| Commit frequency drop | >50% fewer commits than same day last week | Medium | Push notification to managers |
| Stalled PR | PR open >48 hours without any review activity | High | Push notification to PR author and assigned reviewers |
| Coverage drop | >5% decrease in test coverage in a single commit | High | Push notification to commit author and tech lead |
| Risk score spike | Risk score increases by >15 points in a single calculation | High | Push notification to managers |
| Review load imbalance | One team member has >3x the review load of another | Low | In-app alert only (no push) |

### Notification Delivery

- Push notifications sent via APNs (iOS) and FCM (Android).
- Quiet hours: user-configured window (default: 10pm-7am local time). Notifications queued during quiet hours are delivered as a batch at the end of the quiet window.
- Notification preferences stored per user with category-level toggles.
- All notifications also appear in the in-app notification center (retained for 30 days).
- Email digest: optional daily or weekly summary email (disabled by default).

### RBAC Model

| Role | Permissions |
|------|------------|
| Admin | Full access: manage team, connect/disconnect repos, configure settings, view all data |
| Member | View team data, connect personal repos, configure personal notifications |
| Viewer | Read-only access to dashboards and metrics, no configuration changes |

The first user to create a team is automatically assigned Admin role. Admins can invite others and assign roles. A team must always have at least 1 Admin.

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20+ | LTS |
| Language | TypeScript | 5+ | All code |
| Frontend | Next.js 14 + React 18 | 14.x / 18.x | App Router, SSR for public pages |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Components | shadcn/ui | latest | Built on Radix UI, accessible |
| Charts | Recharts or Chart.js | latest | Architect to decide in ADR |
| Backend | Fastify | 4.x | Plugin architecture with modules |
| ORM | Prisma | 5.x | Type-safe DB access |
| Database | PostgreSQL | 15+ | Database name: `pulse_dev` |
| Cache | Redis | 7.x | WebSocket state, rate limiting, metric caching |
| Real-time | fastify-websocket | latest | Room-based channels, JWT auth |
| Mobile | React Native (Expo) | latest | iOS + Android |
| Push Notifications | expo-notifications | latest | APNs + FCM |
| Auth | Custom JWT + bcrypt | - | 1hr access, 7d refresh, cost-12 bcrypt |
| Validation | Zod | 3.x | API input validation |
| Testing | Jest + RTL + Playwright | - | Unit, component, E2E |
| Linting | ESLint + Prettier | - | Company standard |
| Logging | Pino (via Fastify) | - | Structured JSON with correlation IDs |

### Libraries

| Package | Purpose |
|---------|---------|
| `@octokit/rest` | GitHub REST API client |
| `@octokit/webhooks` | GitHub webhook verification and parsing |
| `fastify-websocket` | WebSocket support for Fastify |
| `recharts` or `chart.js` | Interactive charts (TBD by Architect) |
| `bcrypt` | Password hashing |
| `jsonwebtoken` | JWT creation/verification |
| `zod` | Schema validation |
| `date-fns` | Date math (sprint boundaries, time ranges) |
| `ioredis` | Redis client for caching and pub/sub |
| `@fastify/cors` | CORS |
| `@fastify/helmet` | Security headers |
| `@fastify/rate-limit` | Rate limiting |
| `@fastify/cookie` | Cookie handling (refresh tokens) |
| `expo-notifications` | Push notifications (mobile) |
| `pino` | Structured logging (built into Fastify) |

### Ports

- **Frontend**: 3106 (http://localhost:3106)
- **Backend**: 5003 (http://localhost:5003)
- **Mobile**: 8081 (Expo default)
- **Database**: 5432 (shared PostgreSQL instance)
- **Redis**: 6379 (shared Redis instance)

## Architecture

### System Design

Three-tier architecture with real-time capabilities:

```
Browser -> Next.js (3106) -> Fastify API (5003) -> PostgreSQL
                                  |                     |
                          +-------+-------+         Redis (cache)
                          |       |       |
                       GitHub   WebSocket  Push
                        API     Broadcast  Notifications
                                           (APNs/FCM)

Mobile App (8081) -> Fastify API (5003) -> WebSocket
```

### Backend Module Structure

```
apps/api/src/modules/
  auth/        - Registration, login, JWT, GitHub OAuth
  repos/       - Repository CRUD, ingestion, webhook handling
  activity/    - Activity events, WebSocket broadcast
  velocity/    - Velocity metrics (PRs merged, cycle time, review time)
  quality/     - Code quality metrics (coverage, PR size, review comments)
  risk/        - AI sprint risk scoring, explanation generation
  team/        - Team management, invitations, RBAC
  notifications/ - Push notifications, preferences, anomaly detection
  health/      - Readiness/liveness checks
  overview/    - Cross-team VP view aggregation
```

Each module has: `routes.ts`, `handlers.ts`, `service.ts`, `schemas.ts`, `test.ts`

### Background Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Metric Aggregation | Hourly | Compute velocity and quality metrics from raw events |
| Risk Calculation | Every 4 hours (8am-8pm) | Run sprint risk scoring algorithm |
| Anomaly Detection | Every 15 minutes | Check for anomalous patterns in recent data |
| GitHub Sync | Every 30 minutes | Poll for events missed by webhooks (failsafe) |
| Data Cleanup | Daily at 2am | Archive data older than retention period |

### Design Patterns

- **Route-Handler-Service**: Routes define endpoints, handlers parse requests, services contain business logic. Services are testable independently.
- **Zod schemas at boundaries**: All API inputs validated with Zod before reaching handlers. All GitHub API responses validated before storage.
- **Event-driven architecture**: GitHub webhooks trigger events that flow through: webhook receiver -> event normalizer -> database storage -> metric recalculation -> WebSocket broadcast -> anomaly detection.
- **Room-based WebSocket**: Clients subscribe to rooms (team:123, repo:456). Events are broadcast only to relevant rooms. Reduces unnecessary network traffic.
- **Aggregation snapshots**: Raw events are stored permanently. Metrics are pre-computed into snapshot tables (MetricSnapshot) at regular intervals for fast dashboard queries.
- **Progressive loading**: Dashboard loads cached aggregates first (fast), then hydrates with real-time data via WebSocket (fresh).

### Data Models (Key Entities)

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| User | email, name, github_username, github_token (encrypted), role | has many Teams, Notifications, Sessions |
| Team | name, slug, timezone | has many Users (via TeamMember), Repositories |
| TeamMember | user_id, team_id, role (admin/member/viewer) | belongs to User + Team |
| Repository | github_id, name, full_name, language, default_branch, webhook_id | belongs to Team, has many Commits, PullRequests, Deployments |
| Commit | sha, message, author_github_username, committed_at, additions, deletions | belongs to Repository |
| PullRequest | github_id, number, title, state, author, created_at, merged_at, first_review_at, additions, deletions | belongs to Repository, has many Reviews |
| Review | github_id, pr_id, reviewer, state (approved/changes_requested/commented), submitted_at | belongs to PullRequest |
| Deployment | github_id, environment, status, created_at, commit_sha | belongs to Repository |
| MetricSnapshot | team_id, repo_id, metric_type, value, period_start, period_end | time-series metric data |
| RiskSnapshot | team_id, score, explanation, factors (JSON), calculated_at | sprint risk history |
| Notification | user_id, type, title, body, data (JSON), read, dismissed, created_at | belongs to User |
| NotificationPreference | user_id, category, enabled, quiet_start, quiet_end | belongs to User |

### Security

- JWT access tokens (1hr) + HttpOnly refresh token cookies (7d)
- bcrypt cost factor 12 for passwords
- GitHub OAuth tokens encrypted at rest (AES-256)
- WebSocket connections authenticated via JWT in handshake
- Rate limiting: auth (10/min/IP), API (100/min/user), webhooks (1000/min)
- GitHub webhook signature verification (HMAC SHA-256)
- All queries filtered by team membership (RBAC enforcement)
- Input validation (Zod) on all endpoints
- Security headers via @fastify/helmet
- CORS configured to allow only frontend origin

### Architecture Decision Records

- **ADR-001**: fastify-websocket for real-time (vs Socket.io, SSE)
- **ADR-002**: GitHub API polling + webhooks hybrid strategy
- **ADR-003**: Rule-based sprint risk scoring (vs ML model)
- **ADR-004**: Chart library selection (Recharts vs Chart.js)
- **ADR-005**: Redis for WebSocket state and metric caching

Full ADRs at: `products/pulse/docs/ADRs/`

### Key Documents

- PRD: `products/pulse/docs/PRD.md`
- Architecture: `products/pulse/docs/architecture.md` (TBD by Architect)
- API Schema: `products/pulse/docs/api-schema.yml` (TBD by Architect)
- DB Schema: `products/pulse/docs/db-schema.sql` (TBD by Architect)
- Task Graph: `products/pulse/.claude/task-graph.yml`

---

**Created by**: Product Manager
**Last Updated**: 2026-02-07
**Status**: PRD complete, pending CEO review and Architect handoff
