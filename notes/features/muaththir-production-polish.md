# Muaththir Production Polish

Branch: `feature/muaththir/production-polish`

## Frontend Polish Tasks (Current Session)

### 1. Notification Preferences Page
- Modify existing page to use localStorage instead of apiClient
- Page exists at src/app/dashboard/settings/notifications/page.tsx
- Translations already in en.json/ar.json (notifications section)
- Settings page already has a link to notifications
- Sidebar already shows notifications sub-item

### 2. Keyboard Shortcuts Hook
- Create src/hooks/useKeyboardShortcuts.ts
- Ctrl+K / Cmd+K: navigate to observe page
- Escape: close any open modal/drawer
- Integrate into DashboardLayout (already has Ctrl+N)

### 3. Polish Loading/Error States
- Dashboard loading.tsx already uses SkeletonDashboard (looks good)
- Improve error.tsx with better UX and translations

### 4. Tests
- Notification preferences page tests
- Keyboard shortcuts hook tests
- Baseline: 30 suites, 234 tests passing

## Backend Type Safety & Caching (Current Session)

### Task 1: Fix `as any` casts in Prisma groupBy results
- Create `src/types/prisma-results.ts` with proper interfaces
- Fix dashboard.ts, reports.ts, score-calculator.ts

### Task 2: Add HTTP Cache-Control headers
- GET /api/health: `Cache-Control: no-cache`
- GET /api/children/:id/milestones: `Cache-Control: private, max-age=60`
- GET /api/dashboard/:childId: `Cache-Control: private, max-age=30`

### Task 3: Add ETag support for dashboard
- Generate ETag from calculatedAt timestamp
- Return 304 Not Modified on If-None-Match match

### Baseline: 488 backend tests passing

## PWA Icons & useEffect Fixes (Current Session)

### Task 1: PWA Icons
- Created `apps/web/public/icons/` with three SVG icons using Arabic "م"
- Updated `manifest.json` to reference `.svg` with `image/svg+xml` MIME type
- Design matches existing `favicon.svg` gradient (#10b981 to #059669)

### Task 2: useEffect Dependency Fixes
- `compare/page.tsx`: Added `tc` to first useEffect deps (used on line 55)
- `dashboard/page.tsx`: Added `t` to second useEffect deps (used on lines 93, 98, 103)
- next-intl provides stable references, so no infinite re-render risk

## Previous Tasks (Completed)
- Composite database indexes
- Photo upload directory
- Rate limiting (already complete)
