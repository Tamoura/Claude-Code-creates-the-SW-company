# ADR-004: Mock Data Strategy

## Status
Accepted

## Context

The IT4IT Dashboard uses mock data exclusively (no backend database). Mock data requirements:

1. **Realistic**: Data must represent real-world IT operations
2. **Relationships**: Entities must have meaningful connections (e.g., incident linked to CI)
3. **Volume**: Sufficient data for pagination, filtering, and charts
4. **Consistency**: Same data structure throughout the app
5. **Reproducibility**: Can reset to known state for demos/testing
6. **Time-based**: Historical data for trend charts (30+ days)
7. **Swappable**: Architecture should allow future API integration

## Decision

We will implement a **centralized mock data service** with the following architecture:

### Architecture

```
src/lib/mock-data/
├── index.ts                 # Main entry point
├── generators/              # Entity generators
│   ├── s2p/
│   │   ├── demands.ts
│   │   ├── portfolio-items.ts
│   │   ├── proposals.ts
│   │   ├── investments.ts
│   │   └── roadmap.ts
│   ├── r2d/
│   │   ├── requirements.ts
│   │   ├── pipelines.ts
│   │   ├── releases.ts
│   │   ├── environments.ts
│   │   ├── builds.ts
│   │   └── tests.ts
│   ├── r2f/
│   │   ├── catalog.ts
│   │   ├── offers.ts
│   │   ├── requests.ts
│   │   ├── fulfillments.ts
│   │   └── subscriptions.ts
│   └── d2c/
│       ├── events.ts
│       ├── incidents.ts
│       ├── problems.ts
│       ├── changes.ts
│       ├── known-errors.ts
│       └── configuration-items.ts
├── seed.ts                  # Seed data generation
├── relationships.ts         # Cross-entity relationships
└── types.ts                 # TypeScript interfaces
```

### Data Generation Strategy

#### Seeded Random Generation
```typescript
import { faker } from '@faker-js/faker';

// Set seed for reproducibility
faker.seed(12345);

// Generate consistent data
const incident = generateIncident();
```

Benefits:
- Same seed produces identical data
- Different seed for different scenarios
- Useful for testing specific states

#### Pre-generated Static Data
For complex scenarios requiring hand-crafted examples:
```typescript
// Some data is pre-defined for demo quality
const featuredIncidents = [
  {
    id: 'INC-001',
    title: 'Email Service Outage - Exchange Server Down',
    severity: 1,
    status: 'in_progress',
    // ... realistic scenario
  }
];
```

### Data Volume

| Entity Type | Count | Rationale |
|-------------|-------|-----------|
| **S2P** | | |
| Demands | 60 | Various pipeline stages |
| Portfolio Items | 35 | Mix of active/complete |
| Proposals | 25 | Different approval states |
| Investments | 18 | Active investments |
| Roadmap Milestones | 40 | 3-year roadmap |
| **R2D** | | |
| Requirements | 120 | Multiple releases |
| Pipelines | 15 | Active pipelines |
| Releases | 30 | Past, current, planned |
| Environments | 5 | Dev, Test, Stage, Pre-prod, Prod |
| Builds | 200 | Build history |
| Test Runs | 100 | Test results |
| **R2F** | | |
| Catalog Entries | 100 | 10 categories |
| Offer Items | 45 | Purchasable items |
| Service Requests | 250 | Historical requests |
| Fulfillments | 200 | Fulfillment records |
| Subscriptions | 55 | Active subscriptions |
| **D2C** | | |
| Events | 1,000 | Last 30 days |
| Incidents | 75 | Various severities |
| Problems | 25 | Open problems |
| Changes | 40 | Various states |
| Known Errors | 30 | With workarounds |
| Configuration Items | 500 | CMDB entries |

### Data Access Layer

```typescript
// src/lib/mock-data/index.ts

export interface DataService {
  // S2P
  getDemands(filters?: DemandFilters): Promise<PaginatedResult<Demand>>;
  getDemandById(id: string): Promise<Demand | null>;

  // Similar for all entities...
}

// Implementation with artificial delay for realism
export const dataService: DataService = {
  async getDemands(filters) {
    await simulateLatency(100, 300);
    return filterAndPaginate(mockData.demands, filters);
  },
  // ...
};
```

### Simulated Latency
To make the UI feel realistic and test loading states:
```typescript
async function simulateLatency(min: number, max: number) {
  const delay = faker.number.int({ min, max });
  return new Promise(resolve => setTimeout(resolve, delay));
}
```

### Relationship Handling

```typescript
// Cross-entity relationships
interface Incident {
  id: string;
  // ... other fields
  relatedCIs: string[];        // CI IDs
  relatedChanges: string[];    // Change IDs
  parentProblem?: string;      // Problem ID
}

// Resolve relationships when needed
function getIncidentWithRelations(id: string): IncidentWithRelations {
  const incident = incidents.find(i => i.id === id);
  return {
    ...incident,
    configurationItems: incident.relatedCIs.map(ciId =>
      configurationItems.find(ci => ci.id === ciId)
    ),
    changes: incident.relatedChanges.map(chgId =>
      changes.find(chg => chg.id === chgId)
    ),
    problem: problems.find(p => p.id === incident.parentProblem),
  };
}
```

### Time-Based Data

For charts and trends, generate time-series data:
```typescript
function generateHistoricalIncidents(days: number = 30): DailyMetric[] {
  const metrics: DailyMetric[] = [];

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    metrics.push({
      date,
      created: faker.number.int({ min: 5, max: 25 }),
      resolved: faker.number.int({ min: 3, max: 22 }),
    });
  }

  return metrics;
}
```

### Future API Migration Path

The data service abstraction allows easy swapping:

```typescript
// Current: Mock implementation
export const dataService = mockDataService;

// Future: Real API implementation
// export const dataService = apiDataService;

// Components use the same interface
const { data } = useQuery({
  queryKey: ['incidents', filters],
  queryFn: () => dataService.getIncidents(filters),
});
```

## Consequences

### Positive

- **Realistic Demo**: Data represents real IT operations
- **Consistent**: Same data structure everywhere
- **Testable**: Reproducible with seeds
- **Performant**: No network latency (simulated is optional)
- **Future-proof**: Easy to swap for real API

### Negative

- **Initial Effort**: Generating quality mock data takes time
- **Maintenance**: Must update generators if data model changes
- **Size**: Large datasets increase bundle size

### Neutral

- Data regenerates on page refresh (intentional for demo)
- Can add localStorage persistence if needed

## Alternatives Considered

### Mock Service Worker (MSW)
- **Pros**: Intercepts actual fetch calls, more realistic
- **Cons**: Overkill when there's no real API structure yet
- **Why Rejected**: Adds complexity without benefit for this use case

### JSON Files
- **Pros**: Simple, no code needed
- **Cons**: Static, no relationships, hard to vary scenarios
- **Why Rejected**: Not flexible enough for complex relationships

### GraphQL Mocking
- **Pros**: Type-safe if using GraphQL
- **Cons**: We're not using GraphQL
- **Why Rejected**: Not applicable

## References

- Faker.js: https://fakerjs.dev/
- Mock Data Best Practices: https://www.robinwieruch.de/react-mock-data/
