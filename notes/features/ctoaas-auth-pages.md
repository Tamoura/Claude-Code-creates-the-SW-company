# CTOaaS Auth Pages - IMPL-011

## Status: Complete

## What was built
- Signup page with React Hook Form + Zod validation (name, email, company, password, confirm password)
- Login page with React Hook Form + Zod (email, password), generic error for failed auth
- Verify-email/[token] page with loading/success/error/pending states
- Validation schemas in `src/lib/validations/auth.ts`
- Polished auth layout with indigo gradient background

## Key decisions
- Password requirements: 8+ chars, uppercase, lowercase, number, special char
- Login shows "Invalid email or password" on any failure (prevents user enumeration)
- Verify-email uses "pending" token for post-signup state (shows "check your email")
- All auth uses httpOnly cookies (no localStorage tokens)
- CSRF token fetched via `apiClient.ensureCsrfToken()` before POST requests

## Test setup notes
- React 18 vs 19 dual-instance issue in pnpm monorepo required explicit React 18 resolution in jest.config.ts moduleNameMapper
- next/link mocked via JS file at `src/__mocks__/next/link.js`
- next/navigation mocked via moduleNameMapper (test files can override with jest.mock)

## Tests: 32/32 passing
- 14 validation schema tests
- 7 signup page tests
- 6 login page tests
- 5 verify-email page tests
