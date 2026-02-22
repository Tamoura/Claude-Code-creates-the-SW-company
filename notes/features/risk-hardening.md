# ConnectIn Risk Hardening

## Branch: fix/connectin/risk-hardening

## 9 Open Risks to Resolve
1. RISK-004: Missing rate limits on profile endpoints
2. RISK-013: Stale like/comment count return
3. RISK-018: Cursor pagination lacks bounds
4. RISK-002: Redis production upgrade (CRITICAL)
5. RISK-015: Password reset flow
6. RISK-017: Session auto-cleanup
7. RISK-006: Plugin test coverage
8. RISK-009: WCAG AA violations
9. RISK-019: Salary decimal migration

## Progress
- [ ] Phase 1A: Rate limits on profile endpoints
- [ ] Phase 1B: Stale like/unlike counts
- [ ] Phase 1C: Cursor pagination validation
- [ ] Phase 2: Redis dual-mode
- [ ] Phase 3: Password reset
- [ ] Phase 4A: Session cleanup
- [ ] Phase 4B: Plugin tests
- [ ] Phase 4C: WCAG AA fixes
- [ ] Phase 5: Salary Decimal migration

## Key Decisions
- Tests use `skipRateLimit: true` in helpers.ts, so rate limit tests need
  separate app instances with rate limiting enabled
- Redis dual-mode: use dynamic import for `redis` package
- Password reset mirrors existing email verification pattern (hashToken)
- Salary migration uses `db push` (project convention), not migrations
