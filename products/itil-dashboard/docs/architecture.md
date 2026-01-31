# ITIL Dashboard - System Architecture

## 1. Overview

The ITIL Dashboard is a comprehensive IT Service Management (ITSM) platform that provides visualization and management capabilities across the five core ITIL processes:

1. **Incident Management** - Track and resolve service disruptions
2. **Problem Management** - Identify and address root causes
3. **Change Management** - Control and approve changes
4. **Service Request Management** - Handle service requests
5. **Knowledge Management** - Capture and share knowledge

### 1.1 Architecture Principles

- **Separation of Concerns**: Clear boundaries between frontend, backend, and database
- **Type Safety**: Full TypeScript across the stack
- **API-First**: Well-defined contracts between services
- **Security by Default**: Authentication required, permissions enforced
- **Audit Everything**: Complete trail of all changes
- **Performance**: Sub-2-second page loads, efficient queries

## 2. System Architecture Diagram

```
                                    ┌─────────────────────────────────────────────────────┐
                                    │                    CLIENTS                          │
                                    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
                                    │  │   Desktop   │  │   Tablet    │  │   Mobile    │  │
                                    │  │   Browser   │  │   Browser   │  │   Browser   │  │
                                    │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
                                    └─────────┼────────────────┼────────────────┼─────────┘
                                              │                │                │
                                              └────────────────┼────────────────┘
                                                               │
                                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         FRONTEND (Next.js)                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    App Router (Pages)                                      │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐  │  │
│  │  │  Auth   │ │Dashboard │ │ Incidents  │ │ Problems │ │ Changes  │ │Requests │ │  KB   │  │  │
│  │  │  Pages  │ │  Pages   │ │   Pages    │ │  Pages   │ │  Pages   │ │ Pages   │ │ Pages │  │  │
│  │  └─────────┘ └──────────┘ └────────────┘ └──────────┘ └──────────┘ └─────────┘ └───────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    Feature Components                                       │  │
│  │  ┌─────────────┐ ┌───────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │  DataTables │ │    Charts     │ │   Forms     │ │   Calendar   │ │   Dashboards     │  │  │
│  │  │  (TanStack) │ │   (Tremor)    │ │ (RHF+Zod)  │ │(BigCalendar) │ │ (Role-specific)  │  │  │
│  │  └─────────────┘ └───────────────┘ └─────────────┘ └──────────────┘ └──────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    Shared Infrastructure                                    │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐  │  │
│  │  │   shadcn/ui  │ │  TanStack    │ │   Zustand    │ │    Auth      │ │   Utilities     │  │  │
│  │  │  Components  │ │    Query     │ │    Store     │ │   Context    │ │  (date-fns)     │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              Port: 3101                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   │ HTTP/REST (JSON)
                                                   │ Cookies (JWT)
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         BACKEND (Fastify)                                        │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      API Routes                                            │  │
│  │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │  │
│  │  │  /auth  │ │/incidents │ │/problems │ │/changes  │ │/requests │ │/knowledge│ │/admin  │  │  │
│  │  │         │ │           │ │          │ │          │ │          │ │          │ │        │  │  │
│  │  └─────────┘ └───────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ └────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      Services                                              │  │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │  │
│  │  │  AuthService   │ │ IncidentSvc    │ │  ChangeSvc     │ │  SLAService    │              │  │
│  │  │  - Login       │ │  - CRUD        │ │  - Approval    │ │  - Calculate   │              │  │
│  │  │  - JWT         │ │  - Search      │ │  - Schedule    │ │  - Track       │              │  │
│  │  │  - Permissions │ │  - SLA         │ │  - Calendar    │ │  - Report      │              │  │
│  │  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘              │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                      Plugins                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │  │
│  │  │   JWT    │ │  CORS    │ │ Cookies  │ │  Prisma  │ │  Swagger │ │  Rate Limiter    │    │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              Port: 5001                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   │ Prisma Client
                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATABASE (PostgreSQL)                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                         Tables                                             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────────┐   │  │
│  │  │  User   │ │ Incident │ │ Problem  │ │  Change  │ │  Request  │ │ KnowledgeArticle  │   │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ └───────────────────┘   │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────────┐   │  │
│  │  │  Role   │ │ SLAConfig│ │ Category │ │ AuditLog │ │  Holiday  │ │  RefreshToken     │   │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘ └───────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              Port: 5432                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Frontend Architecture

### 3.1 Next.js App Router Structure

```
apps/web/src/
├── app/
│   ├── (auth)/                     # Auth layout group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx              # Minimal layout for auth pages
│   │
│   ├── (dashboard)/                # Main app layout group
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Role-based redirect
│   │   │   ├── executive/page.tsx
│   │   │   ├── manager/page.tsx
│   │   │   └── operator/page.tsx
│   │   │
│   │   ├── incidents/
│   │   │   ├── page.tsx            # List view
│   │   │   ├── new/page.tsx        # Create form
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Detail/edit view
│   │   │       └── history/page.tsx
│   │   │
│   │   ├── problems/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── known-errors/page.tsx
│   │   │
│   │   ├── changes/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── approval/page.tsx
│   │   │
│   │   ├── requests/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── catalog/page.tsx
│   │   │   └── [id]/page.tsx
│   │   │
│   │   ├── knowledge/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   └── [id]/page.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   ├── incidents/page.tsx
│   │   │   ├── sla/page.tsx
│   │   │   ├── changes/page.tsx
│   │   │   └── trends/page.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── roles/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── sla/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   └── export/page.tsx
│   │   │
│   │   ├── help/page.tsx
│   │   └── layout.tsx              # Main app layout with sidebar
│   │
│   ├── api/                        # Next.js API routes (proxy to backend)
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Redirect to /dashboard
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── features/                   # Feature-specific components
│   │   ├── incidents/
│   │   │   ├── incident-form.tsx
│   │   │   ├── incident-table.tsx
│   │   │   ├── incident-detail.tsx
│   │   │   └── sla-badge.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── executive-dashboard.tsx
│   │   │   ├── manager-dashboard.tsx
│   │   │   ├── operator-dashboard.tsx
│   │   │   └── metric-card.tsx
│   │   │
│   │   └── ...
│   │
│   └── layouts/
│       ├── app-shell.tsx           # Main app shell
│       ├── sidebar.tsx             # Navigation sidebar
│       └── header.tsx              # Top header
│
├── hooks/
│   ├── use-auth.ts                 # Authentication hook
│   ├── use-incidents.ts            # Incident queries
│   └── ...
│
├── lib/
│   ├── api-client.ts               # Axios/fetch wrapper
│   ├── utils.ts                    # Utilities
│   └── validations.ts              # Zod schemas
│
├── stores/
│   └── ui-store.ts                 # Zustand store
│
└── types/
    └── index.ts                    # TypeScript types
