# ITIL Dashboard - Agent Addendum

## Product Overview

**Name**: ITIL Dashboard
**Type**: Web Application
**Status**: Architecture Complete

A comprehensive IT Service Management (ITSM) dashboard covering the five core ITIL processes with role-based views for executives, managers, and operators.

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Frontend Framework | Next.js | 14.x | App Router, Server Components |
| UI Library | React | 18.x | Concurrent features |
| Language | TypeScript | 5.x | Full stack type safety |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Components | shadcn/ui | Latest | Accessible, customizable |
| Charts | Tremor | 3.x | Dashboard visualizations |
| Backend | Fastify | 4.x | High performance |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 5.x | Type-safe queries |
| Testing (Unit) | Vitest | 1.x | Fast, ESM-native |
| Testing (E2E) | Playwright | 1.x | Cross-browser |
| Package Manager | pnpm | 8.x | Fast, efficient |
| Deployment | Vercel + Render | - | Frontend + Backend |

### Port Assignments

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3101 |
| Backend (Fastify) | 5001 |
| PostgreSQL | 5432 |

## Libraries & Dependencies

### Adopted (Use These)

| Library | Version | Purpose | Why Chosen |
|---------|---------|---------|------------|
| @tanstack/react-query | 5.x | Server state management | Caching, optimistic updates, great DX |
| @tanstack/react-table | 8.x | Data tables | Headless, flexible, TypeScript-first |
| react-hook-form | 7.x | Form handling | Performant, minimal re-renders |
| zod | 3.x | Validation | TypeScript-first, shared schemas |
| zustand | 4.x | Client state | Simple, minimal boilerplate |
| date-fns | 4.x | Date utilities | Tree-shakeable, modern |
| date-fns-tz | 3.x | Timezone handling | Integrates with date-fns |
| react-big-calendar | 1.x | Change calendar | Full-featured, proven |
| lucide-react | Latest | Icons | Consistent, comprehensive |
| @fastify/jwt | Latest | Authentication | Official plugin, secure |
| @fastify/cors | Latest | CORS | Official plugin |
| @fastify/cookie | Latest | Cookies | Session management |
| bcrypt | Latest | Password hashing | Industry standard |
| recharts | 2.x | Custom charts | React-native, composable |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| Redux / Redux Toolkit | Overkill - use TanStack Query + Zustand instead |
| Moment.js | Deprecated, not tree-shakeable - use date-fns |
| Formik | Older, more verbose - use react-hook-form |
| Yup | Less TypeScript-native - use Zod |
| ag-grid | Commercial license, overkill |
| Chart.js | Less React-native - use Recharts/Tremor |
| Axios | fetch() is sufficient with TanStack Query |
| styled-components | Use Tailwind CSS instead |
| Material UI | Use shadcn/ui for consistency |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Landing/redirect to dashboard |
| /login | MVP | User login page |
| /register | MVP | User registration (admin only) |
| /forgot-password | MVP | Password reset request |
| /reset-password | MVP | Password reset completion |
| /dashboard | MVP | Role-based main dashboard |
| /dashboard/executive | MVP | Executive dashboard view |
| /dashboard/manager | MVP | Manager dashboard view |
| /dashboard/operator | MVP | Operator dashboard view |
| /incidents | MVP | Incidents list view |
| /incidents/new | MVP | Create new incident |
| /incidents/[id] | MVP | View/edit incident |
| /incidents/[id]/history | MVP | Incident audit history |
| /problems | MVP | Problems list view |
| /problems/new | MVP | Create new problem |
| /problems/[id] | MVP | View/edit problem |
| /problems/known-errors | MVP | Known Error Database |
| /changes | MVP | Changes list view |
| /changes/new | MVP | Create new change request |
| /changes/[id] | MVP | View/edit change |
| /changes/calendar | MVP | Change calendar view |
| /changes/[id]/approval | MVP | Change approval workflow |
| /requests | MVP | Service requests list |
| /requests/new | MVP | Create new service request |
| /requests/[id] | MVP | View/edit request |
| /requests/catalog | MVP | Service catalog browse |
| /knowledge | MVP | Knowledge base home |
| /knowledge/new | MVP | Create new article |
| /knowledge/[id] | MVP | View/edit article |
| /knowledge/search | MVP | Knowledge search |
| /reports | MVP | Reports dashboard |
| /reports/incidents | MVP | Incident reports |
| /reports/sla | MVP | SLA compliance reports |
| /reports/changes | MVP | Change success reports |
| /reports/trends | MVP | Trend analysis |
| /admin | MVP | Admin panel |
| /admin/users | MVP | User management |
| /admin/roles | MVP | Role management |
| /admin/categories | MVP | Category management |
| /admin/sla | MVP | SLA configuration |
| /admin/import | MVP | Data import |
| /admin/export | MVP | Data export |
| /settings | Coming Soon | User settings |
| /settings/profile | Coming Soon | Profile settings |
| /settings/notifications | Coming Soon | Notification preferences |
| /help | MVP | Help/documentation |
| /help/faq | Coming Soon | FAQ section |

