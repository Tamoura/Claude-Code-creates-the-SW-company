# IT4IT Dashboard - System Architecture

## Overview

The IT4IT Dashboard is a **frontend-only web application** built with Next.js 14 that provides comprehensive visibility across all four IT4IT value streams. The application uses mock data to demonstrate production-ready functionality aligned with The Open Group's IT4IT Reference Architecture.

### Key Architectural Decisions

- **No Backend**: All data is mock, no API server needed
- **Static Generation**: Pages can be statically generated for performance
- **Component-Driven**: Built with shadcn/ui for consistent design
- **Type-Safe**: Full TypeScript coverage

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Browser                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Next.js 14 App Router                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │                         Layout Shell                              │  │ │
│  │  │  ┌─────────────┐ ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │  Sidebar    │ │              Main Content                   │  │  │ │
│  │  │  │  Navigation │ │  ┌──────────────────────────────────────┐  │  │  │ │
│  │  │  │             │ │  │           Page Header                 │  │  │  │ │
│  │  │  │  - S2P      │ │  ├──────────────────────────────────────┤  │  │  │ │
│  │  │  │  - R2D      │ │  │                                      │  │  │  │ │
│  │  │  │  - R2F      │ │  │         Page Content                 │  │  │  │ │
│  │  │  │  - D2C      │ │  │                                      │  │  │  │ │
│  │  │  │             │ │  │   - Dashboards (Charts, KPIs)        │  │  │  │ │
│  │  │  │  Settings   │ │  │   - Lists (Tables, Cards)            │  │  │  │ │
│  │  │  │  Help       │ │  │   - Details (Forms, Panels)          │  │  │  │ │
│  │  │  │             │ │  │   - Boards (Kanban, Calendar)        │  │  │  │ │
│  │  │  │             │ │  │                                      │  │  │  │ │
│  │  │  └─────────────┘ │  └──────────────────────────────────────┘  │  │  │ │
│  │  │                  └────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                         │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │ │
│  │  │  State         │  │  Mock Data     │  │  UI Components         │   │ │
│  │  │  (Zustand)     │  │  Service       │  │  (shadcn/ui)           │   │ │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Next.js | 14.x | React framework with App Router |
| Language | TypeScript | 5.x | Type safety |
| UI Components | shadcn/ui | latest | Accessible component primitives |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Charts | Recharts | 3.x | Data visualization |
| Tables | TanStack Table | 8.x | Data tables |
| Drag & Drop | dnd-kit | 6.x | Kanban boards |
| State | Zustand | 5.x | Global state management |
| Icons | Lucide React | latest | Icon system |
| Dates | date-fns | 4.x | Date utilities |
| Forms | React Hook Form | latest | Form handling |
| Validation | Zod | latest | Schema validation |
| Mock Data | @faker-js/faker | 10.x | Data generation |
| Testing | Jest + Playwright | latest | Unit + E2E tests |

## Component Architecture

### Component Hierarchy

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard layout group
│   │   ├── layout.tsx            # Main app layout
│   │   ├── page.tsx              # Redirect to /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Executive dashboard
│   │   ├── s2p/                  # S2P value stream
│   │   ├── r2d/                  # R2D value stream
│   │   ├── r2f/                  # R2F value stream
│   │   ├── d2c/                  # D2C value stream
│   │   └── help/                 # Help pages
│   └── globals.css               # Global styles
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── page-header.tsx
│   ├── dashboard/                # Dashboard-specific
│   │   ├── kpi-card.tsx
│   │   ├── chart-card.tsx
│   │   └── value-stream-card.tsx
│   ├── data-display/             # Data display components
│   │   ├── data-table.tsx
│   │   ├── status-badge.tsx
│   │   ├── priority-badge.tsx
│   │   └── empty-state.tsx
│   ├── boards/                   # Board components
│   │   ├── kanban-board.tsx
│   │   ├── kanban-column.tsx
│   │   └── kanban-card.tsx
│   ├── calendar/                 # Calendar components
│   │   ├── calendar-view.tsx
│   │   └── event-card.tsx
│   └── shared/                   # Shared utilities
│       ├── coming-soon.tsx
│       ├── loading.tsx
│       └── error-boundary.tsx
│
├── lib/
│   ├── mock-data/                # Mock data service
│   │   ├── index.ts
│   │   ├── generators/
│   │   └── types.ts
│   ├── utils/                    # Utility functions
│   │   ├── cn.ts                 # Class name utility
│   │   ├── format.ts             # Formatting helpers
│   │   └── dates.ts              # Date helpers
│   └── hooks/                    # Custom hooks
│       ├── use-mock-data.ts
│       └── use-filters.ts
│
├── stores/                       # Zustand stores
│   ├── ui-store.ts
│   ├── filter-store.ts
│   └── index.ts
│
└── types/                        # TypeScript types
    ├── s2p.ts
    ├── r2d.ts
    ├── r2f.ts
    ├── d2c.ts
    └── common.ts
