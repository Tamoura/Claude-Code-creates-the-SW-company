# QDB One — Mobile Web Screens

## Summary
Added 18 mobile-optimized page routes under `/m/` prefix with 5 shared mobile components. All routes mirror the 17 existing desktop routes plus a mobile-specific landing page.

## Architecture
- `/m/` routes bypass desktop AppShell and use their own `MobileLayout` with `BottomNav`
- 100% data reuse — zero changes to `src/data/` or `src/contexts/`
- Public routes (`/m`, `/m/login`) render without bottom nav
- Auth-gated routes redirect to `/m/login` if unauthenticated

## Components Created
- `BottomNav` — 5-tab fixed bottom navigation with notification badge
- `MobileHeader` — Sticky header with back button (RTL-aware) and action slots
- `MobileCard` — Touch-friendly card with optional `href`/`onClick`
- `MobileStatusBadge` — Color-coded status pill reusing desktop status colors
- `MobileActionSheet` — Slide-up bottom sheet with backdrop

## Mobile Pages (18 routes)
| Route | Purpose |
|-------|---------|
| `/m` | Landing (unauth) or Dashboard (auth) |
| `/m/login` | Mobile login |
| `/m/financing` | Loan + application card list |
| `/m/financing/loans/[id]` | Loan detail with payment schedule |
| `/m/financing/applications/[id]` | Application detail with timeline |
| `/m/guarantees` | Guarantee card list |
| `/m/guarantees/[id]` | Guarantee detail with signatories |
| `/m/guarantees/[id]/sign` | 3-step signature workflow |
| `/m/advisory` | Programs, sessions, assessments |
| `/m/advisory/programs/[id]` | Program milestones + sessions |
| `/m/advisory/sessions/[id]` | Session detail with materials |
| `/m/advisory/assessments/[id]` | Score breakdown + recommendations |
| `/m/documents` | Searchable document list |
| `/m/profile` | "More" tab with org switcher, links |
| `/m/notifications` | Notification feed |
| `/m/search` | Full-text search across portals |
| `/m/admin/identity/review` | Identity match approve/reject |

## Build Verification
- `npx next build` passes with 35 total routes (17 desktop + 18 mobile)
- All mobile routes compile as static or dynamic correctly

## Key Patterns
- Desktop tables → mobile card stacks
- Cross-portal links use `/m/` prefix
- Activity deep links rewrite `/` → `/m/`
- All text bilingual via `t()` helper
- RTL back arrow flips via `isRtl` check
