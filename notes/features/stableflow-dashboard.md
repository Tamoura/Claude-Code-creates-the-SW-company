# StableFlow Dashboard UI

## Branch
`feature/stablecoin-gateway/stableflow-dashboard`

## Summary
Rebuilt the stablecoin-gateway web dashboard from a light-themed placeholder to a production-quality dark-themed "StableFlow" UI matching the SC.png design.

## Changes Made

### Theme & CSS
- Added Tailwind CSS v4 `@theme` block with dark color tokens (page-bg, sidebar-bg, card-bg, etc.)
- Removed `#root { max-width: 1280px }` constraint from App.css that was limiting layout

### New Components (6)
- `Sidebar.tsx` — Fixed left sidebar with nav sections (main, developers, settings)
- `TopHeader.tsx` — Sticky top bar with page title, "Simulate Payment" button, user avatar
- `StatCard.tsx` — Reusable stat card with title, value, trend/subtitle
- `DeveloperIntegration.tsx` — Code snippet with syntax highlighting, copy buttons, live API key
- `CheckoutPreview.tsx` — QR code placeholder, product info, "Pay with Stablecoin" CTA
- `TransactionsTable.tsx` — Recent transactions table with status badges

### New Pages (4 placeholders)
- `Invoices.tsx`, `ApiKeys.tsx`, `Webhooks.tsx`, `Security.tsx`

### Modified Pages
- `DashboardLayout.tsx` — Replaced horizontal nav with sidebar + top header layout
- `DashboardHome.tsx` — Full rebuild with stats, developer panel, checkout preview, transactions
- `PaymentsList.tsx` — Dark theme, reuses TransactionsTable
- `Settings.tsx` — Dark theme placeholder

### Routes Added
- `/dashboard/invoices`, `/dashboard/api-keys`, `/dashboard/webhooks`, `/dashboard/security`

### Mock Data
- `dashboard-mock.ts` — Centralized mock data for stats, transactions, API key, code snippet

## Verification
- Vite build: passes
- All existing tests: pass (20/20 relevant tests, pre-existing failures in auth-lifecycle unrelated)
- Visual: Dark sidebar, stats cards, code panel, checkout preview, transactions table

---

## Phase 2: Real Data, Light Mode, Tests (current work)

### Baseline
- 11 passing test files, 91 passing tests
- 2 pre-existing failures in auth tests (mock login not wired)

### Phase 1: Component Tests
- 7 test files for all dashboard components + DashboardHome
- Pattern: MemoryRouter wrapper, @testing-library/react

### Phase 2: Light/Dark Theme
- useTheme hook + ThemeToggle component
- Dual classes: light base + dark: prefix
- Flash prevention script in index.html

### Phase 3: API Wiring
- useDashboardData hook computes stats from PaymentSession[]
- Add mock list handler to api-client.ts
- TransactionsTable becomes props-driven

### Phase 4: Verify
- Build: passes (vite build, 4.14s)
- Tests: 139 passing (51 new), 11 pre-existing auth failures (unchanged)
- 21 passing test files, 2 pre-existing failures
