# Muaththir Production Launch Prep - Frontend Polish

## Branch
`feature/muaththir/production-launch-prep`

## Task Summary
Final production polish on the frontend covering:
1. Accessibility audit and fixes
2. Dashboard error boundary
3. PWA meta tags
4. Performance quick wins
5. Build verification

## Findings

### Accessibility
- Dashboard page: Well structured (h1/h2/h3, aria-live, role=alert, sr-only)
- Observe page: Missing role="alert" on error, role="status" on success
- Child profile: Missing role="alert" on error state
- DimensionCard: h3 missing dark:text-white class
- QuickLog: Missing aria-label on text input

### Error Boundary
- `app/error.tsx` exists with good UI but hardcoded English
- No `dashboard/error.tsx` - need one for dashboard-specific errors
- Task also requests `components/common/ErrorBoundary.tsx` as a reusable component

### PWA Meta Tags (Missing)
- viewport meta tag
- theme-color meta tag
- apple-mobile-web-app-capable
- Open Graph tags (og:title, og:description, og:type)

### Performance
- RadarChart already uses dynamic import (good)
- Only one `<img>` tag in child profile (user photo, external URL)
- No other heavy imports identified

## Backend Polish Tasks
1. Run full test suite - DONE (432/432 passing)
2. API Documentation - update docs/API.md with all endpoints
3. Health check enhancement - add /api/health/ready for K8s readiness
4. Graceful shutdown - SIGTERM/SIGINT handling in server.ts
5. Environment validation - startup validation for required env vars

### Backend Findings
- Existing API.md covers: Health, Auth, Children, Observations, Milestones, Dashboard, Profile
- Missing from API.md: Goals, Goal Templates, Insights, Reports, Sharing, Export, Demo Login, Activity Feed, Notifications, Photo Upload
- health.ts already checks DB connectivity on /api/health, but no separate /ready endpoint
- server.ts has no graceful shutdown handling
- env.ts validates DATABASE_URL and JWT_SECRET (in production), but no warnings for optional vars
- app.ts validates JWT_SECRET length >= 32 at startup

## Changes Made
- (tracked as work progresses)
