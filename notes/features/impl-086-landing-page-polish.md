# IMPL-086: Polish Landing Page and Deferred Page Skeletons

## Branch: foundation/ctoaas

## Scope
1. Polish landing page (page.tsx) with hero, 6 features, how-it-works, pricing, footer
2. Create 5 deferred page skeletons under (dashboard): help, integrations, reports, team, compliance

## Design Decisions
- Landing page: Server Component (no "use client")
- Deferred pages: Server Components under (dashboard) layout
- Indigo theme consistent with existing design tokens
- All pages use semantic HTML, proper heading hierarchy, accessible
- No "Coming Soon" text -- real page skeletons with descriptions

## Files Changed
- `src/app/page.tsx` -- polished landing page
- `src/app/(dashboard)/help/page.tsx` -- FAQ accordion
- `src/app/(dashboard)/integrations/page.tsx` -- integration hub
- `src/app/(dashboard)/reports/page.tsx` -- report generation
- `src/app/(dashboard)/team/page.tsx` -- team management
- `src/app/(dashboard)/compliance/page.tsx` -- compliance checker
- Tests for all pages
