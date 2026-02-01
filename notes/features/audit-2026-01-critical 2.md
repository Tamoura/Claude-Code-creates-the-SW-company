# Audit 2026-01 Critical Fixes

Branch: `fix/stablecoin-gateway/audit-2026-01-critical`
Base: `fix/stablecoin-gateway/audit-quickwins-and-remaining`

## Fixes (in implementation order)

1. **Fix 4**: Enforce payment state machine in `updatePaymentStatus()`
2. **Fix 1**: Block blockchain field PATCH without status transition
3. **Fix 5**: Make WEBHOOK_ENCRYPTION_KEY mandatory in production
4. **Fix 2**: Fix decimal precision in blockchain amounts
5. **Fix 7**: Fix webhook resource ID extraction
6. **Fix 8**: Fix idempotency key parameter mismatch (409 on diff params)
7. **Fix 6**: Fix KMS recovery parameter validation
8. **Fix 3**: Persist audit logs to database (Prisma migration)

## Key observations

- `payment.service.ts:updatePaymentStatus()` had no state machine call despite `validatePaymentStatusTransition()` existing
- The PATCH route in `payment-sessions.ts` already calls it (line 278-283) but only within the $transaction
- The `updatePaymentStatus()` method on PaymentService was called separately and bypassed the state machine
- `blockchain-transaction.service.ts:343-345` used `Math.floor(amount * Math.pow(10, 6))` which loses sub-cent precision for large amounts
- `refund.service.ts:384` used `Number(refund.amount)` which loses precision for large Decimal values
- `audit-log.service.ts` stored entries in `private entries: AuditEntry[] = []` — lost on restart
- `env-validator.ts` already errored in production for WEBHOOK_ENCRYPTION_KEY but API_KEY_HMAC_SECRET only warned
- `webhook-delivery.service.ts:202` used fallback `data.id || data.payment_session_id || data.refund_id`
- KMS `findRecoveryParam` already compares against expected address — tests added as regression protection
- Integration tests are affected by Redis rate limiting — flush `ratelimit:*` keys between test runs

## Status

- [x] Branch created
- [x] Fix 4 — State machine (commit `55ff360`)
- [x] Fix 1 — Blockchain bypass (commit `bc14d33`)
- [x] Fix 5 — Env validation (commit `ac61b4c`)
- [x] Fix 2 — Decimal precision (commit `53d9b80`)
- [x] Fix 7 — Webhook resource ID (commit `d03326a`)
- [x] Fix 8 — Idempotency mismatch (commit `8b35f66`)
- [x] Fix 6 — KMS recovery (commit `f341fc3`)
- [x] Fix 3 — Audit log persistence (commit `5572c72`)
- [x] All tests passing
