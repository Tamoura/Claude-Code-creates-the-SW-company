# FIX-PHASE2-04: Move JWT to HttpOnly Cookies

## Problem
JWT access tokens stored in localStorage are vulnerable to XSS attacks.
Any XSS vulnerability would expose all user sessions.

## Solution

### Backend Changes
- Installed `@fastify/cookie` plugin and registered in `app.ts`
- Added `setRefreshCookie()` / `clearRefreshCookie()` helpers in `auth.ts`
- Signup, login, and refresh routes now set httpOnly cookies
- Logout route now clears the httpOnly cookie
- Refresh and logout routes read token from cookie as fallback
  when no `refresh_token` in request body

### Cookie Security Attributes
- `httpOnly: true` -- not accessible to JavaScript
- `secure: true` in production (false in dev/test)
- `sameSite: 'strict'` -- CSRF protection
- `path: '/v1/auth'` -- scoped to auth endpoints only
- `maxAge: 7 days` -- matches refresh token lifetime

### Frontend Changes
- `token-manager.ts` now uses a private module-scoped variable
  instead of `localStorage`
- Access token stored in memory only
- Refresh token handled via httpOnly cookies (invisible to JS)
- Trade-off: tokens lost on page refresh, requiring silent
  re-auth via the httpOnly refresh cookie

### CORS
- Already configured with `credentials: true` in `app.ts`

## Files Modified
- `apps/api/src/app.ts` -- register @fastify/cookie
- `apps/api/src/routes/v1/auth.ts` -- set/clear cookies
- `apps/web/src/lib/token-manager.ts` -- memory-only storage
- `apps/web/tests/lib/token-manager.test.ts` -- updated for memory
- `apps/web/tests/lib/auth-lifecycle.test.ts` -- removed localStorage
- `apps/web/tests/hooks/useAuth.test.tsx` -- removed localStorage

## Tests
- 7 backend integration tests (auth-cookies.test.ts)
- 6 frontend unit tests (src/lib/token-manager.test.ts)
- 8 frontend unit tests (tests/lib/token-manager.test.ts)
- Total: 21 new/updated tests, all passing

## Notes
- Response body still returns `refresh_token` for backward
  compatibility with existing API consumers
- Cookie is an additional transport, not a replacement for body
- Pre-existing rate-limit flakiness in `auth.test.ts` and
  `token-revocation.test.ts` is unrelated to this change