## Design Patterns

### Component Patterns

**Component Structure:**
```
components/
├── ui/              # shadcn/ui primitives (Button, Input, Dialog)
├── features/        # Feature components (IncidentForm, SLABadge)
└── layouts/         # Layout components (AppShell, Sidebar)
```

**Component Guidelines:**
- Use Server Components by default
- Add `"use client"` only when needed (hooks, events)
- Keep components under 200 lines
- Extract reusable logic into custom hooks
- Use composition over inheritance

**Naming Conventions:**
- Components: PascalCase (`IncidentForm.tsx`)
- Hooks: camelCase with `use` prefix (`useIncidents.ts`)
- Utils: camelCase (`formatDate.ts`)
- Types: PascalCase with descriptive names (`CreateIncidentInput`)

### State Management

| State Type | Solution | Example |
|------------|----------|---------|
| Server State | TanStack Query | Incidents, users, API data |
| UI State | Zustand | Sidebar open, theme, modals |
| Form State | react-hook-form | Create/edit forms |
| URL State | Next.js router | Filters, pagination, search |

**TanStack Query Patterns:**
```typescript
// Query keys follow [entity, filters] pattern
queryKey: ['incidents', { status, priority, page }]

// Stale time by data freshness need
staleTime: 30_000  // List views
staleTime: 10_000  // Detail views

// Optimistic updates for better UX
onMutate: async (newData) => {
  await queryClient.cancelQueries(['incidents']);
  const previous = queryClient.getQueryData(['incidents']);
  queryClient.setQueryData(['incidents'], (old) => [...old, newData]);
  return { previous };
},
```

**Zustand Store Pattern:**
```typescript
// Minimal, focused stores
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// No async logic in stores - use TanStack Query
```

### API Patterns

**REST Conventions:**
- `GET /api/v1/{resource}` - List with pagination
- `POST /api/v1/{resource}` - Create
- `GET /api/v1/{resource}/{id}` - Get single
- `PATCH /api/v1/{resource}/{id}` - Partial update
- `DELETE /api/v1/{resource}/{id}` - Soft delete

**Response Format:**
```typescript
// Success
{ data: T, meta?: { pagination } }

// Error
{ error: { code: string, message: string, details?: {} } }
```

**Authentication:**
- JWT in HTTP-only cookies
- Access token: 15 minutes
- Refresh token: 7 days
- Auto-refresh on 401

**Pagination:**
- Default page size: 20
- Max page size: 100
- Use cursor for infinite scroll (future)

## Business Logic

### ID Generation

All records use prefixed sequential IDs:
- Incidents: `INC-XXXXX` (e.g., INC-00001)
- Problems: `PRB-XXXXX` (e.g., PRB-00001)
- Changes: `CHG-XXXXX` (e.g., CHG-00001)
- Requests: `REQ-XXXXX` (e.g., REQ-00001)
- Knowledge: `KB-XXXXX` (e.g., KB-00001)

### Status Workflows

**Incident Status Flow:**
```
New → In Progress → Pending → Resolved → Closed
                 ↘ On Hold ↗
```

**Problem Status Flow:**
```
New → Under Investigation → Known Error → Resolved → Closed
```

**Change Status Flow:**
```
Draft → Submitted → Pending Approval → Approved → Scheduled →
Implementing → Completed → Closed
                        ↘ Failed ↗
                        ↘ Rejected (from Pending Approval)
```

**Request Status Flow:**
```
Submitted → Pending Approval → Approved → Fulfilling → Completed → Closed
                            ↘ Rejected
```

### SLA Configuration

| Priority | Response Time | Resolution Time | Description |
|----------|---------------|-----------------|-------------|
| P1 - Critical | 15 minutes | 1 hour | Complete service outage |
| P2 - High | 30 minutes | 4 hours | Major feature unavailable |
| P3 - Medium | 2 hours | 8 hours | Limited functionality |
| P4 - Low | 8 hours | 24 hours | Minor issues |

SLA breach indicators:
- Green (ON_TRACK): > 20% time remaining
- Yellow (AT_RISK): < 20% time remaining
- Red (BREACHED): SLA breached
- Blue (MET): Completed within SLA
- Gray (PAUSED): On Hold

### Change Types

| Type | Approval Required | Risk Assessment | Examples |
|------|-------------------|-----------------|----------|
| Standard | No (pre-approved) | Low | Password resets, standard patches |
| Normal | Yes (CAB) | Medium-High | New deployments, config changes |
| Emergency | Yes (expedited) | High | Critical fixes, security patches |

### Validation Rules

