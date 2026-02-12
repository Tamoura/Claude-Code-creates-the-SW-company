# Muaththir Weekly Digest Page

## Feature Summary
Create a Weekly Digest page at `/dashboard/digest` that displays a summary of children's development progress for the past week.

## Backend Endpoint
`GET /api/digest/weekly` returns:
- `period`: `{ from, to }` date strings
- `children[]`: each with `childId`, `childName`, `observationCount`, `milestonesAchieved`, `topDimension`, `areasNeedingAttention[]`
- `overall`: `{ totalObservations, totalMilestones }`

## Implementation Decisions
- Added `getWeeklyDigest()` method to `apiClient` (api-client.ts)
- i18n keys under `digest` namespace in en.json / ar.json
- Sidebar link added between "insights" and "family" in navItemDefs
- Page follows same card/grid pattern as goals/insights pages
- Loading skeletons, error state with retry, empty state for no children / no activity

## Files Changed
- `products/muaththir/apps/web/src/app/dashboard/digest/page.tsx` (new)
- `products/muaththir/apps/web/src/lib/api-client.ts` (added types + method)
- `products/muaththir/apps/web/src/components/layout/Sidebar.tsx` (added nav item)
- `products/muaththir/apps/web/src/messages/en.json` (added digest namespace + sidebar key)
- `products/muaththir/apps/web/src/messages/ar.json` (added digest namespace + sidebar key)
- `products/muaththir/apps/web/tests/pages/digest.test.tsx` (new - unit tests)
- `products/muaththir/e2e/tests/digest-flow.spec.ts` (new - E2E tests)