```

### Component Categories

#### 1. Layout Components
Shell components that define the overall structure:

```typescript
// Layout hierarchy
<RootLayout>              // Theme, fonts
  <DashboardLayout>       // Sidebar + content area
    <PageHeader />        // Title, breadcrumbs, actions
    <PageContent>         // Main content
      {children}
    </PageContent>
  </DashboardLayout>
</RootLayout>
```

#### 2. UI Components (shadcn/ui)
Primitive components from shadcn/ui:
- Button, Card, Badge, Avatar
- Dialog, Sheet, Dropdown
- Table, Tabs, Input, Select
- Calendar, Tooltip, Skeleton

#### 3. Composite Components
Domain-specific components built from primitives:
- KPICard, ChartCard, StatusBadge
- DataTable (Table + TanStack)
- KanbanBoard (Card + dnd-kit)

#### 4. Page Components
Route-specific components:
- Dashboard views
- List pages
- Detail pages
- Board views

## State Management

### State Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         State Management                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Zustand Stores (Global State)                              │ │
│  │ ├── UI Store: theme, sidebar, preferences                  │ │
│  │ ├── Filter Store: saved filters per entity type            │ │
│  │ └── Mock Data Store: generated mock data cache             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ URL State (Next.js searchParams)                           │ │
│  │ └── Filters, sort, pagination - shareable/bookmarkable     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ React Context (Provider-based)                             │ │
│  │ ├── Theme Provider (next-themes)                           │ │
│  │ └── Value Stream Context (current stream theming)          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Component State (useState/useReducer)                      │ │
│  │ └── Local UI state: modals, dropdowns, form inputs         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Mock Data Service
      │
      ▼
┌─────────────────┐
│  Mock Data      │ ──── Generated at app init with seed
│  Store          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Service   │ ──── Filtering, pagination, relationships
│  (dataService)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Custom Hooks   │ ──── useDemands, useIncidents, etc.
│  (use*)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Components     │ ──── UI rendering
└─────────────────┘
```

## Routing Structure

### Route Groups

Using Next.js App Router route groups:

```
app/
├── (dashboard)/                    # Main dashboard group
│   ├── layout.tsx                  # Sidebar + content layout
│   ├── page.tsx                    # Redirects to /dashboard
│   ├── dashboard/
│   │   ├── page.tsx                # Executive dashboard
│   │   └── settings/
│   │       └── page.tsx            # Coming Soon
│   │
│   ├── s2p/                        # Strategy to Portfolio
│   │   ├── page.tsx                # S2P Dashboard
│   │   ├── demands/
│   │   │   ├── page.tsx            # Demand Board
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx        # Demand Details
│   │   │   └── new/
│   │   │       └── page.tsx        # Coming Soon
│   │   ├── portfolio/
│   │   ├── investments/
│   │   ├── proposals/
│   │   ├── roadmap/
│   │   └── analytics/
│   │
│   ├── r2d/                        # Requirement to Deploy
│   │   ├── page.tsx                # R2D Dashboard
│   │   ├── pipeline/
│   │   ├── releases/
│   │   ├── environments/
│   │   ├── requirements/
│   │   ├── builds/
│   │   ├── tests/
│   │   └── analytics/
│   │
│   ├── r2f/                        # Request to Fulfill
│   │   ├── page.tsx                # R2F Dashboard
│   │   ├── catalog/
│   │   ├── my-requests/
│   │   ├── queue/
│   │   ├── subscriptions/
│   │   ├── offers/
│   │   └── analytics/
│   │
│   ├── d2c/                        # Detect to Correct
│   │   ├── page.tsx                # D2C Dashboard
│   │   ├── events/
│   │   ├── incidents/
│   │   ├── problems/
│   │   ├── changes/
│   │   ├── known-errors/
│   │   ├── cmdb/
│   │   └── analytics/
│   │
│   ├── settings/                   # All Coming Soon
│   │   ├── page.tsx
│   │   ├── profile/
│   │   └── notifications/
│   │
│   └── help/
│       ├── page.tsx                # Help Index
│       ├── getting-started/
│       └── value-streams/
│
└── globals.css
```

### Route Summary

| Category | MVP Routes | Coming Soon | Total |
|----------|------------|-------------|-------|
| Global | 6 | 4 | 10 |
| S2P | 10 | 2 | 12 |
| R2D | 13 | 2 | 15 |
| R2F | 11 | 2 | 13 |
| D2C | 17 | 3 | 20 |
| Settings | 0 | 3 | 3 |
| Help | 3 | 0 | 3 |
| **Total** | **60** | **16** | **76** |

## Mock Data Architecture

### Data Service Interface

```typescript
// src/lib/mock-data/types.ts

interface DataService {
  // S2P
  getDemands(filters?: Filters): Promise<PaginatedResult<Demand>>;
  getDemandById(id: string): Promise<Demand | null>;
  getPortfolioItems(filters?: Filters): Promise<PaginatedResult<PortfolioItem>>;
  // ... more methods

  // Aggregations
  getDashboardMetrics(stream?: ValueStream): Promise<DashboardMetrics>;
  getHistoricalData(type: string, days: number): Promise<TimeSeriesData>;
}
```

