# Muaththir Final Features

## Branch
`feature/muaththir/final-features`

## Status

### Task 1: Child Photo Upload UI
- **Status**: Already complete
- Photo upload exists in `products/muaththir/apps/web/src/app/dashboard/child/[id]/edit/page.tsx`
- Full implementation: file input, preview, type/size validation, upload via `apiClient.uploadChildPhoto`
- Translation keys present in both en.json and ar.json under `editChild`

### Task 2: Export Button on Dashboard/Timeline
- **Status**: Needs implementation
- `apiClient.exportData(format)` method exists in api-client.ts (returns Blob)
- Backend endpoint: `GET /api/export?format=csv|json`
- Need to add export button to timeline page
- Translation keys for export already exist under `settings.exportTitle`, `reports.downloadCSV`

### Task 3: Onboarding "Try Demo" Option
- **Status**: Already complete
- Demo section exists on onboarding page at `/onboarding/page.tsx`
- Links to `/login?demo=true`
- Translation keys present: `onboarding.demoTitle`, `onboarding.demoDesc`, `onboarding.demoLogin`

### Task 4: Date Format Utility
- **Status**: Already complete
- `products/muaththir/apps/web/src/lib/date-format.ts` exists
- Functions: `formatDate`, `formatDateLong`, `formatDateTime`
- Locale-aware using `Intl.DateTimeFormat`
- Locale map: en -> en-GB, ar -> ar-SA

### Task 5: Tests
- Need tests for: export functionality on timeline page, date-format utility
- Test patterns: see `tests/pages/dashboard.test.tsx` for reference
- Jest config in `jest.config.js`, setup in `tests/setup.ts`

## Patterns
- All text uses `useTranslations()` from next-intl
- Cards use `card` CSS class
- Buttons use `btn-primary` / `btn-secondary` classes
- Dark mode supported via `dark:` Tailwind prefixes
- API client at `../../lib/api-client`
