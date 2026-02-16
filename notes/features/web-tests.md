# LinkedIn Agent Web Frontend Tests

## Summary
Set up Jest + React Testing Library for the LinkedIn Agent web app
(Next.js 15 / React 19) and wrote 63 tests across 7 test suites.

## Test Framework Setup
- Jest 30 with `next/jest` transformer
- `jest-environment-jsdom` for browser environment
- `@testing-library/react` + `@testing-library/user-event` for
  component testing
- `@testing-library/jest-dom` for DOM matchers
- Config: `jest.config.js` uses `next/jest` with `@/` path alias

## Test Suites

| File | Tests | What it covers |
|------|-------|----------------|
| FormatBadge.test.tsx | 9 | All 5 format labels, 2 fallback cases, icon, styling |
| StatusBadge.test.tsx | 8 | All 5 status labels, 2 fallback cases, styling |
| PostCard.test.tsx | 10 | Title, preview, language labels, link href, badges, date |
| TrendCard.test.tsx | 12 | Topic, description, score colors, angles, link href |
| CarouselPreview.test.tsx | 10 | Slide content, navigation, disabled buttons, speaker notes, empty state |
| LanguageToggle.test.tsx | 6 | Both buttons render, onToggle callbacks, active styling |
| api.test.ts | 8 | URL construction, headers, error extraction (RFC 7807), field errors |

## Notes
- `next/link` is mocked as a plain `<a>` tag in PostCard and TrendCard
  tests so `href` can be asserted
- `setupFilesAfterEnv` (not `setupFilesAfterSetup`) is the correct
  Jest config key
- `global.fetch` is mocked in api.test.ts; no real API calls
