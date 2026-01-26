# ADR-003: State Management Approach

## Status
Accepted

## Context

The IT4IT Dashboard is a frontend-only application with mock data. State management needs include:

- **UI State**: Theme, sidebar collapse, active filters
- **Mock Data State**: Pre-generated data accessible across components
- **Navigation State**: Current value stream, breadcrumbs
- **User Preferences**: Saved filter states, view preferences

Since there's no backend API, we don't need server state management (no React Query/SWR). The focus is on client-side state organization.

## Decision

We will use a **layered state management approach**:

1. **Zustand** - Global application state
2. **React Context** - Theme and layout providers
3. **URL State** - Filters and navigation via search params
4. **Local Component State** - UI interactions

### Layer 1: Zustand Stores

```
src/stores/
├── ui-store.ts          # UI preferences
├── filter-store.ts      # Active filters per entity type
└── mock-data-store.ts   # Generated mock data
```

#### UI Store
```typescript
interface UIStore {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  currentValueStream: 's2p' | 'r2d' | 'r2f' | 'd2c' | null;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setValueStream: (stream: ValueStream) => void;
}
```

#### Filter Store
```typescript
interface FilterStore {
  // Stored by entity type and route
  filters: Record<string, FilterState>;
  setFilter: (key: string, filter: FilterState) => void;
  clearFilters: (key: string) => void;
}
```

#### Mock Data Store
```typescript
interface MockDataStore {
  // All mock data generated at app initialization
  s2p: S2PData;
  r2d: R2DData;
  r2f: R2FData;
  d2c: D2CData;
  isInitialized: boolean;
  initialize: (seed?: number) => void;
}
```

### Layer 2: React Context

Used for provider-based state that wraps components:

- **ThemeProvider**: Dark/light mode (using next-themes)
- **ValueStreamContext**: Current value stream for theming
- **NavigationContext**: Breadcrumb management

### Layer 3: URL State

For shareable, bookmarkable state:

```typescript
// Using next/navigation
searchParams: {
  status: 'open',
  priority: 'high',
  sort: 'created',
  order: 'desc',
  page: '1'
}
```

Benefits:
- Bookmarkable filter states
- Browser back/forward navigation
- Shareable links

### Layer 4: Local Component State

For ephemeral UI state:
- Modal open/close
- Hover states
- Form input values
- Dropdown open state

Use `useState` and `useReducer` for these.

## State Organization by Feature

| State Type | Storage | Example |
|------------|---------|---------|
| Theme preference | Zustand + localStorage | Dark mode |
| Sidebar state | Zustand + localStorage | Collapsed |
| Current value stream | URL path | /s2p/* |
| List filters | URL params | ?status=open |
| Sort order | URL params | ?sort=created |
| Pagination | URL params | ?page=2 |
| Mock data | Zustand (memory) | All entities |
| Modal state | useState | Open/closed |
| Form data | react-hook-form | Input values |

## Persistence Strategy

### What to Persist
- Theme preference (localStorage)
- Sidebar collapsed state (localStorage)
- Last visited value stream (localStorage)

### What NOT to Persist
- Filter states (URL handles this)
- Mock data (regenerated on load)
- Modal states (ephemeral)

### Zustand Persistence

```typescript
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist<UIStore>(
    (set) => ({
      // ... store implementation
    }),
    {
      name: 'it4it-ui-preferences',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

## Consequences

### Positive

- **Simple Architecture**: No complex state libraries
- **Predictable**: Clear ownership of each state type
- **Performant**: Zustand doesn't cause unnecessary re-renders
- **Debuggable**: State is inspectable via devtools
- **Shareable**: URL state enables link sharing

### Negative

- **Multiple Patterns**: Team must understand when to use each
- **URL Complexity**: Many filters can make URLs long

### Neutral

- No server state cache needed (no API)
- Mock data regenerated each session (consistent demo experience)

## Alternatives Considered

### Redux Toolkit
- **Pros**: Mature, excellent devtools
- **Cons**: More boilerplate, overkill for this use case
- **Why Rejected**: Complexity not justified

### React Context Only
- **Pros**: No external dependencies
- **Cons**: Performance issues at scale, no persistence
- **Why Rejected**: Would need to build persistence layer

### Jotai
- **Pros**: Atomic model, similar to Zustand
- **Cons**: Different mental model
- **Why Rejected**: Team more familiar with store pattern

### React Query / SWR
- **Pros**: Great for server state
- **Cons**: Overkill when there's no server
- **Why Rejected**: No backend API to cache

## References

- Zustand: https://zustand-demo.pmnd.rs/
- Zustand Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- Next.js URL State: https://nextjs.org/docs/app/api-reference/functions/use-search-params
