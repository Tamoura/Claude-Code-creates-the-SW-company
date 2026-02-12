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

## Changes Made
- (tracked as work progresses)
