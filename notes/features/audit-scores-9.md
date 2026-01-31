# Audit Scores 9/10 — Implementation Notes

## Branch: `improve/stablecoin-gateway/audit-scores-9`
## PR Target: `fix/stablecoin-gateway/audit-2026-01-critical`

## Goal
Raise all four audit scores from current levels to 9/10:
- Security: 7 → 9
- Architecture: 6 → 9
- Test Coverage: 5 → 9
- AI-Readiness: 7 → 9

## Progress

### Phase 1: Fix Test Infrastructure (Test Coverage 5→7)
- [ ] 1.1 Redis FLUSHDB in test setup
- [ ] 1.2 Fix brittle test cleanup (delete → deleteMany)
- [ ] 1.3 CI build depends on tests

### Phase 2: Architecture Refactors (Architecture 6→8)
- [ ] 2.1 Extract shared token constants
- [ ] 2.2 Split refund.service.ts (761 → 3 files)
- [ ] 2.3 Split webhook-delivery.service.ts (611 → 3 files)
- [ ] 2.4 Split blockchain-transaction.service.ts (530 → 2 files)
- [ ] 2.5 Split kms.service.ts (381 → 2 files)
- [ ] 2.6 Auth plugin fire-and-forget optimization

### Phase 3: Security Fixes (Security 7→9)
- [ ] 3.1 Payment race condition (FOR UPDATE lock)
- [ ] 3.2 Timing-safe internal API key comparison
- [ ] 3.3 Refund idempotency key
- [ ] 3.4 Refund amount bounds checking
- [ ] 3.5 Decimal precision in spending limits
- [ ] 3.6 Pin JWT algorithm to HS256
- [ ] 3.7 SSE connection limits
- [ ] 3.8 Sanitize SSE error messages
- [ ] 3.9 PII redaction in logger
- [ ] 3.10 Bound audit log buffer (10k ring)

### Phase 4: Test Coverage Expansion (Test Coverage 7→9)
- [ ] 4.1 Webhook worker route tests
- [ ] 4.2 Frontend component tests
- [ ] 4.3 Auth negative-path tests
- [ ] 4.4 Concurrent payment state machine tests
- [ ] 4.5 E2E test expansion
- [ ] 4.6 E2E in CI pipeline

### Phase 5: AI-Readiness (AI-Readiness 7→9)
- [ ] 5.1 OpenAPI spec generation
- [ ] 5.2 Structured error catalog
- [ ] 5.3 Inline ADR comments

## Decisions & Notes
- Using facade pattern for service splits to avoid import changes in consumers
- Redis FLUSHDB expected to fix ~180 of 229 test failures from cross-contamination
- deleteMany instead of delete fixes remaining ~49 failures from FK constraint issues
