# IT4IT Dashboard - Technical Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: IT4IT Dashboard

---

## Architecture Overview

The IT4IT Dashboard is a **frontend-only** web application with mock data, demonstrating production-ready IT4IT Reference Architecture implementation.

### System Architecture

```
┌─────────────────────────────────────────────┐
│               Browser                        │
│  ┌───────────────────────────────────────┐ │
│  │   Next.js 14 App (App Router)         │ │
│  │   - SSR for landing pages             │ │
│  │   - CSR for dashboards                │ │
│  │   - TypeScript 5                      │ │
│  │   - Tailwind CSS                      │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐ │
│  │   Mock Data Service                   │ │
│  │   - Generated with @faker-js/faker    │ │
│  │   - 1000+ events, 50+ incidents       │ │
│  │   - 500+ CIs, 200+ requests          │ │
│  │   - Relationships between entities    │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
          │
          │ HTTPS
          ▼
┌─────────────────────────────────────────────┐
│    Static Hosting (Vercel/Netlify)          │
└─────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 | App Router, React Server Components |
| Language | TypeScript 5 | Type safety |
| UI Components | shadcn/ui + Radix | Accessible primitives |
| Styling | Tailwind CSS 3 | Utility-first CSS |
| Charts | Recharts | Data visualization |
| Tables | TanStack Table 8 | Data grids |
| Drag & Drop | dnd-kit 6 | Kanban boards |
| State | Zustand 5 | Global state management |
| Mock Data | @faker-js/faker 10 | Realistic data generation |
| Icons | Lucide React | Icon system |
| Dates | date-fns 4 | Date manipulation |

---

## Data Model

### IT4IT Entities

**S2P (Strategy to Portfolio)**
```typescript
interface Demand {
  id: string;
  title: string;
  description: string;
  status: 'new' | 'assess' | 'approve' | 'portfolio' | 'rejected';
  priority: 1 | 2 | 3 | 4;
  businessValue: number;
  cost: number;
  submittedBy: string;
  submittedAt: Date;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  strategicAlignment: number;
  budget: number;
  actualSpend: number;
  milestones: Milestone[];
}

interface Investment {
  id: string;
  name: string;
  budget: number;
  spent: number;
  roi: number;
  status: 'planning' | 'executing' | 'complete' | 'cancelled';
}
```

**R2D (Requirement to Deploy)**
```typescript
interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  status: 'running' | 'passed' | 'failed';
  lastRunAt: Date;
}

interface Release {
  id: string;
  version: string;
  scheduledDate: Date;
  status: 'planned' | 'dev' | 'test' | 'prod' | 'cancelled';
  features: string[];
  testCoverage: number;
}

interface Environment {
  id: string;
  name: 'dev' | 'test' | 'staging' | 'pre-prod' | 'production';
  health: 'healthy' | 'degraded' | 'down';
  cpu: number;
  memory: number;
  disk: number;
}
```

**R2F (Request to Fulfill)**
```typescript
interface ServiceCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  sla: number; // hours
  available: boolean;
}

interface ServiceRequest {
  id: string;
  catalogItemId: string;
  requestedBy: string;
  status: 'pending' | 'in_progress' | 'fulfilled' | 'cancelled';
  priority: 1 | 2 | 3;
  createdAt: Date;
  slaBreachAt: Date;
}

interface Subscription {
  id: string;
  service: string;
  owner: string;
  renewalDate: Date;
  monthlyCost: number;
}
```

**D2C (Detect to Correct)**
```typescript
interface Event {
  id: string;
  source: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4; // 1=Critical
  priority: 1 | 2 | 3 | 4;
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  assignee: string;
  relatedCIs: string[];
  createdAt: Date;
}

interface Change {
  id: string;
  title: string;
  description: string;
  type: 'standard' | 'normal' | 'emergency';
  status: 'requested' | 'approved' | 'scheduled' | 'implementing' | 'complete' | 'cancelled';
  scheduledDate: Date;
  approvers: string[];
}

interface ConfigurationItem {
  id: string;
  name: string;
  type: 'server' | 'application' | 'network' | 'database';
  attributes: Record<string, any>;
  relationships: { upstream: string[], downstream: string[] };
}
```

---

## Mock Data Generation

### Data Service Architecture

```typescript
// lib/mock-data/index.ts

interface MockDataService {
  // Generators
  generateDemands(count: number): Demand[];
  generateIncidents(count: number): Incident[];
  generateCIs(count: number): ConfigurationItem[];
  
  // Relationships
  linkIncidentsToCIs(incidents, cis): void;
  linkProblemsToIncidents(problems, incidents): void;
  
  // Aggregations
  getDashboardMetrics(stream: ValueStream): Metrics;
  getHistoricalData(type: string, days: number): TimeSeriesData;
}
```

### Generation Strategy

```typescript
// Example: Incident generator
import { faker } from '@faker-js/faker';

