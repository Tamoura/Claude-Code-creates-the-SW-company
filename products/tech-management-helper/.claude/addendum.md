# Tech Management Helper - Agent Addendum

## Product Overview

**Name**: Tech Management Helper
**Type**: Web Application (Full-stack)
**Status**: Development
**Repository**: `products/tech-management-helper/`

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14 (App Router) | Server Components for performance |
| Backend | Fastify | High-performance API server |
| Database | PostgreSQL 15 | ACID compliance for audit data |
| ORM | Prisma | Type-safe queries, migrations |
| Styling | Tailwind CSS 4 | Utility-first styling |
| UI Components | shadcn/ui + Radix | Accessible, customizable |
| Charts | Recharts | Compliance dashboards |
| Tables | TanStack Table | 10K+ row support |
| Forms | React Hook Form + Zod | Type-safe validation |
| State | React Query | Server state, caching |
| Auth | NextAuth.js | Session management, RBAC |
| Testing | Jest + Playwright | Unit + E2E |
| Deployment | Vercel (Web) + Render (API) | Production hosting |

## Libraries & Dependencies

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| shadcn/ui | UI Components | 105K stars, accessible, customizable (ADR-001) |
| Recharts | Charts/Visualization | React-native, composable (ADR-001) |
| React Hook Form | Form handling | Minimal re-renders, great DX (ADR-001) |
| Zod | Validation | Type-safe, RHF integration (ADR-001) |
| TanStack Table | Data tables | Headless, performant for 10K+ rows (ADR-001) |
| TanStack Query | Server state | Caching, optimistic updates |
| NextAuth.js | Authentication | Native Next.js, OAuth support (ADR-001) |
| CASL | Authorization | Role-based access control |
| @react-pdf/renderer | PDF Reports | React component model (ADR-001) |
| PapaParse | CSV Import | Fast, handles malformed input (ADR-001) |
| date-fns | Date utilities | Tree-shakeable, lightweight |
| bcrypt | Password hashing | Industry standard |
| jose | JWT tokens | Modern JWT library |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| Redux/Zustand | Overkill - React Query + React state sufficient |
| react-admin | Framework lock-in, Material UI dependency |
| refine | Overkill for our needs |
| ag-Grid | Enterprise license required |
| Material UI | Bundle size, design mismatch with Tailwind |
| Moment.js | Deprecated - use date-fns instead |
| Chart.js | Not React-native - use Recharts |
| Axios | Overkill - fetch with wrapper sufficient |
| Express | Less performant than Fastify |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| /login | MVP | User authentication |
| /register | MVP | New user registration |
| / | MVP | Dashboard with compliance overview |
| /risks | MVP | Risk register with matrix view |
| /risks/[id] | MVP | Risk detail and edit |
| /controls | MVP | Control catalog |
| /controls/[id] | MVP | Control detail with framework mapping |
| /assets | MVP | Asset inventory |
| /assets/import | MVP | CSV import interface |
| /assets/[id] | MVP | Asset detail |
| /assessments | MVP | Assessment list and workflow |
| /assessments/new | MVP | Create assessment |
| /assessments/[id] | MVP | Assessment detail and approval |
| /frameworks | MVP | Framework library (NIST, ISO, COBIT, IT4IT) |
| /frameworks/[id] | MVP | Framework detail and compliance status |
| /reports | MVP | Report generation (PDF) |
| /settings | MVP | User and org settings |
| /admin/users | MVP | User management (Admin only) |
| /audit | MVP | Audit log viewer (Admin/Manager) |

## Design Patterns

### Component Patterns

```
apps/web/src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Unauthenticated routes
│   ├── (dashboard)/          # Authenticated routes with sidebar
│   └── api/auth/             # NextAuth endpoints only
├── components/
│   ├── ui/                   # shadcn/ui base components
│   ├── dashboard/            # Dashboard-specific widgets
│   │   ├── compliance-summary.tsx
│   │   ├── risk-matrix.tsx
│   │   └── value-stream.tsx
│   ├── risks/                # Risk-specific components
│   ├── controls/             # Control-specific components
│   ├── assets/               # Asset-specific components
│   ├── assessments/          # Assessment-specific components
│   └── layout/               # Layout components
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts               # Auth configuration
│   └── utils.ts              # Utilities
├── hooks/                    # Custom React hooks
└── types/                    # TypeScript definitions
```

### State Management

- **Server State**: React Query (TanStack Query) for all API data
- **Form State**: React Hook Form for forms
- **UI State**: React useState/useReducer for component-local state
- **Auth State**: NextAuth.js session

### API Patterns

```
apps/api/src/
├── routes/                   # Route handlers (thin)
│   ├── risks/
│   │   ├── index.ts          # GET /risks, POST /risks
│   │   └── [id].ts           # GET/PUT/DELETE /risks/:id
│   └── ...
├── services/                 # Business logic
│   ├── risk.service.ts
│   └── ...
├── middleware/               # Shared middleware
│   ├── auth.ts               # JWT verification
│   ├── rbac.ts               # Permission checks
│   └── audit.ts              # Audit logging
└── schemas/                  # Zod validation schemas
```

