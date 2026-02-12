# ConnectGRC - System Architecture

## Overview

ConnectGRC is a GRC-native talent platform built on the ConnectSW standard stack. The system connects GRC professionals with employers through AI-powered assessments, career development tools, and intelligent job matching.

This document defines the system architecture, component interactions, and key technical flows.

## System Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        WEB["Next.js 14+ Frontend<br/>:3110"]
        PUB["Public Pages (SSG/SSR)"]
        DASH["Authenticated Dashboard (CSR)"]
        ADMIN["Admin Panel (CSR)"]
        WEB --> PUB
        WEB --> DASH
        WEB --> ADMIN
    end

    subgraph "API Layer"
        API["Fastify API Server<br/>:5006"]
        AUTH_MW["Auth Middleware<br/>(JWT + Role Guard)"]
        VAL["Zod Request Validation"]
        ROUTES["Route Handlers"]
        API --> AUTH_MW
        API --> VAL
        API --> ROUTES
    end

    subgraph "Business Logic Layer"
        REPO["Repository Classes"]
        ASMT_SVC["Assessment Service"]
        CAREER_SVC["Career Service"]
        PROFILE_SVC["Profile Service"]
        RESOURCE_SVC["Resource Service"]
        NOTIF_SVC["Notification Service"]
        AI_GW["AI Gateway (Stubbed)"]
    end

    subgraph "Data Layer"
        PRISMA["Prisma ORM"]
        PG["PostgreSQL 15+"]
        REDIS["Redis 7+ (Sessions/Cache)"]
    end

    subgraph "External Services (Stubbed)"
        LIVEKIT["LiveKit<br/>(WebRTC Audio)"]
        OPENAI["OpenAI GPT-4o<br/>(Questions/Scoring)"]
        EMAIL_SVC["Email Service<br/>(Resend/SendGrid)"]
        STORAGE["File Storage<br/>(S3-compatible)"]
    end

    WEB -->|"REST /api/v1/*"| API
    ROUTES --> REPO
    ROUTES --> ASMT_SVC
    ROUTES --> CAREER_SVC
    ROUTES --> PROFILE_SVC
    ROUTES --> RESOURCE_SVC
    ROUTES --> NOTIF_SVC
    ASMT_SVC --> AI_GW
    CAREER_SVC --> AI_GW
    PROFILE_SVC --> AI_GW
    REPO --> PRISMA
    PRISMA --> PG
    AUTH_MW --> REDIS
    AI_GW --> LIVEKIT
    AI_GW --> OPENAI
    NOTIF_SVC --> EMAIL_SVC
    PROFILE_SVC --> STORAGE
```

## Component Architecture

### Frontend (Next.js 14+ App Router)

| Component | Responsibility |
|-----------|---------------|
| **Public Pages** | Landing, About, Pricing, For Talents, For Employers. SSG/SSR for SEO. |
| **Auth Pages** | Register, Login, Verify Email, Forgot/Reset Password. Client-side forms. |
| **Onboarding Flow** | Multi-step wizard: role selection, basic info, resume upload, certifications, frameworks. |
| **Dashboard** | Profile overview, assessment results radar chart, career simulator, resource hub. |
| **Assessment UI** | Voice assessment interface with audio waveform, timer, question display. |
| **Career Simulator** | Interactive career path exploration, AI counselor chat, simulation history. |
| **Resource Hub** | Browseable content library with filters, search, bookmarks, download tracking. |
| **Admin Panel** | User management, framework/question CRUD, analytics dashboards, review queue. |
| **Notification Center** | In-app notification bell with preference management. |

**State Management**: Zustand for client-side UI state (auth context, assessment session, notification count). Server state via React Query / SWR for API data fetching.

**Routing**: Next.js App Router with route groups:
- `(public)/` -- Landing, about, pricing, etc.
- `(auth)/` -- Login, register, verify, reset
- `(app)/` -- Authenticated routes (dashboard, assessment, career, resources)
- `(admin)/` -- Admin-only routes

### Backend (Fastify)

```mermaid
graph LR
    subgraph "Fastify Plugins"
        P_PRISMA["Prisma Plugin"]
        P_AUTH["Auth Plugin<br/>(JWT + Roles)"]
        P_REDIS["Redis Plugin"]
        P_OBS["Observability Plugin"]
        P_CORS["CORS Plugin"]
        P_RATE["Rate Limit Plugin"]
    end

    subgraph "Route Modules"
        R_AUTH["auth.routes.ts"]
        R_PROF["profile.routes.ts"]
        R_ASMT["assessment.routes.ts"]
        R_CAREER["career.routes.ts"]
        R_RES["resource.routes.ts"]
        R_NOTIF["notification.routes.ts"]
        R_ADMIN["admin.routes.ts"]
        R_HEALTH["health.routes.ts"]
    end

    subgraph "Repositories"
        REPO_USER["UserRepository"]
        REPO_PROF["ProfileRepository"]
        REPO_ASMT["AssessmentRepository"]
        REPO_CAREER["CareerRepository"]
        REPO_RES["ResourceRepository"]
        REPO_NOTIF["NotificationRepository"]
        REPO_ADMIN["AdminRepository"]
    end

    subgraph "Services"
        SVC_AUTH["AuthService"]
        SVC_ASMT["AssessmentService"]
        SVC_CAREER["CareerService"]
        SVC_AI["AIGatewayService"]
        SVC_EMAIL["EmailService"]
        SVC_AUDIT["AuditLogService"]
    end

    R_AUTH --> SVC_AUTH
    R_PROF --> REPO_PROF
    R_ASMT --> SVC_ASMT
    R_CAREER --> SVC_CAREER
    R_RES --> REPO_RES
    R_NOTIF --> REPO_NOTIF
    R_ADMIN --> REPO_ADMIN
    SVC_AUTH --> REPO_USER
    SVC_ASMT --> REPO_ASMT
    SVC_ASMT --> SVC_AI
    SVC_CAREER --> SVC_AI
    SVC_AUTH --> SVC_AUDIT