**Incident:**
- Title: Required, 5-200 characters
- Description: Required, minimum 20 characters
- Category: Required, from predefined list
- Priority: Required, P1-P4
- Affected User: Optional

**Problem:**
- Title: Required, 5-200 characters
- Description: Required, minimum 50 characters
- At least one linked incident for creation

**Change:**
- Title: Required, 5-200 characters
- Description: Required, minimum 100 characters
- Implementation Plan: Required for Normal/Emergency
- Rollback Plan: Required for Normal/Emergency
- Scheduled Start/End: Required for Normal changes

**Knowledge Article:**
- Title: Required, 5-200 characters
- Content: Required, minimum 100 characters
- Category: Required
- Keywords: At least one required

### Role Permissions

| Permission | Admin | Manager | Operator |
|------------|-------|---------|----------|
| View dashboards | All | All | Own role |
| Create incidents | Yes | Yes | Yes |
| Assign incidents | Yes | Yes | No |
| Create problems | Yes | Yes | No |
| Approve changes | Yes | Yes (CAB) | No |
| Create changes | Yes | Yes | Yes |
| Manage users | Yes | No | No |
| Configure SLAs | Yes | No | No |
| Import/Export | Yes | Yes | Export only |
| Create KB articles | Yes | Yes | Draft only |

## Data Models

### Key Entities

| Entity | Display ID | Purpose |
|--------|------------|---------|
| User | - | System users with roles |
| Role | - | Permission groups |
| Incident | INC-XXXXX | Service disruptions |
| Problem | PRB-XXXXX | Root cause investigations |
| Change | CHG-XXXXX | Controlled changes |
| ServiceRequest | REQ-XXXXX | Service requests |
| KnowledgeArticle | KB-XXXXX | Knowledge base articles |
| Category | - | Hierarchical categorization |
| SLAConfig | - | SLA timing configuration |
| AuditLog | - | Change audit trail |

### Entity Relationships

```
User ─────┬──── Role
          │
          ├──── Incident (reporter, assignee, affected)
          ├──── Problem (creator, assignee)
          ├──── Change (requester, assignee, approver)
          ├──── ServiceRequest (requester, fulfiller)
          └──── KnowledgeArticle (author)

Incident ───── Category
          │
          ├──── SLAConfig
          ├──── Problem (via ProblemIncident)
          └──── IncidentHistory

Change ───── Category
         │
         ├──── ChangeApproval
         └──── Problem (optional link)

Category ───── Category (parent-child hierarchy)
```

Full schema: See `docs/data-model.md`

## External Integrations

None for MVP (standalone application)

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page load | < 2 seconds | Time to interactive |
| Dashboard refresh | < 5 seconds | Data fetch + render |
| Search results | < 1 second | Query to display |
| Bundle size | < 500KB | Initial JS load |
| Database queries | < 100ms | Average query time |
| API response | < 200ms | P95 latency |

### Performance Strategies

- Server Components for static content
- TanStack Query caching (stale-while-revalidate)
- Database indexes on frequently queried columns
- Pagination for all list endpoints
- Lazy loading for charts and tables
- Image optimization via Next.js

## Special Considerations

### ITIL Terminology

Follow ITIL v4 terminology strictly:
- Use "Incident" not "Ticket"
- Use "Problem" not "Bug"
- Use "Change" not "Release"
- Use "Service Request" not "Task"

### Audit Trail

All entities must maintain full audit trail:
- Created by, created at
- Updated by, updated at
- All field changes logged with before/after values
- Changes must never be permanently deleted (soft delete only)

### Date/Time Handling

- All dates stored in UTC
- Display in user's local timezone
- SLA calculations in business hours (configurable)
- Use `date-fns-tz` for timezone conversions

### Accessibility

- WCAG 2.1 AA compliance required
- Keyboard navigation for all functions
- Screen reader support
- Color contrast ratios met
- Focus indicators visible

### Security

- HTTP-only cookies for JWT
- CSRF protection via SameSite cookies
- Rate limiting on auth endpoints
- Password hashed with bcrypt (cost 12)
- Soft delete only (no data destruction)

## Architecture Documents

| Document | Path | Purpose |
|----------|------|---------|
| Architecture | `docs/architecture.md` | System design |
| Data Model | `docs/data-model.md` | Prisma schema, ERD |
| API Contract | `docs/api-contract.yml` | OpenAPI 3.0 spec |
| ADR-001 | `docs/ADRs/ADR-001-open-source-research.md` | Library research |
| ADR-002 | `docs/ADRs/ADR-002-tech-stack-selection.md` | Tech stack decisions |
| ADR-003 | `docs/ADRs/ADR-003-authentication-authorization.md` | Auth approach |
| ADR-004 | `docs/ADRs/ADR-004-sla-calculation-strategy.md` | SLA logic |

---

*Created by*: Product Manager Agent
*Architecture by*: Architect Agent
*Last Updated*: 2026-01-26
