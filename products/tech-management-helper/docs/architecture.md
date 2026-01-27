# Tech Management Helper - System Architecture

## Overview

Tech Management Helper is a GRC (Governance, Risk, and Compliance) platform designed for Technology Managers in regulated industries. The system provides compliance dashboards, risk management, control tracking, and asset inventory with support for multiple compliance frameworks (NIST CSF, ISO 27001, COBIT, IT4IT).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Browser    │  │   Mobile     │  │  PDF Export  │                      │
│  │  (Desktop)   │  │  (Tablet)    │  │   (Download) │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼─────────────────┼─────────────────┼───────────────────────────────┘
          │                 │                 │
          └────────────────┬┴─────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Vercel Edge Network                            │  │
│  │  • TLS 1.2+ termination                                              │  │
│  │  • DDoS protection                                                    │  │
│  │  • Static asset caching                                               │  │
│  │  • Geographic distribution                                            │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   FRONTEND      │     │    BACKEND      │     │   FILE STORAGE  │
│   (Next.js)     │     │   (Fastify)     │     │    (S3/MinIO)   │
│   Port: 3100    │     │   Port: 5001    │     │                 │
│                 │     │                 │     │                 │
│ ┌─────────────┐ │     │ ┌─────────────┐ │     │ • Asset files   │
│ │ App Router  │ │     │ │ REST API    │ │     │ • Reports       │
│ │ (RSC)       │ │────▶│ │ /api/v1/*   │ │     │ • CSV imports   │
│ └─────────────┘ │     │ └─────────────┘ │     │ • Audit exports │
│                 │     │                 │     │                 │
│ ┌─────────────┐ │     │ ┌─────────────┐ │     └────────┬────────┘
│ │ React Query │ │     │ │ Auth Layer  │ │              │
│ │ (Cache)     │ │     │ │ (NextAuth)  │ │              │
│ └─────────────┘ │     │ └─────────────┘ │              │
│                 │     │                 │              │
│ ┌─────────────┐ │     │ ┌─────────────┐ │              │
│ │ shadcn/ui   │ │     │ │ CASL        │ │              │
│ │ Components  │ │     │ │ (RBAC)      │ │              │
│ └─────────────┘ │     │ └─────────────┘ │              │
│                 │     │        │        │              │
│ Vercel          │     │ Render │        │              │
└─────────────────┘     └────────┼────────┘              │
                                 │                       │
                                 ▼                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL 15                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │   Users &    │  │   GRC Core   │  │   Audit      │               │  │
│  │  │   Sessions   │  │   Entities   │  │   Logs       │               │  │
│  │  │              │  │              │  │              │               │  │
│  │  │ • User       │  │ • Risk       │  │ • AuditLog   │               │  │
│  │  │ • Session    │  │ • Control    │  │ (7-year      │               │  │
│  │  │ • Account    │  │ • Asset      │  │  retention)  │               │  │
│  │  │ • Role       │  │ • Assessment │  │              │               │  │
│  │  └──────────────┘  │ • Framework  │  │ • Partitioned│               │  │
│  │                    └──────────────┘  │   by year    │               │  │
│  │                                      └──────────────┘               │  │
│  │  Prisma ORM | AES-256 Encryption at Rest                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Render PostgreSQL (Production) | Docker PostgreSQL (Development)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend (apps/web)

```
apps/web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth layout group
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx       # Sidebar, header
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── risks/           # Risk register
│   │   │   ├── controls/        # Control catalog
│   │   │   ├── assets/          # Asset inventory
│   │   │   ├── assessments/     # Control assessments
│   │   │   ├── frameworks/      # Framework library
│   │   │   ├── reports/         # PDF reports
│   │   │   └── settings/        # User settings
│   │   └── api/                 # Next.js API routes (auth only)
│   │       └── auth/[...nextauth]/
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui base components
│   │   ├── dashboard/           # Dashboard widgets
│   │   │   ├── compliance-summary.tsx
│   │   │   ├── risk-matrix.tsx
│   │   │   └── value-stream.tsx
│   │   ├── risks/               # Risk-specific components
│   │   ├── controls/            # Control-specific components
│   │   ├── assets/              # Asset-specific components
│   │   └── layout/              # Layout components
│   │
│   ├── lib/
│   │   ├── api.ts               # API client (fetch wrapper)
│   │   ├── auth.ts              # NextAuth configuration
│   │   └── utils.ts             # Utility functions
│   │
│   ├── hooks/
│   │   ├── use-risks.ts         # Risk data hooks
│   │   ├── use-controls.ts      # Control data hooks
│   │   └── use-assets.ts        # Asset data hooks
│   │
│   └── types/
│       └── index.ts             # TypeScript type definitions
│
├── tests/
│   ├── unit/                    # Jest unit tests
│   └── e2e/                     # Playwright E2E tests
│
├── package.json
└── next.config.js
```

### Backend (apps/api)

```
apps/api/
├── src/
│   ├── index.ts                 # Fastify server entry
│   ├── app.ts                   # App configuration
│   │
│   ├── routes/
│   │   ├── auth/                # Authentication routes
│   │   ├── users/               # User management
│   │   ├── risks/               # Risk CRUD + scoring
│   │   ├── controls/            # Control CRUD + mapping
│   │   ├── assets/              # Asset CRUD + import
│   │   ├── assessments/         # Assessment workflow
│   │   ├── frameworks/          # Framework library
│   │   └── reports/             # Report generation
│   │
│   ├── services/
│   │   ├── risk.service.ts      # Risk business logic
│   │   ├── control.service.ts   # Control business logic
│   │   ├── asset.service.ts     # Asset business logic
│   │   ├── assessment.service.ts
│   │   ├── framework.service.ts
│   │   ├── report.service.ts    # PDF generation
│   │   └── audit.service.ts     # Audit logging
│   │
│   ├── middleware/
│   │   ├── auth.ts              # JWT validation
│   │   ├── rbac.ts              # CASL authorization
│   │   ├── audit.ts             # Audit logging middleware
│   │   └── validation.ts        # Zod schema validation
│   │
│   ├── schemas/
│   │   ├── risk.schema.ts       # Risk validation schemas
│   │   ├── control.schema.ts
│   │   ├── asset.schema.ts
│   │   └── ...
│   │
│   └── lib/
│       ├── prisma.ts            # Prisma client
│       ├── casl.ts              # CASL abilities
│       └── pdf.ts               # PDF generation utilities
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Database migrations
│   └── seed.ts                  # Seed data (frameworks)
│
├── tests/
│   ├── unit/
│   └── integration/
│
└── package.json
```

## Data Flow

### Dashboard Load Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │────▶│  Next.js │────▶│  Fastify │────▶│PostgreSQL│
│          │     │   RSC    │     │   API    │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. Request     │                │                │
     │ /dashboard     │                │                │
     │───────────────▶│                │                │
     │                │ 2. Parallel    │                │
     │                │    fetches     │                │
     │                │───────────────▶│                │
     │                │                │ 3. Query       │
     │                │                │───────────────▶│
     │                │                │                │
     │                │                │◀───────────────│
     │                │◀───────────────│ 4. Results     │
     │◀───────────────│                │                │
     │ 5. Streaming   │                │                │
     │    HTML + RSC  │                │                │
     │                │                │                │
```

### Risk Assessment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Analyst │────▶│  Web UI  │────▶│  API     │────▶│ Database │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. View risk   │                │                │
     │───────────────▶│                │                │
     │                │ GET /risks/:id │                │
     │                │───────────────▶│                │
     │                │                │ Query risk     │
     │                │                │ + controls     │
     │                │                │───────────────▶│
     │                │◀───────────────│◀───────────────│
     │◀───────────────│                │                │
     │                │                │                │
     │ 2. Update      │                │                │
     │    assessment  │                │                │
     │───────────────▶│                │                │
     │                │ PUT /risks/:id │                │
     │                │───────────────▶│                │
     │                │                │ Update risk    │
     │                │                │ + audit log    │
     │                │                │───────────────▶│
     │                │◀───────────────│◀───────────────│
     │◀───────────────│                │                │
```

## Security Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                           │
│                                                                   │
│  ┌─────────┐                                                     │
│  │  User   │                                                     │
│  └────┬────┘                                                     │
│       │                                                          │
│       │ 1. Login credentials                                     │
│       ▼                                                          │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────┐          │
│  │ Next.js │────▶│   NextAuth   │────▶│  PostgreSQL │          │
│  │  Login  │     │   Provider   │     │   (Users)   │          │
│  └─────────┘     └──────────────┘     └─────────────┘          │
│       │                 │                                        │
│       │                 │ 2. Verify credentials                  │
│       │                 │    Hash comparison (bcrypt)            │
│       │                 │                                        │
│       │                 ▼                                        │
│       │          ┌──────────────┐                               │
│       │          │ Create JWT   │                               │
│       │          │ + Session    │                               │
│       │          └──────┬───────┘                               │
│       │                 │                                        │
│       │◀────────────────┘                                        │
│       │ 3. Set secure                                            │
│       │    HTTP-only cookie                                      │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────┐                                                     │
│  │ Access  │                                                     │
│  │ Granted │                                                     │
│  └─────────┘                                                     │
└──────────────────────────────────────────────────────────────────┘
```

### Authorization (RBAC)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED ACCESS CONTROL                         │
│                                                                      │
│  ROLE        │ Dashboard │ Risks │ Controls │ Assets │ Reports     │
│  ────────────┼───────────┼───────┼──────────┼────────┼─────────    │
│  Admin       │ View/Edit │ CRUD  │ CRUD     │ CRUD   │ Generate    │
│  Manager     │ View/Edit │ CRUD  │ CRUD     │ CRUD   │ Generate    │
│  Analyst     │ View      │ R/U   │ R/U      │ R/U    │ Generate    │
│  Viewer      │ View      │ Read  │ Read     │ Read   │ View Only   │
│                                                                      │
│  Implementation: CASL.js                                             │
│                                                                      │
│  defineAbility((can, cannot) => {                                   │
│    if (role === 'Admin') {                                          │
│      can('manage', 'all');                                          │
│    } else if (role === 'Manager') {                                 │
│      can(['create', 'read', 'update', 'delete'], ['Risk', ...]);   │
│    } else if (role === 'Analyst') {                                 │
│      can('read', 'all');                                            │
│      can('update', ['Risk', 'Control', 'Asset', 'Assessment']);    │
│    } else if (role === 'Viewer') {                                  │
│      can('read', 'all');                                            │
│    }                                                                 │
│  })                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Protection

| Layer | Protection Mechanism |
|-------|---------------------|
| Transport | TLS 1.2+ (Vercel/Render edge) |
| Session | HTTP-only secure cookies, CSRF tokens |
| Data at Rest | PostgreSQL AES-256 encryption |
| File Storage | S3 SSE-S3 encryption |
| Audit Logs | Immutable, append-only, 7-year retention |
| Secrets | Environment variables, never in code |

## Scalability Considerations

### Current Target (MVP)
- 100 concurrent users
- 10,000 assets
- Dashboard load < 3 seconds
- API response < 500ms (p95)

### Scalability Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SCALABILITY PATH                                │
│                                                                      │
│  Stage 1: MVP (Current)                                             │
│  ├── Single Vercel deployment                                       │
│  ├── Single Render API instance                                     │
│  ├── Single PostgreSQL instance                                     │
│  └── Capacity: ~100 concurrent users                                │
│                                                                      │
│  Stage 2: Growth                                                     │
│  ├── Vercel Edge Functions for auth                                 │
│  ├── Render autoscaling (2-5 instances)                             │
│  ├── PostgreSQL read replicas                                       │
│  ├── Redis caching layer                                            │
│  └── Capacity: ~500 concurrent users                                │
│                                                                      │
│  Stage 3: Scale                                                      │
│  ├── CDN caching for static framework data                          │
│  ├── PostgreSQL connection pooling (PgBouncer)                      │
│  ├── Horizontal API scaling                                         │
│  ├── Audit log archival to S3/Glacier                               │
│  └── Capacity: ~1000+ concurrent users                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Performance Optimization Strategies

| Challenge | Solution |
|-----------|----------|
| Dashboard with 10K assets | Pagination, virtual scrolling, React Query caching |
| Complex risk calculations | Database-level aggregations, materialized views |
| PDF report generation | Background job queue, progress indication |
| CSV import (large files) | Streaming parser, batch inserts |
| Framework library load | Static generation, edge caching |
| Audit log queries | Partitioned tables by year |

## Audit Trail Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUDIT TRAIL SYSTEM                              │
│                                                                      │
│  ┌─────────────────┐                                                │
│  │  Any API Call   │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────────────────────────┐   │
│  │ Audit Middleware│────▶│           AuditLog Table             │   │
│  └─────────────────┘     │                                      │   │
│                          │  id          UUID PRIMARY KEY        │   │
│  Captures:               │  timestamp   TIMESTAMP NOT NULL      │   │
│  • User ID               │  userId      UUID REFERENCES User    │   │
│  • Action                │  action      VARCHAR (CREATE/UPDATE/│   │
│  • Entity type           │               DELETE/READ/EXPORT)   │   │
│  • Entity ID             │  entityType  VARCHAR NOT NULL        │   │
│  • Old value (JSON)      │  entityId    UUID NOT NULL           │   │
│  • New value (JSON)      │  oldValue    JSONB                   │   │
│  • IP address            │  newValue    JSONB                   │   │
│  • User agent            │  ipAddress   INET                    │   │
│                          │  userAgent   VARCHAR                 │   │
│                          │  metadata    JSONB                   │   │
│                          │                                      │   │
│                          │  Partitioned by year for 7-year      │   │
│                          │  retention with efficient queries    │   │
│                          └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## IT4IT Value Stream Integration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IT4IT VALUE STREAMS                                   │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │Strategy to  │───▶│Requirement  │───▶│Request to   │───▶│Detect to │ │
│  │Portfolio    │    │to Deploy    │    │Fulfill      │    │Correct   │ │
│  │(S2P)        │    │(R2D)        │    │(R2F)        │    │(D2C)     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────────┘ │
│        │                  │                  │                  │       │
│        ▼                  ▼                  ▼                  ▼       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     CONTROL MAPPING                                │ │
│  │                                                                    │ │
│  │  Each value stream phase maps to:                                 │ │
│  │  • NIST CSF categories                                            │ │
│  │  • ISO 27001 controls                                             │ │
│  │  • COBIT processes                                                │ │
│  │  • Associated risks                                               │ │
│  │  • KPIs and metrics                                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Visualization: Recharts + custom SVG for value stream diagram          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PIPELINE                               │
│                                                                      │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │  GitHub │────▶│   GitHub    │────▶│   Deploy    │               │
│  │  Push   │     │   Actions   │     │ (Vercel +   │               │
│  └─────────┘     │             │     │   Render)   │               │
│                  │ ┌─────────┐ │     └─────────────┘               │
│                  │ │  Lint   │ │                                    │
│                  │ └────┬────┘ │     Environments:                  │
│                  │      ▼      │     • Preview (PR)                 │
│                  │ ┌─────────┐ │     • Staging (main)               │
│                  │ │  Test   │ │     • Production (release)         │
│                  │ └────┬────┘ │                                    │
│                  │      ▼      │                                    │
│                  │ ┌─────────┐ │                                    │
│                  │ │  Build  │ │                                    │
│                  │ └────┬────┘ │                                    │
│                  │      ▼      │                                    │
│                  │ ┌─────────┐ │                                    │
│                  │ │ Deploy  │ │                                    │
│                  │ └─────────┘ │                                    │
│                  └─────────────┘                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Error Handling & Monitoring

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | Sentry | Error tracking, performance |
| Backend | Sentry | Exception capture, APM |
| Logs | Render Logs / CloudWatch | Application logs |
| Uptime | Render Health Checks | Service availability |
| Alerts | Sentry + Slack | Incident notification |

## Technology Summary

| Component | Technology |
|-----------|------------|
| Frontend Framework | Next.js 14 (App Router) |
| Backend Framework | Fastify |
| Language | TypeScript 5+ |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Authentication | NextAuth.js |
| Authorization | CASL |
| UI Components | shadcn/ui + Radix |
| Charts | Recharts |
| Data Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| State Management | React Query |
| PDF Generation | @react-pdf/renderer |
| CSV Parsing | PapaParse |
| Testing | Jest + Playwright |
| Hosting | Vercel (Web) + Render (API) |
| CI/CD | GitHub Actions |

---

*Created by*: Architect Agent
*Date*: 2026-01-26
