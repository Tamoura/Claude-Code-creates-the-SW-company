# ADR-001: Tech Stack Research

## Status
Accepted

## Context

The IT4IT Dashboard requires a comprehensive frontend-only architecture to display 76 routes across four IT4IT value streams. Key requirements include:

- Dashboard visualizations with charts and KPIs
- Data tables with sorting, filtering, and pagination
- Kanban boards with drag-and-drop
- Calendar views
- Mock data generation for realistic IT operations scenarios
- Dark/light theme support
- Performance with large datasets

This ADR documents the research conducted to select the optimal libraries for each concern.

## Research Conducted

### 1. UI Component Libraries

#### Option A: shadcn/ui (Recommended)
- **GitHub**: https://github.com/shadcn-ui/ui
- **Stars**: 75,000+
- **License**: MIT
- **Last Activity**: Active (daily commits)

**Pros**:
- Built on Radix UI primitives (excellent accessibility)
- Tailwind CSS native (matches our stack)
- Copy-paste components (full control, no dependency lock-in)
- Excellent dark mode support
- Active community with extensive component library
- Found: next-shadcn-dashboard-starter (5,873 stars) - proven for dashboards

**Cons**:
- Requires more setup than all-in-one libraries
- No official npm package (CLI-based installation)

#### Option B: Material UI (MUI)
- **npm**: @mui/material
- **Stars**: 94,000+
- **License**: MIT

**Pros**:
- Comprehensive component library
- Well-documented
- Material Design system

**Cons**:
- Heavy bundle size
- Harder to customize beyond Material Design
- CSS-in-JS approach (Emotion) conflicts with Tailwind

#### Option C: Ant Design
- **npm**: antd
- **Stars**: 92,000+
- **License**: MIT

**Pros**:
- Enterprise-focused
- Rich data display components

**Cons**:
- Large bundle size
- Less flexible styling (CSS modules)
- Chinese documentation translations can be incomplete

**Decision**: shadcn/ui - Best fit for Tailwind stack, excellent accessibility, and proven dashboard use cases.

---

### 2. Charting Libraries

#### Option A: Recharts (Recommended)
- **npm**: recharts v3.7.0
- **License**: MIT
- **Homepage**: https://github.com/recharts/recharts

**Pros**:
- React-native with declarative API
- SVG-based (scalable, accessible)
- Lightweight (~50KB gzipped)
- Excellent composability
- Good TypeScript support
- Easy to theme with Tailwind colors

**Cons**:
- Limited 3D chart options
- Some advanced chart types require workarounds

#### Option B: Chart.js (with react-chartjs-2)
- **npm**: chart.js v4.5.1
- **License**: MIT

**Pros**:
- Very popular
- Canvas-based (good for large datasets)
- Many chart types

**Cons**:
- Canvas not as accessible as SVG
- Requires wrapper library for React
- Harder to integrate with Tailwind theming

#### Option C: Nivo
- **npm**: @nivo/core v0.99.0
- **License**: MIT

**Pros**:
- Beautiful defaults
- Many chart types
- Good accessibility

**Cons**:
- Larger bundle size
- More opinionated styling
- Steeper learning curve

**Decision**: Recharts - Best React integration, SVG for accessibility, easy Tailwind theming.

---

### 3. Data Table Libraries

#### Option A: TanStack Table (Recommended)
- **npm**: @tanstack/react-table v8.21.3
- **License**: MIT
- **Homepage**: https://tanstack.com/table

**Pros**:
- Headless (full UI control)
- Excellent TypeScript support
- Virtual scrolling for large datasets
- Sorting, filtering, pagination built-in
- Works perfectly with shadcn/ui tables
- Active maintenance (TanStack is reliable)

**Cons**:
- Requires building UI (headless)
- Learning curve for advanced features

#### Option B: AG Grid
- **License**: MIT (Community) / Commercial (Enterprise)

**Pros**:
- Feature-rich out of box
- Excellent performance

**Cons**:
- Heavy bundle size
- Enterprise features require paid license
- Harder to style custom

#### Option C: React Table (legacy)
- Deprecated in favor of TanStack Table

**Decision**: TanStack Table - Headless approach fits shadcn/ui perfectly, excellent TypeScript support.

---

### 4. Drag and Drop Libraries

#### Option A: dnd-kit (Recommended)
- **npm**: @dnd-kit/core v6.3.1
- **License**: MIT
- **Homepage**: https://github.com/clauderic/dnd-kit

**Pros**:
- Modern, actively maintained
- Excellent accessibility (ARIA, keyboard support)
- Performant (no DOM mutations)
- Works with any component library
- Sortable and tree support

**Cons**:
- Slightly more verbose API

#### Option B: react-beautiful-dnd
- **npm**: react-beautiful-dnd v13.1.1
- **License**: Apache-2.0

**Pros**:
- Beautiful animations
- Simple API for lists