function generateIncidents(count: number): Incident[] {
  return Array.from({ length: count }, () => ({
    id: `INC-${faker.string.alphanumeric(6).toUpperCase()}`,
    title: generateIncidentTitle(),
    description: faker.lorem.paragraph(),
    severity: faker.helpers.arrayElement([1, 2, 3, 4]),
    priority: faker.helpers.arrayElement([1, 2, 3, 4]),
    status: faker.helpers.arrayElement([
      'new', 'assigned', 'in_progress', 'resolved', 'closed'
    ]),
    assignee: faker.person.fullName(),
    relatedCIs: generateRelatedCIs(),
    createdAt: faker.date.recent({ days: 30 })
  }));
}
```

### Seed Data

The dashboard initializes with:
- **S2P**: 50+ demands, 30+ portfolio items, 20+ investments
- **R2D**: 10+ pipelines, 25+ releases, 5 environments
- **R2F**: 100+ catalog items, 200+ requests, 50+ subscriptions
- **D2C**: 1000+ events, 50+ incidents, 30+ changes, 500+ CIs

---

## Routing Structure

### Route Groups (Next.js App Router)

```
app/
├── (dashboard)/                    # Main layout group
│   ├── layout.tsx                  # Sidebar + content
│   ├── page.tsx                    # Redirect to /dashboard
│   ├── dashboard/
│   │   └── page.tsx                # Executive dashboard
│   ├── s2p/                        # Strategy to Portfolio
│   │   ├── page.tsx                # S2P dashboard
│   │   ├── demands/
│   │   │   ├── page.tsx            # Demand board
│   │   │   └── [id]/page.tsx       # Demand details
│   │   ├── portfolio/
│   │   ├── investments/
│   │   └── roadmap/
│   ├── r2d/                        # Requirement to Deploy
│   │   ├── page.tsx                # R2D dashboard
│   │   ├── pipeline/
│   │   ├── releases/
│   │   ├── environments/
│   │   └── requirements/
│   ├── r2f/                        # Request to Fulfill
│   │   ├── page.tsx                # R2F dashboard
│   │   ├── catalog/
│   │   ├── my-requests/
│   │   ├── queue/
│   │   └── subscriptions/
│   ├── d2c/                        # Detect to Correct
│   │   ├── page.tsx                # D2C dashboard
│   │   ├── events/
│   │   ├── incidents/
│   │   ├── problems/
│   │   ├── changes/
│   │   └── cmdb/
│   └── help/
└── globals.css
```

**Total Routes**: 76 (60 MVP, 16 "Coming Soon")

---

## Component Architecture

### Value Stream Theming

Each value stream has distinct color scheme:

```css
/* S2P - Blue */
--s2p-500: 217 91% 60%;

/* R2D - Green */
--r2d-500: 142 71% 45%;

/* R2F - Purple */
--r2f-500: 262 83% 58%;

/* D2C - Orange */
--d2c-500: 24 95% 53%;
```

### Component Categories

**Layout Components**
- Sidebar, Header, Breadcrumbs, PageHeader

**Dashboard Components**
- KPICard, ChartCard, ValueStreamCard

**Data Display**
- DataTable, StatusBadge, PriorityBadge, EmptyState

**Boards**
- KanbanBoard, KanbanColumn, KanbanCard

**Visualizations**
- LineChart, BarChart, RiskMatrix, Timeline

---

## Performance Optimization

### Code Splitting

```typescript
// Dynamic imports for heavy components
const KanbanBoard = dynamic(() => import('@/components/boards/kanban-board'), {
  loading: () => <BoardSkeleton />,
  ssr: false
});
```

### Virtualization

For large lists (1000+ events):
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Render only visible rows
const rowVirtualizer = useVirtualizer({
  count: events.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

### Bundle Size

- Target: < 500KB gzipped
- Actual: ~400KB (includes all value streams)
- Optimization: Tree-shaking, lazy loading, dynamic imports

---

## Development Workflow

### Setup

```bash
git clone https://github.com/connectsw/it4it-dashboard.git
cd it4it-dashboard/apps/web
npm install
npm run dev
# Open http://localhost:3100
```

### Adding a New Value Stream Page

1. Create route: `app/(dashboard)/[stream]/[feature]/page.tsx`
2. Create mock data generator: `lib/mock-data/generators/[stream]/[feature].ts`
3. Create components: `components/[stream]/[feature]/`
4. Add navigation link: Update sidebar
5. Write tests: `tests/[stream]/[feature].test.tsx`

### Testing

```bash
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E tests
npm run lint          # ESLint
```

---

## Deployment

### Static Export

```bash
npm run build
# Output: .next/static (ready for CDN)
```

### Vercel Deployment

```bash
vercel --prod
# Automatic deployments from GitHub
```

---

## Future Migration Path

To add real backend:
1. Replace mock data service with API client (React Query/SWR)
2. Add authentication with NextAuth.js
3. Connect to backend API (Fastify/Express)
4. Migrate to database (PostgreSQL)

Component architecture remains unchanged.

---

**End of Technical Manual**
