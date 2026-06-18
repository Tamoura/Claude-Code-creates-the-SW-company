# IMPL-054: Risk Dashboard Frontend

## Status: In Progress
## Branch: foundation/ctoaas

## What
Build the risk dashboard pages and components for CTOaaS:
- /risks - overview with 4 category cards
- /risks/:category - category detail with item list
- RiskCard, RiskItemRow, RiskDetail components
- Sidebar nav update

## API Endpoints (being built by backend)
- GET /api/v1/risks - summary (4 categories)
- GET /api/v1/risks/:category - items for category
- GET /api/v1/risks/items/:id - item detail
- PATCH /api/v1/risks/items/:id/status - update status
- POST /api/v1/risks/generate - generate from profile

## Key Decisions
- Using lucide-react icons (already in deps): Shield, Server, Building2, Settings2
- Color coding: green (1-3), yellow (4-6), red (7-10)
- Jest + RTL for tests (existing pattern)
- "use client" on interactive components
- Custom hook useRisks for API data fetching

## Files Created
- src/types/risks.ts - TypeScript types
- src/hooks/useRisks.ts - Custom hook for risk API calls
- src/components/risks/RiskCard.tsx
- src/components/risks/RiskItemRow.tsx
- src/components/risks/RiskDetail.tsx
- src/app/(dashboard)/risks/page.tsx
- src/app/(dashboard)/risks/[category]/page.tsx
- Tests for all above
