# IT4IT Dashboard - Agent Addendum

## Product Overview

**Name**: IT4IT Dashboard
**Type**: Web App (Frontend Only)
**Status**: Architecture Complete

A comprehensive dashboard providing visibility across all four IT4IT value streams (Strategy to Portfolio, Requirement to Deploy, Request to Fulfill, Detect to Correct). Uses mock data to demonstrate production-ready functionality aligned with The Open Group's IT4IT Reference Architecture.

**Key Characteristics**:
- Standalone tool - no external integrations
- Mock data only - no real backend
- Production-ready UI quality
- Comprehensive coverage of all four value streams

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js | 14.x | App Router |
| Language | TypeScript | 5.x | Strict mode |
| UI Components | shadcn/ui | latest | CLI-based, copy to project |
| Styling | Tailwind CSS | 3.x | Default stack |
| Charts | Recharts | 3.x | SVG-based charts |
| Tables | @tanstack/react-table | 8.x | Headless tables |
| Drag & Drop | @dnd-kit/core | 6.x | Kanban boards |
| State | Zustand | 5.x | Global state |
| Icons | Lucide React | latest | Default for shadcn |
| Forms | React Hook Form + Zod | latest | Form handling + validation |
| Dates | date-fns | 4.x | Date utilities |
| Mock Data | @faker-js/faker | 10.x | Data generation |
| Testing | Jest, RTL, Playwright | latest | Unit + E2E |
| Backend | None | - | Frontend-only MVP |
| Database | None | - | Mock data service |

---

## Libraries & Dependencies

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| shadcn/ui | UI components | Radix primitives, Tailwind native, accessible |
| Recharts | Charts/graphs | React native, SVG, composable |
| @tanstack/react-table | Data tables | Headless, TypeScript, feature-rich |
| @dnd-kit/core | Drag and drop | Modern, accessible, maintained |
| @faker-js/faker | Mock data | Comprehensive, seeded, TypeScript |
| date-fns | Date utilities | Tree-shakeable, immutable |
| Zustand | State management | Minimal, TypeScript, persistent |
| lucide-react | Icons | Tree-shakeable, shadcn default |
| react-hook-form | Form handling | Minimal re-renders, small bundle |
| zod | Validation | TypeScript schemas, composable |
| next-themes | Theme switching | SSR-safe dark mode |
| clsx + tailwind-merge | Class utilities | Dynamic class composition |
| class-variance-authority | Variants | Component variant management |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| Material UI (MUI) | CSS-in-JS conflicts with Tailwind |
| Ant Design | Large bundle, less flexible styling |
| Chart.js | Canvas-based (less accessible than SVG) |
| react-beautiful-dnd | No longer maintained |
| Moment.js | Deprecated, large bundle |
| Redux | Overkill for frontend-only app |
| React Query/SWR | No backend API to cache |

---

## Site Map

### Global Routes

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing - redirects to /dashboard |
| `/dashboard` | MVP | Executive dashboard with cross-stream overview |
| `/dashboard/settings` | Coming Soon | Dashboard personalization |
| `/settings` | Coming Soon | User settings |
| `/settings/profile` | Coming Soon | User profile |
| `/settings/notifications` | Coming Soon | Notification preferences |
| `/help` | MVP | Help and documentation |
| `/help/getting-started` | MVP | Getting started guide |
| `/help/value-streams` | MVP | IT4IT value stream reference |

### Strategy to Portfolio (S2P)

| Route | Status | Description |
|-------|--------|-------------|
| `/s2p` | MVP | S2P value stream dashboard |
| `/s2p/demands` | MVP | Demand board (Kanban) |
| `/s2p/demands/[id]` | MVP | Demand detail page |
| `/s2p/demands/new` | Coming Soon | Create new demand |
| `/s2p/portfolio` | MVP | Portfolio backlog view |
| `/s2p/portfolio/[id]` | MVP | Portfolio item details |
| `/s2p/investments` | MVP | Investment tracking |
| `/s2p/investments/[id]` | MVP | Investment details |
| `/s2p/proposals` | MVP | Proposals/business cases list |
| `/s2p/proposals/[id]` | MVP | Proposal detail view |
| `/s2p/roadmap` | MVP | Visual roadmap timeline |
| `/s2p/analytics` | Coming Soon | S2P analytics and reports |

