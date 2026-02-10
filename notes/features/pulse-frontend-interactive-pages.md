# FRONTEND-03: Pulse Interactive Pages

## Task
Build the remaining interactive pages for the Pulse dashboard:
1. Sprint risk dashboard with AI explanation
2. Risk history page
3. Settings page with profile and GitHub connection
4. Notification preferences
5. Team settings (member management)
6. Team page (list teams, create team)
7. Team member detail page

## Branch
`feature/pulse/inception` (already checked out)

## Key Decisions
- Only pages needing state use 'use client' (risk history, notifications, team settings)
- Server components used where no state needed (risk page, settings, team list, team detail)
- Follow existing CSS variable pattern (--bg-card, --text-primary, etc.)
- Use mock data inline (same pattern as ActivityFeed, DashboardPage)
- RiskGauge component already exists - reused in risk page
- DateRangeSelector already exists - reused in risk history
- Toggle switches use role="switch" with aria-checked for accessibility

## API Contract (for future wiring)
- GET /api/v1/risk/current?teamId=X
- GET /api/v1/risk/history?teamId=X&days=30
- GET /api/v1/repos?teamId=X
- POST /api/v1/repos/connect
- DELETE /api/v1/repos/:id/disconnect

## Progress
- [x] Risk dashboard page + tests (14 tests)
- [x] Risk history page + tests (12 tests)
- [x] Settings page + tests (11 tests)
- [x] Notification settings page + tests (12 tests)
- [x] Team settings page + tests (12 tests)
- [x] Team page + tests (11 tests)
- [x] Team member detail page + tests (8 tests)

## Test Summary
- Original tests: 103
- New tests: 80
- Total: 183 (all passing)
