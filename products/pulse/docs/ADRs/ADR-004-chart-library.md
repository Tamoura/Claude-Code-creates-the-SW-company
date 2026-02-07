# ADR-004: Chart Library Selection

## Status
Accepted

## Date
2026-02-07

## Context

Pulse's dashboard relies heavily on interactive charts: bar charts for PRs merged per week, line charts for cycle time trends, area charts for test coverage, scatter plots for review time outliers, gauge displays for risk scores, and sparklines for mini trend indicators. The chart library is a critical dependency affecting bundle size, developer experience, accessibility, and visual quality.

**Requirements**:
- Chart types needed: bar, line, area, scatter, gauge (custom), sparkline
- Time-series data with date-based x-axes
- Interactive: tooltips on hover, click handlers for drill-down
- Responsive: resize with container, readable on mobile
- Accessible: WCAG 2.1 AA compliance, screen reader descriptions (NFR-15, NFR-16)
- Dark mode support
- React 18 compatible
- TypeScript support
- Reasonable bundle size (total frontend target: <200KB gzipped)

**Evaluation Criteria**:
1. Bundle size (gzipped)
2. React integration quality (hooks, composition)
3. TypeScript support
4. Accessibility (WCAG 2.1)
5. Customization and theming
6. Maintenance activity (npm downloads, GitHub activity)
7. Learning curve and documentation

## Alternatives Considered

### Option A: Recharts
- **Bundle size**: ~45KB gzipped (tree-shakeable)
- **React integration**: Built specifically for React. Uses JSX composition (`<BarChart><Bar /><XAxis /></BarChart>`). React-native component model.
- **TypeScript**: Full TypeScript support, well-typed props.
- **Accessibility**: SVG-based rendering, supports `role` and `aria-label` on chart elements. Text alternatives require manual addition.
- **Customization**: High. Custom shapes, labels, tooltips, formatters. Theming via inline styles.
- **Maintenance**: 23K+ GitHub stars, 1.2M+ weekly npm downloads (as of 2025), active maintenance.
- **Learning curve**: Low for React developers (JSX composition is familiar).

### Option B: Chart.js (with react-chartjs-2)
- **Bundle size**: ~65KB gzipped (Chart.js core + react wrapper).
- **React integration**: Via `react-chartjs-2` wrapper. Configuration-driven (pass options object), not compositional. Less React-idiomatic.
- **TypeScript**: TypeScript definitions available but less ergonomic than native TS.
- **Accessibility**: Canvas-based rendering by default. Canvas is less accessible than SVG (no DOM elements for screen readers). Requires explicit `aria-label` on canvas and separate hidden data table for accessibility.
- **Customization**: High via options object and plugins. Theming via Chart.js global defaults.
- **Maintenance**: 64K+ GitHub stars, 2.5M+ weekly npm downloads. Very mature.
- **Learning curve**: Medium. Configuration object is large and requires documentation reference.

### Option C: Nivo
- **Bundle size**: ~70-120KB gzipped (depends on chart types imported). Heavy due to D3 dependency.
- **React integration**: Excellent. Pure React components with hooks.
- **TypeScript**: Full TypeScript support.
- **Accessibility**: SVG-based. Some built-in a11y features (e.g., `ariaLabel` prop).
- **Customization**: Very high. D3-powered with extensive theming system.
- **Maintenance**: 13K+ GitHub stars, 400K+ weekly npm downloads. Active but smaller community.
- **Learning curve**: Medium-High. D3 concepts leak through. Many props to configure.

### Option D: Visx (Airbnb)
- **Bundle size**: ~30KB gzipped (highly tree-shakeable, low-level primitives).
- **React integration**: Low-level React + D3 primitives. Maximum control, minimum abstraction.
- **TypeScript**: Excellent TypeScript support.
- **Accessibility**: SVG-based. Full control over accessibility attributes.
- **Customization**: Maximum (you build everything from primitives).
- **Maintenance**: 19K+ GitHub stars, 200K+ weekly npm downloads.
- **Learning curve**: High. Requires D3 knowledge. More code to write for standard charts.

## Decision

We choose **Recharts** (Option A).

## Rationale

1. **React-native composition**: Recharts uses JSX composition (`<BarChart>`, `<Bar />`, `<Tooltip />`), which is the most natural pattern for React developers. This aligns with our Next.js/React 18 stack and reduces the learning curve for frontend engineers.

2. **Bundle size**: At ~45KB gzipped (tree-shakeable), Recharts is the lightest full-featured option. Chart.js adds ~20KB more (+ canvas polyfills for SSR), and Nivo can exceed 100KB. Since Pulse is a dashboard-heavy app, every KB matters for the <2 second initial load target.

3. **SVG rendering for accessibility**: Recharts renders to SVG, which produces DOM elements that screen readers can traverse. Canvas (Chart.js) requires additional work to meet WCAG 2.1 AA. We can add `aria-label` attributes directly to SVG chart elements.

4. **All chart types supported**: Recharts covers all our needs: `BarChart`, `LineChart`, `AreaChart`, `ScatterChart`, `RadialBarChart` (for gauge), and custom components for sparklines.

5. **TypeScript-first**: Recharts has excellent TypeScript support with well-typed component props. This matches our TypeScript-everywhere strategy.

6. **Active maintenance with large community**: 23K+ stars and 1.2M+ weekly downloads means good documentation, Stack Overflow coverage, and bug fix velocity.

7. **Dark mode theming**: Recharts accepts inline styles and color props, making it straightforward to implement dark mode by switching color palettes based on the current theme.

**Why not Chart.js**: Canvas rendering makes accessibility harder. The wrapper library (`react-chartjs-2`) adds an impedance mismatch between Chart.js's imperative API and React's declarative model. Configuration objects are less composable than JSX.

**Why not Nivo**: Too heavy (70-120KB), and the D3 dependency adds complexity we do not need. Nivo is excellent for data visualization apps, but Pulse's charts are relatively standard.

**Why not Visx**: Too low-level. We would spend significant time building standard chart features (axes, legends, tooltips) that Recharts provides out of the box. Visx is better for highly custom visualizations.

## Consequences

### Positive
- Familiar React composition model: `<BarChart>`, `<Tooltip />`, etc.
- Lightest bundle of the full-featured options
- SVG output for accessibility
- Well-documented with many examples
- Easy to create custom chart components by composing primitives

### Negative
- Less performant than Canvas for very large datasets (>10,000 data points). Not a concern for Pulse (max ~365 daily data points per chart).
- SVG rendering can be slower for animations. Mitigated by limiting animation to initial render.
- Some chart types (gauge) require custom implementation using `RadialBarChart` with customized props.

### Implementation Notes
- Install: `npm install recharts`
- Shared theme config: `apps/web/src/lib/chart-config.ts` defines colors, fonts, and responsive breakpoints
- Dark mode: Switch color array based on `useTheme()` hook
- Accessibility: Add `<desc>` elements to SVG, provide data tables as alternatives
- Sparklines: Use `<LineChart>` with minimal config (no axes, no grid, small dimensions)
- Risk Gauge: Custom component using `<RadialBarChart>` with color stops at 30/60/100
