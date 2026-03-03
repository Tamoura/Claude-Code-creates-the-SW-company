# AI Fluency Platform — System Architecture

**Product**: ai-fluency
**Version**: 1.0.0
**Author**: Architect Agent
**Date**: 2026-03-03
**Ports**: Frontend 3118, Backend API 5014

---

## Table of Contents

1. [C4 Level 1 — System Context](#c4-level-1--system-context)
2. [C4 Level 2 — Container Diagram](#c4-level-2--container-diagram)
3. [C4 Level 3 — API Component Diagram](#c4-level-3--api-component-diagram)
4. [Assessment Flow — Sequence Diagram](#assessment-flow--sequence-diagram)
5. [Auth Flow — Sequence Diagram](#auth-flow--sequence-diagram)
6. [Learning Path Generation — Sequence Diagram](#learning-path-generation--sequence-diagram)
7. [Traceability Matrix](#traceability-matrix)
8. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
9. [Security Architecture](#security-architecture)
10. [Technology Decisions](#technology-decisions)
11. [Scalability Considerations](#scalability-considerations)

---

## C4 Level 1 — System Context

This diagram shows the AI Fluency Platform in its environment: who uses it, and what external systems it depends on.

```mermaid
graph TD
    subgraph Users["External Users"]
        learner["Alex — Individual Learner\nTakes assessments, views profile,\nfollows learning paths"]
        ldm["Lisa — L&D Manager\nManages teams, configures templates,\nviews team dashboards"]
        exec["David — C-Suite Executive\nViews org-level AI readiness,\nROI dashboards"]
        instructor["Prof. Sarah — University Instructor\nAssigns assessments, grade passback via LTI"]
        itadmin["Raj — IT Administrator\nConfigures SAML/OIDC SSO,\ndata retention policies"]
    end

    subgraph Platform["AI Fluency Platform\n(ConnectSW)"]
        aifluency["AI Fluency Platform\nEnterprise AI Fluency Assessment\n& Development System"]
    end

    subgraph External["External Systems"]
        idp["Enterprise Identity Provider\nOkta / Azure AD / ADFS\nSAML 2.0 / OIDC"]
        lms["LMS Platforms\nCanvas / Moodle / Blackboard\nLTI 1.3 / SCORM 2004"]
        email["Email Service\nSendGrid\nTransactional & Notification Email"]
        openbadges["Open Badges v3 Registry\nBadgr / Credly\nDigital Credential Issuance"]
        analytics["Product Analytics\nPostHog\nUsage & Funnel Tracking"]
    end

    learner -->|"HTTPS — Take assessments,\nview fluency profile"| aifluency
    ldm -->|"HTTPS — Configure teams,\nview dashboards"| aifluency
    exec -->|"HTTPS — View org dashboard,\nexport reports"| aifluency
    instructor -->|"HTTPS — Assign assessments,\nreceive grade passback"| aifluency
    itadmin -->|"HTTPS — SSO config,\ndata policy"| aifluency

    aifluency -->|"SAML assertions / OIDC tokens"| idp
    aifluency -->|"LTI 1.3 grade passback,\nSCORM xAPI"| lms
    aifluency -->|"SMTP / REST API"| email
    aifluency -->|"Open Badges v3 REST API"| openbadges
    aifluency -->|"Event capture (server-side)"| analytics

    style Platform fill:#1168bd,color:#fff
    style aifluency fill:#1168bd,color:#fff
```

---

## C4 Level 2 — Container Diagram

This diagram shows the high-level technical components (containers) that make up the AI Fluency Platform and how they communicate.

```mermaid
graph TD
    subgraph Browser["Web Browser"]
        spa["Next.js Web App\nReact 18 + Tailwind CSS\nPort 3118\nAssessment UI, dashboards,\nlearning paths, profiles"]
    end

    subgraph APILayer["API Layer"]
        api["Fastify API Server\nNode.js 20 + TypeScript 5\nPort 5014\nREST API with OpenAPI spec\nBusiness logic + auth"]
        worker["Background Worker\nNode.js process\nPDF generation, badge issuance,\nLMS grade passback queue"]
    end

    subgraph DataLayer["Data Layer"]
        pg["PostgreSQL 15\nPrimary data store\nRow Level Security (RLS)\nMulti-tenant isolation"]
        redis["Redis 7\nSession cache\nRate limit counters\nJob queue (BullMQ)"]
        storage["Object Storage\nS3-compatible\nCertificate PDFs\nAvatar images"]
    end

    subgraph ExternalServices["External Services"]
        idp["Identity Provider\nSAML 2.0 / OIDC"]
        lms["LMS Platforms\nLTI 1.3 Grade Passback"]
        sendgrid["SendGrid\nEmail Delivery"]
        badgr["Open Badges Registry\nDigital Credentials"]
    end

    spa -->|"REST + JSON / HTTPS"| api
    api -->|"Prisma ORM / SQL\n+ RLS policies"| pg
    api -->|"ioredis"| redis
    api -->|"AWS SDK / S3 API"| storage
    api -->|"BullMQ jobs"| redis
    worker -->|"Dequeues jobs"| redis
    worker -->|"Reads/writes"| pg
    worker -->|"SMTP via REST"| sendgrid
    worker -->|"Badge assertion REST"| badgr
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

## C4 Level 3 — API Component Diagram

This diagram shows the internal structure of the Fastify API server — its plugins, services, and route modules.

```mermaid
graph TD
    subgraph Fastify["Fastify API Server (apps/api/src/)"]
        subgraph Plugins["Core Plugins (registered in order)"]
            config["Config Plugin\nEnv var validation\n(NODE_ENV, DATABASE_URL,\nJWT_SECRET, REDIS_URL)"]
            prisma["Prisma Plugin\n@connectsw/shared/plugins/prisma\nPrismaClient lifecycle + RLS"]
            redisPlug["Redis Plugin\n@connectsw/shared/plugins/redis\nioredis with graceful fallback"]
            authPlug["Auth Plugin\n@connectsw/auth/backend\nJWT verification + session\nAdmin guard + org guard"]
            rlPlug["Rate Limit Plugin\n@fastify/rate-limit via Redis\nPer-IP + per-org limits"]
            obs["Observability Plugin\nPino logger + correlation IDs\nPrometheus /metrics endpoint"]
        end

        subgraph Routes["Route Modules (prefixed /api/v1/)"]
            authR["Auth Routes\n/auth/*\nregister, login, refresh,\nlogout, password reset"]
            orgR["Organization Routes\n/organizations/*\nCRUD + SSO config\nadmin only create"]
            teamR["Team Routes\n/teams/*\nCRUD + membership"]
            userR["User Routes\n/users/*\nprofile, GDPR delete, export"]
            tmplR["Template Routes\n/assessment-templates/*\nCRUD + role library"]
            sessR["Session Routes\n/assessment-sessions/*\nstart, responses, complete,\nresume (save-and-resume)"]
            profR["Profile Routes\n/fluency-profiles/*\nget profile, history"]
            learnR["Learning Path Routes\n/learning-paths/*\ngenerate, get, module complete"]
            dashR["Dashboard Routes\n/dashboard/*\norg + team aggregates"]
            certR["Certificate Routes\n/certificates/*\nget, verify, download PDF"]
            adminR["Admin Routes\n/admin/*\nplatform-level admin only"]
            healthR["Health Route\n/health\nDB + Redis + 503 on failure"]
        end

        subgraph Services["Domain Services"]
            scoreSvc["ScoringService\nPrevalence-weighted algorithm\nVersioned per session"]
            learnSvc["LearningPathService\nWeakest-dimension ordering\nDiscernment gap detection"]
            badgeSvc["BadgeService\nOpen Badges v3 assertion\nBadgr API client"]
            ltiSvc["LTIService\nltijs provider\nGrade passback to LMS"]
            ssoSvc["SSOService\nSAML SP + OIDC client\nPer-org IdP config"]
            exportSvc["ExportService\nGDPR data export ZIP\nPDF generation via worker"]
        end

        subgraph Middleware["Cross-Cutting"]
            rlsMW["RLS Middleware\nSets app.current_org_id\nBefore every DB query"]
            errH["Error Handler\nRFC 7807 Problem Details\nAll error types normalized"]
            schemaV["Schema Validation\nZod + Fastify JSON Schema\nRequest/response types"]
        end
    end

    config --> prisma
    prisma --> redisPlug
    redisPlug --> authPlug
    authPlug --> rlPlug
    rlPlug --> obs

    authR --> authPlug
    orgR --> authPlug
    sessR --> scoreSvc
    sessR --> learnSvc
    profR --> scoreSvc
    learnR --> learnSvc
    certR --> badgeSvc

    rlsMW --> prisma
    errH --> obs
```

---

## Assessment Flow — Sequence Diagram

End-to-end flow from starting an assessment through scoring and learning path generation.

```mermaid
sequenceDiagram
    participant L as Learner (Browser)
    participant W as Next.js Web
    participant A as Fastify API
    participant PG as PostgreSQL (RLS)
    participant R as Redis
    participant WK as Background Worker

    Note over L,WK: US-01 — Take Assessment

    L->>W: Navigate to /assess
    W->>A: POST /api/v1/assessment-sessions\n{templateId, orgId} + JWT
    A->>A: Validate JWT, extract orgId
    A->>PG: SET app.current_org_id = :orgId (RLS)
    A->>PG: SELECT template WHERE id=:id AND orgId=:orgId
    A->>PG: INSERT assessment_sessions\n{status: IN_PROGRESS, algorithmVersion: 2}
    A->>PG: SELECT 32 questions (8/dimension)\nordered by dimension
    A-->>W: {sessionId, questions[], expiresAt}
    W-->>L: Render question 1/32

    Note over L,WK: US-01 — Answer Questions (save-and-resume via FR-004)

    loop For each question (32 total)
        L->>W: Submit answer (A/B/C/D or Likert 1-5)
        W->>A: PUT /api/v1/assessment-sessions/:id/responses\n{questionId, answer, elapsedSeconds} + JWT
        A->>PG: SET app.current_org_id = :orgId
        A->>PG: UPSERT responses\n{sessionId, questionId, answer}
        A->>PG: UPDATE assessment_sessions\nSET progress_pct = (answered/32)*100
        A->>R: Cache partial state (TTL 24h)
        A-->>W: {saved: true, progress: N%}
    end

    Note over L,WK: US-03 — Prevalence-Weighted Scoring

    L->>W: Click "Submit Assessment"
    W->>A: POST /api/v1/assessment-sessions/:id/complete
    A->>PG: SET app.current_org_id = :orgId
    A->>PG: SELECT all 32 responses for session
    A->>A: ScoringService.score(responses, template)\n- Observable: scenario-based scoring per indicator\n- Self-report: Likert avg per unobservable indicator\n- Dimension score = prevalence-weighted mean\n- Gap detection: "Question AI reasoning" + "Identify missing\n  context" both Fail → discernmentGap flag
    A->>PG: INSERT fluency_profiles\n{overallScore, dimensionScores: {D,De,Di,Dil},\nindicatorBreakdown: JSONB,\nselfReportScores: JSONB,\ndiscernmentGap: bool}
    A->>PG: UPDATE assessment_sessions SET status=COMPLETED
    A->>PG: INSERT learning_paths (ordered weakest→strongest)
    A-->>W: {profileId, scores, learningPathId}
    W-->>L: Redirect to /profile/:id

    Note over L,WK: US-05 — Certificate (async)

    A->>R: Enqueue badge-issue job {userId, profileId}
    WK->>R: Dequeue job
    WK->>PG: Verify score >= threshold (80%)
    WK->>WK: BadgeService.issue()\nOpen Badges v3 assertion
    WK->>PG: INSERT certificates {badgeUrl, issuedAt}
    WK->>WK: Send email via SendGrid
```

---

## Auth Flow — Sequence Diagram

JWT + refresh token rotation with RLS session setup.

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant W as Next.js Web
    participant A as Fastify API
    participant PG as PostgreSQL
    participant R as Redis

    Note over U,R: Standard Email/Password Login

    U->>W: Submit login form\n{email, password}
    W->>A: POST /api/v1/auth/login
    A->>PG: SELECT users WHERE email=:email\nAND deletedAt IS NULL
    A->>A: crypto.timingSafeEqual(hash, storedHash)\nArgon2id verification
    A->>PG: INSERT sessions\n{userId, refreshTokenHash: SHA256(token),\nexpiresAt: +7days}
    A->>A: Generate JWT access token\n{sub: userId, orgId, role}\nExpires: 15 minutes
    A-->>W: Set-Cookie: refresh_token (httpOnly, Secure, SameSite=Strict)\nBody: {accessToken, user}
    W-->>U: Redirect to /dashboard

    Note over U,R: Token Refresh (silent)

    W->>A: POST /api/v1/auth/refresh\n(Cookie: refresh_token)
    A->>A: Verify refresh token signature
    A->>A: SHA256(presented token)
    A->>PG: SELECT sessions WHERE tokenHash=:hash\nAND expiresAt > NOW()
    A->>PG: DELETE old session (rotation)
    A->>PG: INSERT new session {newTokenHash}
    A-->>W: Set-Cookie: new refresh_token\nBody: {accessToken}

    Note over U,R: SAML SSO Login (Enterprise)

    U->>W: Click "Sign in with SSO"
    W->>A: GET /api/v1/auth/saml/init?orgId=:orgId
    A->>PG: SELECT org SSO config (entityId, cert)
    A-->>U: Redirect to IdP (SAML AuthnRequest)
    U->>A: POST /api/v1/auth/saml/callback (SAMLResponse)
    A->>A: Verify SAML assertion signature\nExtract email, attributes
    A->>PG: UPSERT user (JIT provisioning)\n{email, orgId, role from SAML attrs}
    A->>PG: INSERT session
    A-->>W: Redirect with access token
```

---

## Learning Path Generation — Sequence Diagram

```mermaid
sequenceDiagram
    participant A as Fastify API
    participant S as ScoringService
    participant L as LearningPathService
    participant PG as PostgreSQL

    Note over A,PG: US-05 — Personalized Learning Path Generation

    A->>S: getWeakestDimensions(dimensionScores)
    S-->>A: [{dimension: "Discernment", score: 0.42}, ...]
    A->>L: generatePath(userId, weakestDimensions, template)
    L->>PG: SELECT learning_modules\nWHERE dimension IN (:weakest)\nORDER BY dimension ASC, difficulty ASC
    PG-->>L: modules[]

    alt Discernment Gap Detected
        L->>L: Prepend "Question AI Reasoning" module\nBefore all other Discernment content
    end

    L->>PG: INSERT learning_paths {userId, status: ACTIVE}
    L->>PG: INSERT learning_path_modules (ordered)\n{pathId, moduleId, sequence}
    L-->>A: {pathId, moduleCount, estimatedHours}
```

---

## Traceability Matrix

| User Story | Functional Req | API Endpoint | DB Table(s) |
|------------|---------------|-------------|-------------|
| US-01 (Take Assessment) | FR-001 (4D questions) | POST /api/v1/assessment-sessions | assessment_sessions, questions |
| US-01 (Save-and-resume) | FR-004 (Save-and-resume) | PUT /api/v1/assessment-sessions/:id/responses | responses |
| US-02 (View Fluency Profile) | FR-003 (Profile) | GET /api/v1/fluency-profiles/:id | fluency_profiles |
| US-03 (Prevalence-Weighted Scoring) | FR-002 (Scoring) | POST /api/v1/assessment-sessions/:id/complete | fluency_profiles |
| US-04 (Self-Report) | FR-005 (13 unobservable) | PUT /api/v1/assessment-sessions/:id/responses | responses |
| US-04 (Self-Report Display) | FR-006 (Separate display) | GET /api/v1/fluency-profiles/:id | fluency_profiles.self_report_scores |
| US-05 (Learning Path) | FR-007 (Personalized paths) | POST /api/v1/learning-paths | learning_paths, learning_path_modules |
| US-06 (Track Progress) | FR-007 (Progress) | PUT /api/v1/learning-paths/:id/modules/:mid/complete | module_completions |
| US-18 (Multi-Tenant Isolation) | FR-016 (RLS) | All endpoints with orgId | All tenant-scoped tables (RLS) |
| — | FR-003 (Discernment Gap) | POST /api/v1/assessment-sessions/:id/complete | fluency_profiles.discernment_gap |
| — | — | GET /api/v1/organizations/:id/dashboard | (aggregation) |
| — | — | GET /api/v1/teams/:id/dashboard | (aggregation) |
| — | — | DELETE /api/v1/users/me | users (soft delete + GDPR) |
| — | — | GET /api/v1/users/me/export | All user tables (GDPR export) |
| — | — | GET /health | N/A (health check) |

---

## Multi-Tenancy Architecture

### Decision: PostgreSQL Row Level Security (RLS)

Multi-tenancy is enforced at the **database layer** using PostgreSQL Row Level Security policies. This makes tenant isolation impossible to bypass — even a Prisma query without a WHERE clause cannot return cross-tenant data.

**Architecture approach:**

```mermaid
flowchart TD
    req["Incoming API Request\n+ JWT (contains orgId)"]
    mw["RLS Middleware\nExtract orgId from JWT"]
    set["SET app.current_org_id = :orgId\n(PostgreSQL session variable)"]
    rls["PostgreSQL RLS Policy\nWHERE org_id = current_setting('app.current_org_id')"]
    data["Tenant-Scoped Data\nOnly this org's rows"]

    req --> mw --> set --> rls --> rls --> data
```

**RLS Policy example (applied to every tenant-scoped table):**

```sql
-- Enable RLS on table
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own org's sessions
CREATE POLICY org_isolation ON assessment_sessions
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- Service role bypasses RLS (for admin + migrations)
ALTER ROLE api_service BYPASSRLS;
CREATE ROLE api_service_rls NOINHERIT;
-- Application uses api_service_rls (RLS enforced)
-- Migrations use api_service (RLS bypassed)
```

**Implementation in Fastify:**
- Prisma plugin wraps every query in `SET LOCAL app.current_org_id = :orgId`
- Auth plugin decodes JWT and sets `request.orgId`
- RLS middleware hook runs `onRequest` before every route handler

**Tables with RLS:** users, teams, assessment_sessions, assessment_templates, responses, fluency_profiles, learning_paths, learning_path_modules, module_completions, certificates, sso_configs

**Tables without RLS (global):** organizations (org-level admin only), questions, learning_modules, algorithm_versions

---

## Security Architecture

### Authentication

| Mechanism | Token | Storage | Expiry | Use Case |
|-----------|-------|---------|--------|----------|
| JWT Access Token | RS256 signed | In-memory (TokenManager) | 15 min | API requests |
| Refresh Token | Opaque | httpOnly Secure cookie | 7 days | Token refresh |
| Refresh Token Hash | SHA-256 | PostgreSQL sessions table | 7 days | DB lookup |
| SAML Assertion | — | Not stored | Single use | SSO login |
| OIDC ID Token | — | Not stored | Single use | SSO login |

### Security Controls

- **BOLA (API1)**: Every endpoint includes `orgId` ownership check via RLS — impossible to access cross-org data
- **Broken Auth (API2)**: Rate limiting on `/auth/*` (5 req/min per IP), account lockout after 10 failures (15-min lockout), token rotation on every refresh
- **Resource Consumption (API4)**: All list endpoints paginated (max 100), file uploads size-limited, assessment sessions rate-limited per user
- **BFLA (API5)**: RBAC roles enforced via JWT `role` claim: `LEARNER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`. Admin endpoints require `ADMIN` role minimum.
- **Sensitive data**: Refresh tokens stored as SHA-256 hashes. Passwords hashed with Argon2id (memory: 64MB, iterations: 3, parallelism: 1).
- **Encryption**: AES-256-GCM for SSO configuration secrets at rest. TLS 1.3 in transit.
- **GDPR**: `DELETE /api/v1/users/me` triggers 30-day soft delete, then hard delete by worker. `GET /api/v1/users/me/export` returns ZIP of all user data.
- **Audit trail**: All `UPDATE`/`DELETE` operations on sensitive entities written to `audit_logs` table with `actor_id`, `action`, `before`/`after` JSONB.
- **Privacy**: PII fields (email, name) excluded from log output via PII redaction in Logger.
- **CORS**: Allowlist-based. Only the registered web app origin.
- **CSP**: Strict CSP headers from Next.js middleware. No `unsafe-inline`.
- **Session management**: `GET /api/v1/auth/sessions` lists all active sessions. `DELETE /api/v1/auth/sessions/:id` revokes specific session.

---

## Technology Decisions

### Backend

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Fastify 4 | 2x faster than Express, plugin ecosystem, TypeScript-first |
| ORM | Prisma 5 | Type-safe queries, migrations, RLS via `$executeRaw` |
| Auth | @connectsw/auth/backend | Reuse proven JWT+session pattern across ConnectSW |
| LTI 1.3 | ltijs 5.9.9 | Modern LTI 1.3/1.1 library, MIT license, active maintenance, grade passback support |
| Queue | BullMQ + Redis | Reliable job queuing for PDF/badge/LTI async work |
| Scoring | Custom (ScoringService) | No open-source implementation of 4D prevalence-weighted algorithm exists |
| Validation | Zod | Runtime validation + TypeScript inference |
| Logging | Pino (via @connectsw/shared/utils/logger) | Structured JSON, PII redaction, correlation IDs |

### Frontend

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 (App Router) | SSR for SEO + initial load speed; needed for dashboard and public cert verification |
| Styling | Tailwind CSS 3 | Consistent with ConnectSW standard |
| Components | @connectsw/ui + shadcn/ui | Reuse Button, Card, DataTable, Sidebar, DashboardLayout |
| Charts | Recharts 2 | React-native, SSR-compatible, accessible, MIT license. Radar chart for 4D profile, LineChart for progress |
| State | TanStack Query (React Query) | Server state management for assessment sessions, caching |
| Auth | @connectsw/auth/frontend | useAuth hook, ProtectedRoute, TokenManager |
| Form | React Hook Form + Zod | Type-safe form validation for assessment responses |

### Infrastructure

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL 15 | ACID, RLS support, JSONB for indicator breakdown |
| Cache / Queue | Redis 7 | Rate limiting (BullMQ jobs, session cache) |
| Storage | S3-compatible | Certificate PDFs, avatar images |
| Email | SendGrid | Reliability, template management |
| Credentials | Open Badges v3 via Badgr | Industry standard digital credentials |

---

## Scalability Considerations

**NFR-004: 10,000 concurrent sessions, 1M+ assessment records**

- **Connection pooling**: PgBouncer in transaction mode between API and PostgreSQL. Pool size: 20 connections per API instance.
- **Read replicas**: Assessment dashboard aggregate queries routed to read replica via Prisma datasource URL env var override.
- **Redis cluster**: BullMQ job queue partitioned by queue type (scoring, pdf, badge, lti).
- **Horizontal scaling**: API is stateless (JWT auth, Redis for rate limits). Add instances behind load balancer.
- **BRIN indexes**: On `created_at` timestamp columns for time-range queries on large tables (responses, audit_logs).
- **Partial indexes**: `WHERE status = 'IN_PROGRESS'` on assessment_sessions for resume lookup.
- **Algorithm versioning**: `algorithm_version` field on sessions allows scoring algorithm upgrades without invalidating historical scores.
- **Assessment caching**: Redis caches active session question order (TTL 24h) to avoid DB read on each answer.

**NFR-001: <500ms question load (p95), <3s scoring (p95)**

- Questions served from Redis cache after first load.
- Scoring computation is O(n) on 32 answers — no external calls, pure algorithmic.
- Database write on completion is a single transaction (INSERT profile + UPDATE session + INSERT learning_path).
