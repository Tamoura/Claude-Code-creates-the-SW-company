# Muaththir Production Final Polish

## Task Summary
Branch: `feature/muaththir/production-final-polish`

Five features to implement:
1. Observation Search on Timeline page (client-side keyword filter)
2. Dashboard Stats Summary (total obs, days since first, streak)
3. PWA Manifest (manifest.json + link in root layout)
4. Loading States (improved skeletons for Dashboard, Timeline, Milestones)
5. Keyboard Shortcuts (Ctrl+N / Cmd+N to navigate to observation form)

## i18n Keys Required
All new user-visible strings need keys in both en.json and ar.json.

## Key Decisions
- Search is client-side only (filters already-loaded observations by content field)
- Stats use data from the dashboard API response (DashboardData type)
- Streak = consecutive days with at least 1 observation (calculated client-side)
- PWA icons are placeholder paths for now
- Keyboard shortcut uses router.push to /dashboard/observe

## Files Changed
- `src/app/dashboard/timeline/page.tsx` - search input
- `src/app/dashboard/page.tsx` - stats row
- `src/app/layout.tsx` - manifest link
- `src/components/ui/Skeleton.tsx` - improved skeletons
- `src/app/dashboard/loading.tsx` - uses improved skeleton
- `src/components/layout/DashboardLayout.tsx` - keyboard shortcut
- `src/messages/en.json` - new translation keys
- `src/messages/ar.json` - new translation keys
- `public/manifest.json` - new PWA manifest
- `tests/pages/timeline.test.tsx` - search tests
- `tests/pages/dashboard.test.tsx` - stats tests
