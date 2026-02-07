# FRONTEND-03: Pulse Interactive Pages

## Task
Build the remaining interactive pages for the Pulse dashboard:
1. Sprint risk dashboard with AI explanation
2. Risk history page
3. Settings page with profile and GitHub connection
4. Notification preferences
5. Team settings (member management)
6. Team page (list teams, create team)

## Branch
`feature/pulse/inception` (already checked out)

## Key Decisions
- Pages are client components ('use client') since they need state management
- Follow existing CSS variable pattern (--bg-card, --text-primary, etc.)
- Use mock data inline (same pattern as ActivityFeed, DashboardPage)
- RiskGauge component already exists - reuse it in risk page
- DateRangeSelector already exists - reuse in risk history

## API Contract (for future wiring)
- GET /api/v1/risk/current?teamId=X
- GET /api/v1/risk/history?teamId=X&days=30
- GET /api/v1/repos?teamId=X
- POST /api/v1/repos/connect
- DELETE /api/v1/repos/:id/disconnect

## Progress
- [ ] Risk dashboard page + tests
- [ ] Risk history page + tests
- [ ] Settings page + tests
- [ ] Notification settings page + tests
- [ ] Team settings page + tests
- [ ] Team page + tests
- [ ] Team member detail page + tests
