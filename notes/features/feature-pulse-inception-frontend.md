# Feature: Pulse Frontend Foundation (FRONTEND-01)

## Branch
`feature/pulse/inception`

## Summary
Setup complete Next.js 14 frontend for Pulse developer intelligence dashboard.

## Key Decisions
- Port: 3106 (frontend), 5003 (backend API)
- Adapted components from Component Registry (stablecoin-gateway)
- Next.js App Router (not Pages Router)
- Tailwind CSS with custom theme variables for dark mode
- Recharts for charts (ADR-004)
- Storage key: `pulse-theme` (adapted from stableflow-theme)

## Component Registry Reuse
- TokenManager: copied as-is
- useAuth: adapted for Pulse (GitHub OAuth support added)
- useTheme: copied, changed storage key to `pulse-theme`
- ErrorBoundary: adapted for Next.js (removed import.meta.env.DEV, use process.env.NODE_ENV)
- StatCard: adapted with Tailwind standard colors instead of custom tokens
- Sidebar: fully rewritten for Pulse navigation structure

## Routes (All from site map)
- / (landing)
- /login, /signup, /forgot-password, /reset-password, /verify-email
- /dashboard (overview)
- /dashboard/activity, /velocity, /quality, /risk, /risk/history
- /dashboard/repos, /repos/[id]
- /dashboard/team, /team/[id]
- /dashboard/settings, /settings/notifications, /settings/team
- /dashboard/overview
- /pricing, /docs

## Tests
- Landing page
- Login page
- Dashboard layout
- StatCard component
- Sidebar component