## Business Logic

### Risk Scoring

```typescript
// Risk score = likelihood x impact (1-25)
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

function calculateRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'LOW';
  if (score <= 9) return 'MEDIUM';
  if (score <= 15) return 'HIGH';
  return 'CRITICAL';
}
```

### Assessment Workflow

```
DRAFT → SUBMITTED → APPROVED
              ↓
          REJECTED → DRAFT (revision)
```

- Analysts can create and submit
- Managers/Admins can approve or reject
- All transitions logged in audit

### Control Compliance Calculation

```typescript
// Per framework compliance
function calculateCompliance(controls: Control[]): number {
  const applicable = controls.filter(c => c.status !== 'NOT_APPLICABLE');
  const implemented = applicable.filter(
    c => c.status === 'IMPLEMENTED' || c.status === 'PARTIALLY_IMPLEMENTED'
  );
  // Partially implemented counts as 50%
  const score = implemented.reduce((sum, c) =>
    sum + (c.status === 'IMPLEMENTED' ? 1 : 0.5), 0
  );
  return (score / applicable.length) * 100;
}
```

### Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| Risk | title | Required, 3-200 chars |
| Risk | likelihood | Required, 1-5 |
| Risk | impact | Required, 1-5 |
| Control | code | Required, unique, format: XX-000 |
| Asset | name | Required, 2-200 chars |
| Asset | criticality | Required, enum |
| Assessment | effectivenessRating | Required, 1-5 |
| Assessment | findings | Required, min 10 chars |

## Data Models

### Key Entities

- **Organization**: Multi-tenant root (future)
- **User**: Authenticated user with role
- **Risk**: Risk register entry with L x I scoring
- **Control**: Control catalog entry with framework mappings
- **Asset**: IT asset with criticality and metadata
- **Assessment**: Control assessment with approval workflow
- **Framework**: Compliance framework (NIST, ISO, COBIT, IT4IT)
- **AuditLog**: Immutable action log (7-year retention)

### Relationships

- Risk ↔ Control: Many-to-many (controls mitigate risks)
- Risk ↔ Asset: Many-to-many (risks affect assets)
- Control ↔ Framework: Many-to-many (control maps to frameworks)
- Control ↔ Assessment: One-to-many (assessment history)

See `docs/data-model.md` for complete ERD and Prisma schema.

## External Integrations

| Service | Purpose | Documentation |
|---------|---------|---------------|
| NextAuth.js | Authentication | https://next-auth.js.org |
| AWS S3 / MinIO | File storage | https://min.io |
| Sentry | Error tracking | https://sentry.io |

## Performance Requirements

| Metric | Target | Implementation |
|--------|--------|----------------|
| Dashboard load | < 3 seconds | Server components, parallel fetches |
| API response (p95) | < 500ms | Fastify, optimized queries |
| Report generation | < 30 seconds | Background processing |
| Asset table (10K rows) | Smooth scroll | Virtual scrolling, pagination |
| Bundle size | < 500KB gzip | Tree-shaking, dynamic imports |

## Special Considerations

### 1. Audit Trail Requirements
- All create/update/delete operations must be logged
- Logs are immutable - no deletion allowed
- 7-year retention with yearly partitioning
- Export capability for compliance audits

### 2. RBAC Implementation
```typescript
// CASL abilities by role
const abilities = {
  ADMIN: ['manage', 'all'],
  MANAGER: ['create', 'read', 'update', 'delete', ['Risk', 'Control', 'Asset', 'Assessment']],
  ANALYST: ['read', 'all'], ['update', ['Risk', 'Control', 'Asset', 'Assessment']],
  VIEWER: ['read', 'all']
};
```

### 3. Framework Data
- Pre-seeded during deployment
- NIST CSF 2.0, ISO 27001:2022, COBIT 2019, IT4IT 2.1
- Stored as JSONB for flexible querying
- Read-only in MVP (admin edit in future)

### 4. CSV Import
- PapaParse for streaming large files
- Validation before insert
- Duplicate handling option
- Error report with row numbers

### 5. PDF Reports
- @react-pdf/renderer for generation
- Templates for: Risk Register, Compliance Summary, Asset Inventory
- Include charts as images (server-side render)

### 6. IT4IT Value Streams
Four value streams with phase mapping:
- **S2P**: Strategy to Portfolio
- **R2D**: Requirement to Deploy
- **R2F**: Request to Fulfill
- **D2C**: Detect to Correct

Each phase maps to controls and shows compliance percentage.

### 7. Accessibility
- WCAG 2.1 AA compliance required
- All interactive elements keyboard accessible
- ARIA labels on custom components
- Color contrast 4.5:1 minimum

### 8. Security
- TLS 1.2+ required
- AES-256 encryption at rest
- Password hashing with bcrypt (12 rounds)
- Session tokens in HTTP-only cookies
- CSRF protection via NextAuth

---

*Created by*: Architect Agent
*Last Updated*: 2026-01-26