```

### 3.2 Component Architecture

**Component Layers:**

1. **UI Components** (shadcn/ui): Primitive, unstyled components
2. **Feature Components**: Business-logic-aware components
3. **Page Components**: Route-level components that compose features
4. **Layout Components**: Structural wrappers

**State Management Strategy:**

| State Type | Solution | Example |
|------------|----------|---------|
| Server State | TanStack Query | Incidents, users, changes |
| UI State | Zustand | Sidebar open, theme, filters |
| Form State | react-hook-form | Create/edit forms |
| URL State | Next.js router | Search params, pagination |

### 3.3 Data Fetching Pattern

```typescript
// hooks/use-incidents.ts
export function useIncidents(filters: IncidentFilters) {
  return useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => api.incidents.list(filters),
    staleTime: 30_000, // 30 seconds
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: () => api.incidents.get(id),
    staleTime: 10_000, // 10 seconds for detail view
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.incidents.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
```

## 4. Backend Architecture

### 4.1 Fastify Application Structure

```
apps/api/src/
├── index.ts                        # Application entry point
├── app.ts                          # Fastify app factory
│
├── routes/
│   ├── index.ts                    # Route registration
│   ├── auth/
│   │   ├── index.ts                # Auth routes
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   ├── refresh.ts
│   │   └── password-reset.ts
│   │
│   ├── incidents/
│   │   ├── index.ts
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── get.ts
│   │   ├── update.ts
│   │   └── history.ts
│   │
│   ├── problems/
│   ├── changes/
│   ├── requests/
│   ├── knowledge/
│   ├── reports/
│   └── admin/
│
├── services/
│   ├── auth.service.ts
│   ├── incident.service.ts
│   ├── problem.service.ts
│   ├── change.service.ts
│   ├── request.service.ts
│   ├── knowledge.service.ts
│   ├── sla.service.ts
│   ├── audit.service.ts
│   └── report.service.ts
│
├── plugins/
│   ├── prisma.ts                   # Prisma client plugin
│   ├── auth.ts                     # JWT authentication
│   ├── cors.ts                     # CORS configuration
│   └── swagger.ts                  # OpenAPI documentation
│
├── middleware/
│   ├── authenticate.ts             # Auth middleware
│   ├── authorize.ts                # Permission middleware
│   └── rate-limit.ts               # Rate limiting
│
├── schemas/
│   ├── incident.schema.ts          # Zod schemas
│   ├── problem.schema.ts
│   ├── change.schema.ts
│   └── ...
│
├── utils/
│   ├── id-generator.ts             # INC-XXXXX generator
│   ├── business-hours.ts           # SLA calculations
│   └── pagination.ts               # Pagination helpers
│
└── types/
    └── fastify.d.ts                # Fastify type extensions
```

### 4.2 API Design

**RESTful Conventions:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/v1/incidents | List with pagination/filters |
| POST | /api/v1/incidents | Create new incident |
| GET | /api/v1/incidents/:id | Get single incident |
| PATCH | /api/v1/incidents/:id | Update incident |
| DELETE | /api/v1/incidents/:id | Soft delete incident |
| GET | /api/v1/incidents/:id/history | Get audit history |

**Standard Response Format:**

```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 4.3 Service Layer Pattern

```typescript
// services/incident.service.ts
export class IncidentService {
  constructor(
    private prisma: PrismaClient,
    private slaService: SLAService,
    private auditService: AuditService
  ) {}

  async create(data: CreateIncidentInput, userId: string): Promise<Incident> {
    // Generate unique ID
    const displayId = await this.generateDisplayId();

    // Calculate SLA deadlines
    const slaDeadlines = await this.slaService.calculateDeadlines(
      data.priority,
      new Date()
    );

    // Create incident with audit log
    const incident = await this.prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          ...data,
          displayId,
          ...slaDeadlines,
          createdById: userId,
          status: 'NEW',
        },
      });

      await this.auditService.log(tx, {
        entityType: 'INCIDENT',
        entityId: created.id,
        action: 'CREATE',
        userId,
        newValues: created,
      });

      return created;
    });

    return incident;
  }

  // ... other methods
}
```

## 5. Database Design

### 5.1 Core Principles

- **Soft Deletes**: Records are never physically deleted (`deletedAt` timestamp)
- **Audit Trail**: All changes logged to `AuditLog` table
- **Normalized**: Third normal form for core entities
- **Indexed**: Strategic indexes for common queries
- **UTC Dates**: All timestamps in UTC

### 5.2 Entity Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER MANAGEMENT                              │
│                                                                          │
│   User ◄───────── Role                                                   │
│     │               │                                                    │
│     │               └──── Permission                                     │
│     │                                                                    │
│     └──── RefreshToken                                                   │
│     └──── PasswordResetToken                                             │
│     └──── AuthAuditLog                                                   │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                           ITIL CORE ENTITIES                             │
│                                                                          │
│   Incident ────────────► Problem ◄──────────── Change                    │
│       │                     │                     │                      │
│       ├── IncidentHistory   ├── ProblemIncident   ├── ChangeApproval     │
│       ├── SLAPause          └── KnownError        └── ChangeHistory      │
│       └── IncidentAttachment                                             │
│                                                                          │
│   ServiceRequest ────────► ServiceCatalogItem                            │
│       │                                                                  │
│       └── RequestApproval                                                │
│                                                                          │
│   KnowledgeArticle ────────► ArticleVersion                              │
│       │                                                                  │
│       └── ArticleRating                                                  │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                            CONFIGURATION                                 │
│                                                                          │
│   SLAConfig ────────► Holiday                                            │
│                                                                          │
│   Category (self-referential for hierarchy)                              │
│                                                                          │
│   AuditLog (central audit trail)                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

See `data-model.md` for complete Prisma schema and ERD.

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌────────┐         ┌────────┐         ┌────────┐         ┌──────────┐
│ Client │         │Next.js │         │Fastify │         │PostgreSQL│
└───┬────┘         └───┬────┘         └───┬────┘         └────┬─────┘
    │                  │                  │                   │
    │ POST /login      │                  │                   │
    │ (email, pass)    │                  │                   │
    ├─────────────────►│                  │                   │
    │                  │ POST /api/auth   │                   │
    │                  │ /login           │                   │
    │                  ├─────────────────►│                   │
    │                  │                  │ SELECT user       │
    │                  │                  │ WHERE email=?     │
    │                  │                  ├──────────────────►│
    │                  │                  │ user data         │
    │                  │                  │◄──────────────────┤
    │                  │                  │                   │
    │                  │                  │ Verify bcrypt     │
    │                  │                  │ Generate JWT      │
    │                  │                  │                   │
    │                  │                  │ INSERT refresh    │
    │                  │                  │ token             │
    │                  │                  ├──────────────────►│
    │                  │                  │                   │
    │                  │ Set-Cookie:      │                   │
    │                  │ access_token,    │                   │
    │                  │ refresh_token    │                   │
    │                  │◄─────────────────┤                   │
    │ Set-Cookie       │                  │                   │
    │ + redirect       │                  │                   │
    │◄─────────────────┤                  │                   │
```

### 6.2 Authorization Matrix

See ADR-003 for complete permission definitions.

### 6.3 Security Measures

| Threat | Mitigation |
|--------|------------|
| XSS | HTTP-only cookies, CSP headers |
| CSRF | SameSite cookies, CSRF tokens for mutations |
| SQL Injection | Prisma ORM parameterized queries |
| Brute Force | Rate limiting, account lockout |
| Session Hijacking | Secure cookies, short token lifetime |
| Data Exposure | Role-based access control |

## 7. Deployment Architecture

### 7.1 Development Environment

```
┌───────────────────────────────────────────────────────────────┐
│                     Developer Machine                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │   Next.js Dev   │  │   Fastify Dev   │  │  PostgreSQL   │ │
│  │   (port 3101)   │  │   (port 5001)   │  │  (port 5432)  │ │
│  │                 │  │                 │  │               │ │
│  │   Hot Reload    │  │   Hot Reload    │  │  Docker or    │ │
│  │                 │  │                 │  │  Local        │ │
│  └─────────────────┘  └─────────────────┘  └───────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### 7.2 Production Environment (Future)

```
┌───────────────────────────────────────────────────────────────┐
│                         Vercel                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Next.js (Edge)                        │ │
│  │              Static + Server Components                  │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────┐
│                         Render                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Fastify (Container)                     │ │
│  │                    Auto-scaling                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 PostgreSQL (Managed)                     │ │
│  │                 Daily Backups                            │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## 8. Performance Considerations

### 8.1 Frontend Performance

- **Code Splitting**: Next.js automatic code splitting per route
- **Bundle Size**: Target <500KB initial load
- **Caching**: TanStack Query with stale-while-revalidate
- **Optimistic Updates**: For better perceived performance
- **Lazy Loading**: Tables and charts loaded on demand

### 8.2 Backend Performance

- **Connection Pooling**: Prisma manages PostgreSQL connections
- **Pagination**: All list endpoints paginated (default 20, max 100)
- **Indexes**: Strategic indexes on frequently queried columns
- **Query Optimization**: Include only needed relations
- **Caching**: Consider Redis for future scaling

### 8.3 Database Performance

**Indexes Created:**

```sql
-- User lookups
CREATE INDEX idx_user_email ON "User" (email);

-- Incident queries
CREATE INDEX idx_incident_status ON "Incident" (status);
CREATE INDEX idx_incident_priority ON "Incident" (priority);
CREATE INDEX idx_incident_assignee ON "Incident" (assignee_id);
CREATE INDEX idx_incident_created ON "Incident" (created_at DESC);
CREATE INDEX idx_incident_sla_due ON "Incident" (resolution_sla_due);

-- Audit queries
CREATE INDEX idx_audit_entity ON "AuditLog" (entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON "AuditLog" (timestamp DESC);

-- Full text search (future)
CREATE INDEX idx_incident_search ON "Incident" USING gin(to_tsvector('english', title || ' ' || description));
```

## 9. Testing Strategy

### 9.1 Test Pyramid

```
                    ┌─────────┐
                   /   E2E    \        (Playwright)
                  /   Tests    \       Few, critical paths
                 /─────────────\
                /  Integration  \      (Vitest + real DB)
               /     Tests       \     API and DB layer
              /───────────────────\
             /      Unit Tests      \  (Vitest)
            /    Components + Utils   \ Fast, many
           └───────────────────────────┘
```

### 9.2 Test Categories

| Type | Location | Purpose | Tools |
|------|----------|---------|-------|
| Unit | `apps/*/tests/unit/` | Functions, utilities | Vitest |
| Component | `apps/web/tests/components/` | React components | Vitest + RTL |
| Integration | `apps/api/tests/integration/` | API + Database | Vitest + Prisma |
| E2E | `e2e/` | Full user flows | Playwright |

## 10. Monitoring & Observability (Future)

Post-MVP considerations:

- **Logging**: Structured JSON logs with Pino (Fastify default)
- **Metrics**: Response times, error rates, SLA compliance
- **Tracing**: Request tracing across services
- **Alerting**: SLA breach notifications, error spikes

## References

- [ADR-001: Open Source Research](./ADRs/ADR-001-open-source-research.md)
- [ADR-002: Tech Stack Selection](./ADRs/ADR-002-tech-stack-selection.md)
- [ADR-003: Authentication & Authorization](./ADRs/ADR-003-authentication-authorization.md)
- [ADR-004: SLA Calculation Strategy](./ADRs/ADR-004-sla-calculation-strategy.md)
- [Data Model](./data-model.md)
- [API Contract](./api-contract.yml)
- [PRD](./PRD.md)