### Requirement to Deploy (R2D)

| Route | Status | Description |
|-------|--------|-------------|
| `/r2d` | MVP | R2D value stream dashboard |
| `/r2d/pipeline` | MVP | Deployment pipeline overview |
| `/r2d/pipeline/[id]` | MVP | Pipeline run details |
| `/r2d/releases` | MVP | Release calendar and list |
| `/r2d/releases/[id]` | MVP | Release details |
| `/r2d/releases/new` | Coming Soon | Create new release |
| `/r2d/environments` | MVP | Environment status dashboard |
| `/r2d/environments/[id]` | MVP | Environment details |
| `/r2d/requirements` | MVP | Requirements board |
| `/r2d/requirements/[id]` | MVP | Requirement details |
| `/r2d/builds` | MVP | Build history list |
| `/r2d/builds/[id]` | MVP | Build details and logs |
| `/r2d/tests` | MVP | Test results dashboard |
| `/r2d/tests/[id]` | MVP | Test run details |
| `/r2d/analytics` | Coming Soon | R2D analytics and reports |

### Request to Fulfill (R2F)

| Route | Status | Description |
|-------|--------|-------------|
| `/r2f` | MVP | R2F value stream dashboard |
| `/r2f/catalog` | MVP | Service catalog browse |
| `/r2f/catalog/[id]` | MVP | Service details page |
| `/r2f/catalog/[id]/request` | Coming Soon | Submit service request |
| `/r2f/my-requests` | MVP | User's submitted requests |
| `/r2f/my-requests/[id]` | MVP | Request detail view |
| `/r2f/queue` | MVP | Fulfillment request queue |
| `/r2f/queue/[id]` | MVP | Fulfillment details |
| `/r2f/subscriptions` | MVP | User's active subscriptions |
| `/r2f/subscriptions/[id]` | MVP | Subscription details |
| `/r2f/offers` | MVP | Offer catalog list |
| `/r2f/offers/[id]` | MVP | Offer details |
| `/r2f/analytics` | Coming Soon | R2F analytics and reports |

### Detect to Correct (D2C)

| Route | Status | Description |
|-------|--------|-------------|
| `/d2c` | MVP | D2C value stream dashboard |
| `/d2c/events` | MVP | Event console |
| `/d2c/events/[id]` | MVP | Event details |
| `/d2c/incidents` | MVP | Incident board (queue) |
| `/d2c/incidents/[id]` | MVP | Incident details |
| `/d2c/incidents/new` | Coming Soon | Create new incident |
| `/d2c/problems` | MVP | Problem list |
| `/d2c/problems/[id]` | MVP | Problem details |
| `/d2c/problems/new` | Coming Soon | Create new problem |
| `/d2c/changes` | MVP | Change board (Kanban) |
| `/d2c/changes/[id]` | MVP | Change details |
| `/d2c/changes/new` | Coming Soon | Create new change |
| `/d2c/changes/calendar` | MVP | Change calendar view |
| `/d2c/known-errors` | MVP | Known error database |
| `/d2c/known-errors/[id]` | MVP | Known error details |
| `/d2c/cmdb` | MVP | CMDB browser |
| `/d2c/cmdb/[id]` | MVP | Configuration item details |
| `/d2c/analytics` | Coming Soon | D2C analytics and reports |

**Route Summary**:
- Total MVP routes: 63
- Total Coming Soon routes: 13
- Total routes: 76

---

## Design Patterns

### Component Patterns

#### File Structure

