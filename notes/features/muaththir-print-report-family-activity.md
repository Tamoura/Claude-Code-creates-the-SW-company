# Muaththir: Print Report + Family Activity Feed

## Enhancement 1: Print-Optimized Report Page
- Add `@media print` CSS for beautiful PDF output
- Hide sidebar, header, nav in print
- White background, full-width content, page margins
- Print header with child name and date
- Page breaks between sections
- Radar chart prints correctly
- Page numbers via CSS counter
- "Download Report" button triggers window.print() with print-friendly class
- Test: print button exists, print CSS class applied

## Enhancement 2: Cross-Child Activity Dashboard Widget
- New component: FamilyActivityFeed.tsx
- Fetches recent observations from ALL children
- Unified timeline with child name labels
- Activity type icons (observation, milestone, goal)
- Light/dark mode support
- Responsive (stack mobile, side-by-side desktop)
- Add to family page
- i18n keys in en.json and ar.json
- Tests: renders items, shows child names, handles empty state

## Files Modified
- src/app/globals.css (print styles)
- src/app/dashboard/reports/page.tsx (download button, print class)
- src/components/dashboard/FamilyActivityFeed.tsx (new)
- src/app/dashboard/family/page.tsx (add widget)
- src/messages/en.json (i18n keys)
- src/messages/ar.json (i18n keys)
- tests/ (new test files)
