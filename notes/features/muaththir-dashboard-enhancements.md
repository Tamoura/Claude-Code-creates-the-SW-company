# Muaththir Dashboard Enhancements

## Feature Brief
Add four new features to make the Muaththir app more complete before launch:
1. Activity Feed on Dashboard
2. Progress Comparison Chart on Family Page
3. Export Data Button on Reports Page
4. Quick Observation from Dashboard

## Requirements

### Feature 1: Activity Feed Widget
- Component: `src/components/dashboard/ActivityFeed.tsx`
- Location: Dashboard page
- Content:
  - Recent observations with dimension badges
  - Milestone achievements
  - Goal completions
- Translation keys: `dashboard.activityFeed*`

### Feature 2: Progress Comparison Chart
- Location: Family page (`src/app/dashboard/family/page.tsx`)
- Use recharts BarChart component (already in dependencies)
- Show dimension scores comparison between children
- Translation keys: `family.progressComparison*`

### Feature 3: Export CSV Button
- Location: Reports page (`src/app/dashboard/reports/page.tsx`)
- Client-side CSV generation from observations data
- Button next to "Print Report"
- Translation keys: `reports.downloadCSV`, `reports.downloadData`

### Feature 4: Quick Log Mini-Form
- Location: Top of dashboard page
- Fields: Dimension selector, text field
- Submit creates observation without navigation
- Translation keys: `dashboard.quickLog*`

## Technical Constraints
- Use `useTranslations` from next-intl for ALL strings
- Add keys to both `src/messages/en.json` and `src/messages/ar.json`
- Follow existing patterns (Tailwind, card classes)
- All components must be 'use client' if using hooks
- Use existing apiClient methods only
- Keep components under 200 lines
- Build must pass: `npx next build`

## Implementation Plan
1. Create feature branch
2. Add translation keys to both locale files
3. Implement ActivityFeed component with tests
4. Add comparison chart to family page
5. Add CSV export to reports page
6. Add quick log form to dashboard
7. Run build to verify
8. Create PR

## Notes
- Recharts already in package.json (version ^2.12.0)
- API client has all needed methods (getObservations, createObservation, etc.)
- Existing dimension styling uses dim.colour for badges