```
src/
├── app/                      # Next.js App Router pages
├── components/
│   ├── ui/                   # shadcn/ui base components
│   ├── layout/               # Layout components (sidebar, header)
│   ├── dashboard/            # Dashboard-specific (KPI cards, charts)
│   ├── data-display/         # Tables, badges, empty states
│   ├── boards/               # Kanban components
│   ├── calendar/             # Calendar views
│   └── shared/               # Coming Soon, loading, errors
├── lib/
│   ├── mock-data/            # Mock data service & generators
│   ├── utils/                # Utility functions
│   └── hooks/                # Custom React hooks
├── stores/                   # Zustand stores
└── types/                    # TypeScript type definitions
```

#### Component Composition

- **Primitives**: shadcn/ui components (`Button`, `Card`, `Table`)
- **Composites**: Domain components built from primitives (`KPICard`, `DataTable`)
- **Features**: Page-level feature components
- **Pages**: Next.js route handlers

#### Naming Conventions

- Components: `PascalCase` (e.g., `KPICard.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useIncidents.ts`)
- Utils: `camelCase` (e.g., `formatDate.ts`)
- Types: `PascalCase` (e.g., `Incident`, `IncidentStatus`)

### State Management

| State Type | Storage | Example |
|------------|---------|---------|
| UI preferences | Zustand + localStorage | Theme, sidebar |
| Filters | URL searchParams | Status, priority |
| Mock data | Zustand (memory) | All entities |
| Modal state | useState | Open/closed |
| Form data | react-hook-form | Input values |

### API Patterns

N/A - Frontend only with mock data. However, the mock data service is designed with a service interface that can be swapped for real API calls later.

```typescript
// Mock data service interface
interface DataService {
  getIncidents(filters?: Filters): Promise<PaginatedResult<Incident>>;
  getIncidentById(id: string): Promise<Incident | null>;
  // ...
}
```

---

## Data Models

See [data-model.md](../docs/data-model.md) for complete TypeScript interfaces.

### Key Entities by Value Stream

**S2P Entities**
- Demand - Business requests for IT capabilities
- PortfolioItem - Prioritized work in the portfolio
- Proposal - Business cases for investment
- Investment - Approved and funded initiatives
- RoadmapMilestone - Strategic plan checkpoints

**R2D Entities**
- Requirement - Specifications for IT capabilities
- Pipeline / PipelineRun - CI/CD pipelines
- Build - Development artifacts
- TestCase / TestRun - QA records
- Release - Deployable packages
- Environment - Deployment targets

**R2F Entities**
- CatalogEntry - Available services
- OfferItem - Purchasable/requestable items
- ServiceRequest - User requests
- FulfillmentRequest - Backend fulfillment
- Subscription - Ongoing subscriptions

**D2C Entities**
- Event - System notifications
- Incident - Service disruptions
- Problem - Root cause investigations
- Change - Planned modifications
- KnownError - Documented issues
- ConfigurationItem - IT assets (CMDB)

---

## Business Logic

### Value Stream Organization

The dashboard follows IT4IT's four value streams:

1. **S2P (Strategy to Portfolio)** - Blue color theme
   - Manages IT portfolio from demand to investment
   - Key objects: Demand, Portfolio Item, Proposal, Investment, Roadmap

2. **R2D (Requirement to Deploy)** - Green color theme
   - Manages service lifecycle from requirement to deployment
   - Key objects: Requirement, Build, Test, Release, Environment

3. **R2F (Request to Fulfill)** - Purple color theme
   - Enables users to request and receive IT services
   - Key objects: Catalog Entry, Request, Fulfillment, Subscription

4. **D2C (Detect to Correct)** - Orange/Red color theme
   - Detects, diagnoses, and resolves IT issues
   - Key objects: Event, Incident, Problem, Change, CI

### Status Workflows

#### Demand Status Flow (S2P)
```
Submitted -> Under Review -> Assessed -> Approved/Rejected -> In Portfolio
```

#### Incident Status Flow (D2C)
```
New -> Assigned -> In Progress -> Pending -> Resolved -> Closed
```

#### Change Status Flow (D2C)
```
Draft -> Submitted -> Under Review -> Approved/Rejected -> Scheduled -> Implementing -> Completed/Failed
```

