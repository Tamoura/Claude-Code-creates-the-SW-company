# Pulse Frontend Dashboard - FRONTEND-02

## Task
Build core dashboard pages for Pulse: Activity feed, Velocity charts,
Coverage trends, Repository overview cards, Date range selector.

## Branch
feature/pulse/inception (already exists)

## Baseline
- 27 tests passing across 5 test files
- Existing components: StatCard, RiskGauge, ActivityFeed, VelocityChart,
  CoverageChart, ErrorBoundary, Sidebar, Header
- Existing hooks: useAuth, useWebSocket, useTheme
- Existing pages: all placeholder pages in /dashboard/*

## Plan (TDD approach)

### 1. DateRangeSelector component
- Shared component for 7d/30d/90d/custom filtering
- Used across velocity, coverage, and repos pages

### 2. Activity Feed page enhancement
- Connect ActivityFeed component to WebSocket
- Add repo/team filter dropdowns
- Show real-time event updates
- Loading and error states

### 3. Velocity Dashboard enhancement
- Add VelocityChart with date range selector
- Add stat cards for cycle time and review time
- Line chart for cycle time trend

### 4. Coverage Trends page (quality page)
- Area chart showing coverage over time per repo
- Date range selector integration

### 5. Repository Overview cards
- Cards for each connected repo with key metrics
- Connect Repository button

## Decisions
- recharts is already installed for charts
- Use CSS variables from globals.css for theming
- All pages are server components by default; 'use client' only for
  interactive components
