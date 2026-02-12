# Muaththir Final Features

## Branch
`feature/muaththir/final-features`

## Completed Tasks

### Task 1: Child Photo Upload UI
- **Status**: Already complete (no changes needed)
- Photo upload exists in `products/muaththir/apps/web/src/app/dashboard/child/[id]/edit/page.tsx`
- Full implementation: file input, preview, type/size validation, upload via `apiClient.uploadChildPhoto`
- Translation keys present in both en.json and ar.json under `editChild`

### Task 2: Export Button on Timeline
- **Status**: Implemented
- Added "Export CSV" button to the timeline page header
- Button appears when a child is selected
- Uses `apiClient.exportData('csv')` to fetch data
- Downloads as `observations-export.csv` using Blob + createObjectURL
- Loading state shows "Exporting..." while downloading
- Error message displayed on failure
- Translation keys added: `timeline.exportCSV`, `timeline.exporting`, `timeline.exportError`
- Both English and Arabic translations provided

### Task 3: Onboarding "Try Demo" Option
- **Status**: Already complete (no changes needed)
- Demo section exists on onboarding page at `/onboarding/page.tsx`
- Links to `/login?demo=true`
- Translation keys present: `onboarding.demoTitle`, `onboarding.demoDesc`, `onboarding.demoLogin`

### Task 4: Date Format Utility
- **Status**: Already complete (no changes needed)
- `products/muaththir/apps/web/src/lib/date-format.ts` exists
- Functions: `formatDate`, `formatDateLong`, `formatDateTime`
- Locale-aware using `Intl.DateTimeFormat`
- Locale map: en -> en-GB, ar -> ar-SA

### Task 5: Tests
- **Status**: Complete
- `tests/lib/date-format.test.ts`: 9 tests covering all three functions
  - English and Arabic locale formatting
  - Date object and string inputs
  - Invalid date fallback
  - Unknown locale passthrough
- `tests/pages/timeline.test.tsx`: 7 tests covering timeline page
  - Loading state
  - Child selector with multiple children
  - Observation rendering
  - Empty state
  - Export CSV button visibility
  - CSV download trigger
  - Dimension filter buttons

## Files Changed
- `products/muaththir/apps/web/src/app/dashboard/timeline/page.tsx` (export button + handler)
- `products/muaththir/apps/web/src/messages/en.json` (3 new timeline keys)
- `products/muaththir/apps/web/src/messages/ar.json` (3 new timeline keys)
- `products/muaththir/apps/web/tests/lib/date-format.test.ts` (new test file)
- `products/muaththir/apps/web/tests/pages/timeline.test.tsx` (new test file)
- `notes/features/muaththir-final-features.md` (this file)