#### Request Status Flow (R2F)
```
Submitted -> Pending Approval -> Approved -> In Fulfillment -> Fulfilled -> Closed
```

### Priority Levels

| Level | Label | Color | Description |
|-------|-------|-------|-------------|
| 1 | Critical | Red | Business critical, immediate attention |
| 2 | High | Orange | Significant impact, urgent |
| 3 | Medium | Yellow | Moderate impact |
| 4 | Low | Green | Minor impact |

### Severity Levels (Incidents)

| Level | Label | Impact Description |
|-------|-------|-------------------|
| 1 | Critical | Complete service outage, major business impact |
| 2 | Major | Significant degradation, many users affected |
| 3 | Minor | Limited impact, workaround available |
| 4 | Warning | Potential issue, no current impact |

### SLA Calculations

- SLA breach is calculated from creation time
- Different SLA thresholds by priority:
  - P1: 4 hours
  - P2: 8 hours
  - P3: 24 hours
  - P4: 72 hours

### KPI Formulas

**Incident Resolution Rate**
```
(Resolved Incidents / Total Incidents) * 100
```

**Change Success Rate**
```
(Successful Changes / Completed Changes) * 100
```

**Service Availability**
```
((Total Time - Downtime) / Total Time) * 100
```

**Demand Cycle Time**
```
Average(Portfolio Approval Date - Demand Submit Date)
```

---

## External Integrations

None - this is a standalone application with mock data only.

---

## Performance Requirements

- Initial page load: < 3 seconds
- Page navigation: < 500ms
- Chart rendering: < 1 second
- Scroll performance: 60fps
- Bundle size: < 500KB (initial load)

### Performance Strategies

- Code splitting with dynamic imports
- Lazy-loaded routes for Coming Soon pages
- Virtual scrolling for large lists (events, builds)
- Tree-shaking for icons and utilities
- Image optimization with next/image

---

## Special Considerations

### Mock Data Requirements

1. **Realism**: Data must represent realistic IT operations scenarios
2. **Relationships**: Entities must have meaningful relationships (e.g., incident linked to CI)
3. **Volume**: Sufficient data to demonstrate pagination and filtering
4. **Scenarios**: Include various statuses to show different workflow states
5. **Time-based**: Include historical data for trend charts (30+ days)
6. **Reproducibility**: Use seeded random for consistent demo experience

### UI/UX Guidelines

1. **Consistency**: All value streams follow same navigation and layout patterns
2. **Color Coding**: Each value stream has distinct but harmonious color theme
3. **Status Indicators**: Use both color and icons for accessibility
4. **Empty States**: All lists must handle empty state gracefully
5. **Loading States**: Show skeleton loaders during data fetch

### Coming Soon Pages

All "Coming Soon" routes must:
1. Show a placeholder page with consistent styling
2. Display "Coming Soon" message with feature description
3. Provide navigation back to parent or dashboard
4. Not appear broken or throw errors

### Accessibility

1. All interactive elements keyboard accessible
2. ARIA labels on icons and non-text content
3. Focus indicators on all focusable elements
4. Color contrast meets WCAG AA standards
5. Screen reader compatible navigation

### Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Mobile Responsiveness

- Minimum supported width: 1024px
- Below 768px: Show "Desktop Only" message
- No native mobile app planned

---

## Related Documents

- [Architecture](../docs/architecture.md)
- [Data Model](../docs/data-model.md)
- [PRD](../docs/PRD.md)
- [ADR-001: Tech Stack Research](../docs/ADRs/ADR-001-tech-stack-research.md)
- [ADR-002: Component Library](../docs/ADRs/ADR-002-component-library.md)
- [ADR-003: State Management](../docs/ADRs/ADR-003-state-management.md)
- [ADR-004: Mock Data Strategy](../docs/ADRs/ADR-004-mock-data-strategy.md)

---

*Created by*: Architect Agent
*Last Updated*: 2025-01-26