**Cons**:
- No longer actively maintained by Atlassian
- Limited to list-based drag and drop
- Issues with React 18 concurrent mode

**Decision**: dnd-kit - Actively maintained, accessible, works with modern React.

---

### 5. Mock Data Generation

#### Option A: @faker-js/faker (Recommended)
- **npm**: @faker-js/faker v10.2.0
- **License**: MIT
- **Homepage**: https://fakerjs.dev

**Pros**:
- Comprehensive fake data generation
- Localization support
- Seeded random for reproducibility
- TypeScript support
- Active community (fork after original was deleted)

**Cons**:
- Large library (can use tree-shaking)

#### Option B: Chance.js
- Smaller but less comprehensive
- Less TypeScript support

#### Option C: Mock Service Worker (MSW)
- Better for mocking API calls
- Overkill for static mock data

**Decision**: @faker-js/faker - Best for generating comprehensive, realistic mock data with seeding.

---

### 6. Date/Time Utilities

#### Option A: date-fns (Recommended)
- **npm**: date-fns v4.1.0
- **License**: MIT
- **Homepage**: https://github.com/date-fns/date-fns

**Pros**:
- Tree-shakeable (import only what you need)
- Immutable operations
- Comprehensive formatting
- TypeScript native

**Cons**:
- None significant for our use case

#### Option B: Day.js
- Smaller but less comprehensive
- Chainable API (different paradigm)

#### Option C: Moment.js
- Deprecated, not recommended for new projects

**Decision**: date-fns - Tree-shakeable, TypeScript native, modern.

---

### 7. State Management

#### Option A: Zustand (Recommended)
- **npm**: zustand v5.0.10
- **License**: MIT
- **Homepage**: https://github.com/pmndrs/zustand

**Pros**:
- Minimal boilerplate
- TypeScript native
- No providers needed
- Works with React Server Components
- Tiny bundle size (~1KB)
- Easy to persist/hydrate

**Cons**:
- Less structure than Redux (good or bad)

#### Option B: Jotai
- Atomic state model
- Similar to Zustand in simplicity

#### Option C: Redux Toolkit
- More boilerplate
- Overkill for frontend-only app

#### Option D: React Context + useState
- Simple for small apps
- Performance issues at scale
- No built-in persistence

**Decision**: Zustand - Minimal, TypeScript native, perfect for frontend-only app complexity.

---

### 8. Icons

#### Option A: Lucide React (Recommended)
- **npm**: lucide-react v0.563.0
- **License**: ISC
- **Homepage**: https://lucide.dev

**Pros**:
- Fork of Feather icons with more icons
- Tree-shakeable
- Consistent style
- Default choice for shadcn/ui

**Cons**:
- None significant

#### Option B: Heroicons
- Also good, Tailwind native
- Fewer icons

#### Option C: React Icons
- Includes multiple icon sets
- Larger bundle if not careful

**Decision**: Lucide React - Default for shadcn/ui, tree-shakeable, comprehensive.

---

### 9. Form Handling

#### Option A: React Hook Form + Zod (Recommended)
- **npm**: react-hook-form + zod

**Pros**:
- Minimal re-renders
- TypeScript schema validation with Zod
- Works well with shadcn/ui forms
- Small bundle size

**Cons**:
- None for our use case

**Decision**: React Hook Form + Zod - Standard for shadcn/ui, excellent DX.

---

## Final Recommendations

| Category | Library | Version |
|----------|---------|---------|
| UI Components | shadcn/ui | CLI-based |
| Charts | Recharts | 3.x |
| Data Tables | @tanstack/react-table | 8.x |
| Drag & Drop | @dnd-kit/core | 6.x |
| Mock Data | @faker-js/faker | 10.x |
| Dates | date-fns | 4.x |
| State | Zustand | 5.x |
| Icons | lucide-react | 0.x |
| Forms | react-hook-form + zod | latest |

## Consequences

### Positive
- All libraries are MIT licensed (permissive, no legal concerns)
- All actively maintained with recent updates
- Strong TypeScript support across the stack
- Headless/composable approach gives full UI control
- Proven in production dashboards
- Consistent styling with Tailwind CSS

### Negative
- More initial setup than all-in-one solutions
- Team needs to understand component composition
- shadcn/ui requires CLI for component updates

### Neutral
- All libraries have good documentation
- Community support available for all choices

## References

- shadcn/ui: https://ui.shadcn.com/
- Recharts: https://recharts.org/
- TanStack Table: https://tanstack.com/table
- dnd-kit: https://dndkit.com/
- Faker.js: https://fakerjs.dev/
- date-fns: https://date-fns.org/
- Zustand: https://zustand-demo.pmnd.rs/
- Lucide: https://lucide.dev/
- next-shadcn-dashboard-starter: https://github.com/Kiranism/next-shadcn-dashboard-starter
