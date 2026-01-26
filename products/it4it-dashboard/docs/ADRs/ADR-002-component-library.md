# ADR-002: Component Library Choice

## Status
Accepted

## Context

The IT4IT Dashboard requires a comprehensive UI component library to build 76 routes with consistent styling. Key requirements:

- Consistent design language across all value streams
- Dark/light theme support
- Accessible components (WCAG 2.1 AA)
- Compatible with Tailwind CSS (company standard)
- Dashboard-specific components (cards, stats, KPIs)
- Data display components (tables, lists, badges)
- Form components (for future enhancement)

## Decision

We will use **shadcn/ui** as our component library foundation.

### What is shadcn/ui?

shadcn/ui is not a traditional component library but a collection of re-usable components built on:
- **Radix UI** - Accessible, unstyled primitives
- **Tailwind CSS** - Utility-first styling
- **Class Variance Authority (CVA)** - Variant management
- **tailwind-merge** - Intelligent class merging

Components are copied into your project, giving you full ownership and customization ability.

### Components We Will Use

#### From shadcn/ui Core

| Component | Purpose |
|-----------|---------|
| Button | Actions, navigation |
| Card | KPI cards, summary cards |
| Badge | Status indicators |
| Avatar | User display |
| Dropdown Menu | Actions, navigation |
| Dialog | Modals, confirmations |
| Sheet | Side panels |
| Tabs | View switching |
| Table | Data display (combined with TanStack) |
| Input | Form fields |
| Select | Dropdowns |
| Checkbox | Toggles |
| Calendar | Date picking |
| Tooltip | Help text |
| Skeleton | Loading states |
| Alert | Notifications |
| Progress | Progress bars |
| Separator | Visual dividers |
| Scroll Area | Custom scrollbars |
| Command | Command palette |
| Breadcrumb | Navigation context |

#### Custom Components to Build

| Component | Purpose | Built On |
|-----------|---------|----------|
| KPICard | Dashboard KPI display | Card |
| StatusBadge | Consistent status display | Badge |
| DataTable | Feature-rich tables | Table + TanStack |
| KanbanBoard | Drag-drop boards | Card + dnd-kit |
| TimelineView | Roadmap display | Custom |
| ChartCard | Charts with headers | Card + Recharts |
| NavigationSidebar | Value stream nav | Custom |
| PageHeader | Consistent page headers | Custom |
| EmptyState | No data display | Custom |
| ComingSoon | Placeholder pages | Card |

### Value Stream Theming

Each value stream has a distinct color theme using Tailwind CSS custom properties:

```css
:root {
  /* S2P - Strategy to Portfolio (Blue) */
  --s2p-primary: 217 91% 60%;
  --s2p-secondary: 217 91% 95%;

  /* R2D - Requirement to Deploy (Green) */
  --r2d-primary: 142 76% 36%;
  --r2d-secondary: 142 76% 95%;

  /* R2F - Request to Fulfill (Purple) */
  --r2f-primary: 262 83% 58%;
  --r2f-secondary: 262 83% 95%;

  /* D2C - Detect to Correct (Orange) */
  --d2c-primary: 24 95% 53%;
  --d2c-secondary: 24 95% 95%;
}
```

### Installation Approach

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add button card badge table dialog
```

## Consequences

### Positive

- **Full Control**: Components are in our codebase, not a dependency
- **Accessibility**: Built on Radix UI with excellent a11y
- **Tailwind Native**: Perfect match for our styling approach
- **Tree-shakeable**: Only include what we use
- **Customizable**: Can modify any component freely
- **Type-Safe**: Full TypeScript support
- **Dark Mode**: Built-in theme support

### Negative

- **Initial Setup**: More setup than importing a package
- **Updates Manual**: Must manually update components
- **Learning Curve**: Team needs to understand Radix primitives

### Neutral

- Component code lives in `/components/ui`
- Custom components live in `/components`
- Styling uses `cn()` utility for class merging

## Alternatives Considered

### Material UI (MUI)
- **Pros**: Comprehensive, well-documented
- **Cons**: Heavy bundle, CSS-in-JS conflicts with Tailwind, Material design constraints
- **Why Rejected**: Doesn't align with Tailwind approach

### Ant Design
- **Pros**: Enterprise features, rich components
- **Cons**: Large bundle, less flexible styling
- **Why Rejected**: Styling system conflicts

### Headless UI
- **Pros**: Tailwind native
- **Cons**: Fewer components than shadcn/ui
- **Why Rejected**: Would require building more from scratch

### Chakra UI
- **Pros**: Good DX, accessible
- **Cons**: CSS-in-JS approach
- **Why Rejected**: Doesn't align with Tailwind

## References

- shadcn/ui Documentation: https://ui.shadcn.com/
- Radix UI Primitives: https://www.radix-ui.com/
- Tailwind CSS: https://tailwindcss.com/
- Class Variance Authority: https://cva.style/