### Generator Pattern

```typescript
// src/lib/mock-data/generators/d2c/incidents.ts

import { faker } from '@faker-js/faker';
import type { Incident } from '@/types/d2c';

export function generateIncidents(count: number): Incident[] {
  return Array.from({ length: count }, () => ({
    id: `INC-${faker.string.alphanumeric(6).toUpperCase()}`,
    title: generateIncidentTitle(),
    description: faker.lorem.paragraph(),
    severity: faker.helpers.arrayElement([1, 2, 3, 4]),
    priority: faker.helpers.arrayElement([1, 2, 3, 4]),
    status: faker.helpers.arrayElement([
      'new', 'assigned', 'in_progress', 'pending', 'resolved', 'closed'
    ]),
    assignee: faker.person.fullName(),
    createdAt: faker.date.recent({ days: 30 }),
    updatedAt: faker.date.recent({ days: 7 }),
    relatedCIs: generateRelatedCIs(),
    // ...
  }));
}
```

## Theming

### Value Stream Colors

```css
/* src/app/globals.css */

:root {
  /* Base colors */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --primary: 222 47% 11%;
  --secondary: 210 40% 96%;

  /* S2P - Blue */
  --s2p-50: 214 100% 97%;
  --s2p-100: 214 95% 93%;
  --s2p-500: 217 91% 60%;
  --s2p-600: 221 83% 53%;
  --s2p-700: 224 76% 48%;

  /* R2D - Green */
  --r2d-50: 138 76% 97%;
  --r2d-100: 141 84% 93%;
  --r2d-500: 142 71% 45%;
  --r2d-600: 142 76% 36%;
  --r2d-700: 142 72% 29%;

  /* R2F - Purple */
  --r2f-50: 270 100% 98%;
  --r2f-100: 269 100% 95%;
  --r2f-500: 262 83% 58%;
  --r2f-600: 262 83% 51%;
  --r2f-700: 263 70% 50%;

  /* D2C - Orange */
  --d2c-50: 34 100% 97%;
  --d2c-100: 34 100% 92%;
  --d2c-500: 24 95% 53%;
  --d2c-600: 21 90% 48%;
  --d2c-700: 17 88% 40%;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  /* ... dark mode adjustments */
}
```

### Theme Context

```typescript
// Apply value stream theme to components
<ValueStreamProvider stream="d2c">
  <D2CDashboard />  {/* Uses D2C color variables */}
</ValueStreamProvider>
```

## Performance Considerations

### Code Splitting

```typescript
// Dynamic imports for heavy components
const KanbanBoard = dynamic(() => import('@/components/boards/kanban-board'), {
  loading: () => <BoardSkeleton />,
});

const ChartCard = dynamic(() => import('@/components/dashboard/chart-card'), {
  loading: () => <ChartSkeleton />,
});
```

### Virtualization

For large lists (events, builds):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Virtualize 1000+ event rows
```

### Bundle Optimization

- Tree-shaking for Lucide icons
- Selective faker imports
- Lazy-loaded routes for Coming Soon pages

## Security Considerations

Since this is a frontend-only demo application:

- No authentication required
- No sensitive data stored
- No API endpoints to protect
- Content Security Policy for XSS prevention
- No user-generated content stored

## Testing Strategy

### Unit Tests (Jest + React Testing Library)

- Component rendering
- Hook behavior
- Mock data generators
- Utility functions

### E2E Tests (Playwright)

- Navigation flows
- Value stream workflows
- Responsive behavior
- Accessibility checks

### Test Coverage Targets

| Category | Target |
|----------|--------|
| Components | 80% |
| Hooks | 90% |
| Utils | 95% |
| E2E | Core flows |

## Deployment

### Build Output

```bash
# Static export (no server needed)
next build
next export
```

### Hosting Options

- **Vercel**: Recommended, optimized for Next.js
- **Netlify**: Static hosting
- **AWS S3 + CloudFront**: Enterprise option
- **GitHub Pages**: Simple hosting

### Environment Variables

```env
# Optional: Analytics, feature flags
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_MOCK_DATA_SEED=12345
```

## Future Migration Path

When transitioning to real backend:

1. **Add API routes** in `app/api/`
2. **Replace mock data service** with React Query/SWR
3. **Add authentication** with NextAuth.js
4. **Add database** with Prisma

The component architecture remains unchanged.

---

## Related Documents

- [ADR-001: Tech Stack Research](./ADRs/ADR-001-tech-stack-research.md)
- [ADR-002: Component Library](./ADRs/ADR-002-component-library.md)
- [ADR-003: State Management](./ADRs/ADR-003-state-management.md)
- [ADR-004: Mock Data Strategy](./ADRs/ADR-004-mock-data-strategy.md)
- [Data Model](./data-model.md)
- [PRD](./PRD.md)
