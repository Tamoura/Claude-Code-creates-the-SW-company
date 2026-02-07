# Pulse A11Y Audit (UIUX-01)

## Task
Design review and accessibility audit of Pulse dashboard
targeting WCAG 2.1 AA compliance.

## Key Decisions
- Changed dark mode `--text-muted` from #64748b to #94a3b8
  for contrast compliance
- Changed dark mode `--text-secondary` from #94a3b8 to #cbd5e1
- Added sr-only data tables as chart alternatives rather than
  aria-describedby text blocks (better screen reader UX)
- Used `<article>` for StatCard, `<section>` for content areas
- Used `<dl>/<dt>/<dd>` for read-only profile data in Settings

## Files Changed
- `apps/web/src/app/globals.css` - focus ring, skip link, dark
  mode contrast fixes
- `apps/web/src/app/dashboard/layout.tsx` - skip nav, main id
- `apps/web/src/components/layout/Sidebar.tsx` - aria labels,
  aria-current, hidden icons
- `apps/web/src/components/layout/Header.tsx` - button avatar,
  aria-hidden SVGs
- `apps/web/src/components/dashboard/StatCard.tsx` - article
  semantic, aria-label
- `apps/web/src/components/dashboard/RiskGauge.tsx` - SVG role,
  progressbar ARIA
- `apps/web/src/components/dashboard/ActivityFeed.tsx` - section,
  list semantics, time element
- `apps/web/src/components/common/EventIcon.tsx` - aria-hidden
- `apps/web/src/components/charts/VelocityChart.tsx` - section,
  sr-only table, aria-label
- `apps/web/src/components/charts/CoverageChart.tsx` - section,
  sr-only table, aria-label
- `apps/web/src/app/dashboard/activity/page.tsx` - labels,
  aria-live, list semantics
- `apps/web/src/app/dashboard/risk/page.tsx` - progressbar
  ARIA, list, section, time
- `apps/web/src/app/dashboard/settings/page.tsx` - dl/dt/dd,
  nav, aria-labels, hidden icons
- `products/pulse/docs/design/A11Y-AUDIT.md` - audit report

## Test Impact
- 183/183 tests passing, no regressions