```

**Plugin Loading Order**:
1. CORS
2. Rate Limiting (with Redis store when available)
3. Prisma (database connection)
4. Redis (session/cache, graceful degradation)
5. Auth (JWT verification, role guard)
6. Observability (request logging, metrics)
7. Routes

### Repository Pattern

All database access goes through repository classes. Routes never call Prisma directly.

```typescript
// Pattern: Repository base class
class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}

  // All queries include tenant isolation (userId where clause)
  // Soft-delete support where applicable
  // Cursor-based pagination helper
}

// Example: Assessment queries are always scoped to the user
class AssessmentRepository extends BaseRepository<Assessment> {
  async findByUser(userId: string, cursor?: string, limit?: number) {
    return this.prisma.assessment.findMany({
      where: { userId },
      cursor: cursor ? { id: cursor } : undefined,
      take: limit ?? 20,
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Next.js Frontend
    participant A as Fastify API
    participant DB as PostgreSQL
    participant E as Email Service

    Note over U,E: Registration Flow
    U->>F: Fill registration form
    F->>A: POST /api/v1/auth/register
    A->>A: Validate (Zod): email, password, role
    A->>DB: Check email uniqueness
    A->>DB: Create user (emailVerified=false)
    A->>E: Send verification email (6-digit code + link)
    A->>DB: Store verification token (expires 24h)
    A-->>F: 201 { message: "Verification email sent" }
    F-->>U: "Check your email" screen

    Note over U,E: Email Verification
    U->>F: Click verification link / enter code
    F->>A: POST /api/v1/auth/verify-email { token }
    A->>DB: Find token, check expiry
    A->>DB: Set emailVerified=true, delete token
    A-->>F: 200 { message: "Email verified" }
    F-->>U: Redirect to login

    Note over U,E: Login Flow
    U->>F: Enter email + password
    F->>A: POST /api/v1/auth/login
    A->>DB: Find user by email
    A->>A: Verify emailVerified=true
    A->>A: Compare password hash (bcrypt)
    A->>A: Generate JWT access token (15min)
    A->>A: Generate refresh token (7d)
    A->>DB: Store refresh token hash
    A->>DB: Write audit log
    A-->>F: 200 { accessToken, refreshToken, user }
    F->>F: Store in TokenManager (memory-only)
    F-->>U: Redirect to dashboard (or onboarding if profile incomplete)

    Note over U,E: Token Refresh
    F->>A: POST /api/v1/auth/refresh { refreshToken }
    A->>DB: Verify refresh token hash + expiry
    A->>A: Generate new access token
    A->>A: Rotate refresh token (one-time use)
    A-->>F: 200 { accessToken, refreshToken }
```

### JWT Token Structure

```json
{
  "sub": "user_cuid",
  "email": "user@example.com",
  "role": "talent",
  "iat": 1700000000,
  "exp": 1700000900
}
```

- Access token: 15 minutes TTL
- Refresh token: 7 days TTL, one-time use (rotation)
- Tokens stored in-memory via TokenManager (never localStorage)
- Refresh token hash stored in DB for revocation support

### Role-Based Access Control

| Role | Access Scope |
|------|-------------|
| `talent` | Own profile, assessments, career simulations, resources, notifications |
| `employer` | (Phase 2) Job postings, candidate search, assessment reports |
| `admin` | All talent/employer routes + user management, framework CRUD, analytics, review queue |

## Assessment Flow

```mermaid
sequenceDiagram
    participant T as Talent (Browser)
    participant F as Frontend
    participant A as API Server
    participant AI as AI Gateway (Stubbed)
    participant LK as LiveKit (Stubbed)
    participant DB as PostgreSQL

    Note over T,DB: Pre-Assessment
    T->>F: Click "Start Assessment"
    F->>A: GET /api/v1/assessments/eligibility
    A->>DB: Check retake cooldown (7 days)
    A->>DB: Get user profile (experience, frameworks, certs)
    A-->>F: { eligible: true, experienceLevel, frameworks }

    Note over T,DB: Session Creation
    F->>A: POST /api/v1/assessments/start
    A->>A: Determine difficulty distribution
    A->>AI: Generate 25 questions (70/30 hybrid)
    AI-->>A: Questions with golden answers
    A->>DB: Create AssessmentSession (status=IN_PROGRESS)
    A->>DB: Store questions + golden answers
    A-->>F: { sessionId, totalQuestions: 25, timeLimit: 1800 }

    Note over T,DB: Voice Assessment Loop (x25)
    F->>LK: Connect WebRTC audio
    loop For each question
        F->>A: GET /api/v1/assessments/{sessionId}/questions/{n}
        A-->>F: { question, domain, difficulty, questionNumber }
        F-->>T: Display question + audio waveform
        T->>F: Speak answer
        F->>LK: Stream audio
        LK->>AI: Transcribe audio (Whisper)
        AI-->>F: { transcript }
        F->>A: POST /api/v1/assessments/{sessionId}/answers
        A->>A: body: { questionId, transcript, audioUrl? }
        A-->>F: { received: true }
    end

    Note over T,DB: Scoring
    F->>A: POST /api/v1/assessments/{sessionId}/complete
    A->>AI: Score answers against golden answers (RAG)
    AI-->>A: Per-question scores + reasoning
    A->>A: Calculate domain scores (6 domains)
    A->>A: Calculate overall score
    A->>A: Determine professional tier
    A->>A: Identify strengths + improvement areas
    A->>DB: Update session (status=COMPLETED, scores)
    A->>DB: Store per-answer scores
    A-->>F: { results: { overallScore, tier, domains[], strengths[], improvements[] } }
    F-->>T: Results page with radar chart
```

### Question Difficulty Distribution

| Experience Level | Foundational | Intermediate | Advanced | Expert/Strategic |
|-----------------|-------------|-------------|---------|-----------------|
| Entry           | 70%         | 0%          | 0%      | 0%              |
| Mid             | 20%         | 50%         | 0%      | 0%              |
| Senior          | 0%          | 20%         | 50%     | 0%              |
| Principal       | 0%          | 0%          | 0%      | 70%             |

Remaining 30% in each level is "general GRC knowledge" drawn evenly across difficulty levels.

### Scoring Pipeline

1. **Transcription**: Voice answer -> text via OpenAI Whisper (stubbed)
2. **RAG Retrieval**: Find relevant golden answers + framework controls for the question
3. **Similarity Scoring**: Compare answer transcript against golden answers using embeddings
4. **GPT Evaluation**: GPT-4o evaluates answer quality considering context, depth, accuracy
5. **Domain Aggregation**: Per-domain average across questions
6. **Tier Assignment**: Overall score maps to professional tier
7. **Stretch Detection**: If scoring 90%+ in a domain, flag for stretch questions on retake

### Dual Assessment Model

- **Talent View**: Full results with detailed feedback, improvement suggestions, learning resources
- **Employer View** (Phase 2): Summary tier, domain breakdown, integrity score. No raw transcripts.

## Career Simulator Flow

```mermaid
sequenceDiagram
    participant T as Talent
    participant F as Frontend
    participant A as API Server
    participant AI as AI Gateway
    participant DB as PostgreSQL

    T->>F: Open Career Simulator
    F->>A: GET /api/v1/career/paths
    A->>DB: Get user profile + assessment results
    A->>AI: Generate personalized career paths
    AI-->>A: Career paths with milestones
    A-->>F: { paths: [{ title, milestones[], timeline, certifications[] }] }
    F-->>T: Display interactive career map

    Note over T,DB: Goal Setting
    T->>F: Select target role + constraints
    F->>A: POST /api/v1/career/simulations
    A->>AI: Simulate career trajectory
    AI-->>A: Detailed plan with milestones
    A->>DB: Save simulation
    A-->>F: { simulation: { steps[], timeline, certNeeded[], estimatedCost } }

    Note over T,DB: AI Counselor Chat
    T->>F: Open AI counselor
    F->>A: POST /api/v1/career/chat
    A->>A: body: { simulationId?, message }
    A->>AI: Send with counselor persona + user context
    AI-->>A: Counselor response
    A->>DB: Store chat message
    A-->>F: { response, suggestions[] }
```

### AI Counselor Persona

The career counselor is modeled as a senior GRC advisor with 20+ years of experience. It provides:
- Certification ROI analysis (which cert gives the best career boost)
- Career transition guidance (e.g., IT Audit -> CISO pathway)
- Salary benchmarks by role, region, and certification
- Market demand insights by GRC domain
- Regional regulatory awareness (GDPR, CCPA, HIPAA, DORA, NIS2, AI Act)

## Data Model Overview

```mermaid
erDiagram
    User ||--o| Profile : has
    User ||--o{ Assessment : takes
    User ||--o{ CareerSimulation : creates
    User ||--o{ Bookmark : saves
    User ||--o{ ResourceInteraction : tracks
    User ||--o{ Notification : receives
    User ||--o{ RefreshToken : authenticates

    Profile ||--o{ ProfileCertification : holds
    Profile ||--o{ ProfileFramework : declares

    Assessment ||--o{ AssessmentQuestion : contains
    AssessmentQuestion ||--o| AssessmentAnswer : answered_by

    CareerSimulation ||--o{ SimulationMilestone : includes
    CareerSimulation ||--o{ ChatMessage : discusses

    Resource ||--o{ ResourceInteraction : tracked_by
    Resource ||--o{ Bookmark : bookmarked_by

    Framework ||--o{ FrameworkControl : contains
    Framework ||--o{ GoldenAnswer : references
    Framework ||--o{ Question : sourced_from

    Question ||--o{ GoldenAnswer : scored_against

    Admin_ReviewItem }o--|| Framework : reviews
```

See `prisma/schema.prisma` for the full data model with all fields, indexes, and constraints.

## API Architecture

All endpoints are under `/api/v1/`. See `docs/api-schema.yml` for the full OpenAPI 3.0 specification.

### Endpoint Groups

| Group | Prefix | Auth Required | Roles |
|-------|--------|--------------|-------|
| Health | `/health` | No | -- |
| Auth | `/api/v1/auth/*` | No (except logout/refresh) | All |
| Profile | `/api/v1/profile/*` | Yes | talent, admin |
| Assessment | `/api/v1/assessments/*` | Yes | talent, admin |
| Career | `/api/v1/career/*` | Yes | talent, admin |
| Resources | `/api/v1/resources/*` | Partial (browse=no, bookmark=yes) | All |
| Notifications | `/api/v1/notifications/*` | Yes | talent, employer, admin |
| Admin | `/api/v1/admin/*` | Yes | admin only |

### Error Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "ASSESSMENT_COOLDOWN",
    "message": "You must wait 7 days between assessment attempts",
    "details": {
      "nextEligibleDate": "2026-02-18T00:00:00Z",
      "remainingDays": 5
    }
  }
}
```

### Pagination

Cursor-based pagination for all list endpoints:

```
GET /api/v1/resources?cursor=clx1abc123&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "cursor": "clx1xyz789",
    "hasMore": true,
    "limit": 20
  }
}
```

## Infrastructure

### Development Environment

```
Frontend:  http://localhost:3110  (Next.js dev server)
Backend:   http://localhost:5006  (Fastify)
Database:  postgresql://localhost:5432/connectgrc_dev
Redis:     redis://localhost:6379 (optional, graceful degradation)
```

### Environment Variables

```bash
# Server
PORT=5006
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres@localhost:5432/connectgrc_dev
DATABASE_POOL_SIZE=10
DATABASE_POOL_TIMEOUT=30000

# Auth
JWT_SECRET=<64+ chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://localhost:6379

# AI (stubbed initially)
OPENAI_API_KEY=<key>
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=<url>

# Email (stubbed initially)
EMAIL_FROM=noreply@connectgrc.com
EMAIL_PROVIDER=console

# File Storage (stubbed initially)
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5006
NEXT_PUBLIC_APP_URL=http://localhost:3110
```

### Deployment Architecture (Future)

```mermaid
graph TB
    subgraph "CDN / Edge"
        CF["Cloudflare / Vercel Edge"]
    end

    subgraph "Compute"
        NEXT["Next.js (Vercel)"]
        API["Fastify API (Railway/Render)"]
    end

    subgraph "Data"
        PG["PostgreSQL (Neon/Supabase DB)"]
        REDIS["Redis (Upstash)"]
        S3["File Storage (R2/S3)"]
    end

    subgraph "AI Services"
        OAI["OpenAI API"]
        LK["LiveKit Cloud"]
    end

    CF --> NEXT
    CF --> API
    API --> PG
    API --> REDIS
    API --> S3
    API --> OAI
    NEXT --> API
    NEXT --> LK
```

## Security Considerations

1. **Authentication**: JWT with short-lived access tokens (15min) and rotated refresh tokens
2. **Authorization**: Role-based access control enforced at the route level via Fastify decorators
3. **Input Validation**: Zod schemas on all request bodies and query parameters
4. **SQL Injection**: Prevented by Prisma parameterized queries
5. **XSS**: Token storage in memory only (never localStorage). HTML escaping on all user-generated content.
6. **CSRF**: Stateless JWT auth with SameSite cookies for refresh tokens
7. **Rate Limiting**: Redis-backed rate limiting on auth endpoints (stricter) and general API
8. **Data Isolation**: All queries scoped to authenticated user via repository pattern (RLS-equivalent)
9. **Audit Trail**: All security-critical actions logged to audit_logs table
10. **Password Security**: bcrypt with 12 rounds, strong password policy enforced
11. **Email Verification**: Required before login; prevents account enumeration
12. **CORS**: Strict origin allowlist (frontend URL only)
13. **CSP Headers**: Content Security Policy configured in Next.js middleware

## Feature Flags

Feature flags control progressive activation of functionality:

```typescript
// Feature flag configuration
const features = {
  VOICE_ASSESSMENT: false,      // LiveKit integration
  AI_SCORING: false,            // OpenAI RAG scoring
  AI_CAREER_COUNSELOR: false,   // AI chat
  AI_PROFILE_ANALYSIS: false,   // AI profile insights
  EMPLOYER_FEATURES: false,     // Phase 2 employer dashboard
  EMAIL_NOTIFICATIONS: false,   // Real email sending
  FILE_UPLOAD: false,           // S3 file upload
};
```

When a feature flag is off, the system uses stubbed implementations that return deterministic mock data, allowing frontend development to proceed independently of AI service integration.

## Phase 2 Readiness

The database schema and API contracts are designed to support Phase 2 employer features without schema migration:

- `User` model includes `employer` role
- `employer_profiles` table exists (empty in Phase 1)
- `job_postings` table exists (empty in Phase 1)
- `job_applications` table exists (empty in Phase 1)
- Assessment dual-view model separates talent and employer data access
- API versioning (`/api/v1/`) allows non-breaking additions

## Key ADRs

| ADR | Title | Decision |
|-----|-------|----------|
| [001](ADRs/001-tech-stack.md) | Tech Stack | Fastify+Prisma+PostgreSQL (ConnectSW standard) |
| [002](ADRs/002-assessment-architecture.md) | Assessment Architecture | LiveKit + OpenAI GPT-4o Realtime, stubbed initially |
| [003](ADRs/003-rag-scoring-system.md) | RAG Scoring System | Embeddings + golden answers for assessment scoring |
| [004](ADRs/004-professional-tiering.md) | Professional Tiering | Score-based tier assignment with domain breakdown |
| [005](ADRs/005-auth-strategy.md) | Auth Strategy | JWT with email verification and role-based access |
