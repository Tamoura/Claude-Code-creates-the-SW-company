# ArchForge Foundation Auth Sprint

## Branch
`feature/archforge/foundation-auth`

## Summary
Complete auth system for ArchForge API: register, login, refresh (token rotation), logout, /me, forgot-password, reset-password, email verification, account lockout, JTI blacklist, and audit logging.

## Test Results
- **61 tests passing** (5 health + 56 auth)
- All source files under 300 lines

## Architecture Decisions
- **Service extraction**: Auth logic in `modules/auth/` with AuthService (core) and AuthRecoveryService (password reset + email verify)
- **Token rotation**: Refresh tokens stored as SHA-256 hashes in sessions table, rotated on each /refresh call
- **httpOnly cookies**: Refresh token delivered via httpOnly cookie (sameSite: strict, path: /api/v1/auth)
- **JTI blacklist**: Access token JTI stored in Redis on logout with 24h TTL, checked in auth plugin
- **Account lockout**: 5 failed attempts → 15 minute lock, cleared on successful login or password reset
- **Audit logging**: All auth events logged to audit_log table, no PII in metadata
- **Email normalization**: All emails lowercased + trimmed on input

## Key Files
| File | Purpose |
|------|---------|
| `src/modules/auth/auth.service.ts` | Core auth: register, login, refresh, logout, profile |
| `src/modules/auth/auth.recovery.ts` | Password reset, email verification |
| `src/modules/auth/auth.routes.ts` | Route handlers delegating to services |
| `src/modules/auth/auth.schemas.ts` | Zod validation schemas |
| `src/modules/auth/auth.types.ts` | TypeScript interfaces |
| `src/plugins/auth.ts` | JWT + API key auth with JTI blacklist |
| `tests/integration/auth.test.ts` | 56 integration tests |

## Patterns from ConnectIn
- Singleton test app with `getApp()` helper
- `cleanDatabase()` respecting FK order (18 tables)
- `buildApp({ skipRateLimit: true })` for test isolation
- Dual-mode Redis (real + graceful degradation)

## Environment
- PostgreSQL: Homebrew on port 5432 (not Docker 5433)
- Redis: Homebrew on port 6379 (not Docker 6380)
- API: port 5012
