# Muaththir Frontend Production Hardening P0

Branch: `feature/muaththir/production-hardening-p0`

## Changes Made

### Fix 1: Dashboard Promise.allSettled with Partial Failure Warning (HIGH-06)
- Dashboard already used `Promise.allSettled` for parallel API fetches
- Added `partialFailures` state to track which API calls failed
- Added a subtle amber warning banner when 1-2 (but not all 3) API calls fail
- Each partial failure shows a specific message (dashboard scores, observations, or milestones)
- Full error state still shows when all 3 API calls fail
- Dark mode support for the warning banner

### Fix 2: API Response Timeout (MEDIUM-05)
- Reduced default timeout from 30s to 15s in `request()` method
- `exportData()` method (which bypassed `request()`) now has its own
  AbortController-based timeout (30s for exports, since they can be larger)
- Clear error message: "Request timed out. Please try again." / "Export request timed out."

### Fix 3: Accessibility Improvements (MEDIUM-07)
- **Observe page**: Already had `<fieldset>/<legend>` for dimension and sentiment selectors
- **DimensionCard**: Added `/100` text next to score, improved aria-label with full context
- **ObservationCard**: Added dark mode classes to sentiment badges and tag pills
- **Goals page**: Changed icon-only buttons from `title` to `aria-label`, added `aria-hidden` to SVGs, added dark mode hover states
- **Timeline page**: Added `aria-label` to date filter inputs and sentiment dropdown, `aria-hidden` on delete icon SVG
- **Reports page**: Added `role="progressbar"` with `aria-valuenow/min/max` to score bars, `aria-hidden` on decorative color dots
- **Insights page**: Added `sr-only` text and `role="img"` to trend icons for screen reader access, dark mode fixes

### Fix 4: Locale-aware Date Formatting
- Created `src/lib/date-format.ts` with three utility functions:
  - `formatDate()` - short format (12 Feb 2026)
  - `formatDateLong()` - long format (12 February 2026)
  - `formatDateTime()` - with time (12 February 2026, 14:30)
- All use `Intl.DateTimeFormat` with locale mapping (en -> en-GB, ar -> ar-SA)
- Applied across 7 pages: timeline, reports, generate report, goals, goal detail,
  milestones detail, insights
- Replaced all hardcoded `toLocaleDateString('en-US')`, `toLocaleDateString('en-GB')`,
  and bare `toLocaleDateString()` calls

## Files Changed
- `src/lib/api-client.ts` - timeout 30s->15s, export timeout protection
- `src/lib/date-format.ts` - NEW locale-aware date formatting utility
- `src/app/dashboard/page.tsx` - partial failure warning banner
- `src/app/dashboard/timeline/page.tsx` - locale dates, a11y labels
- `src/app/dashboard/reports/page.tsx` - locale dates, progressbar a11y
- `src/app/dashboard/reports/generate/page.tsx` - locale dates
- `src/app/dashboard/goals/page.tsx` - locale dates, a11y labels on icon buttons
- `src/app/dashboard/goals/[id]/page.tsx` - locale dates
- `src/app/dashboard/milestones/[dimension]/page.tsx` - locale dates
- `src/app/dashboard/insights/page.tsx` - locale dates, trend icon a11y
- `src/components/dashboard/DimensionCard.tsx` - score /100, a11y, dark mode
- `src/components/dashboard/ObservationCard.tsx` - dark mode classes
- `src/messages/en.json` - new i18n keys
- `src/messages/ar.json` - new i18n keys (Arabic)

## Build Status
- PASS - all 30 routes compile successfully
