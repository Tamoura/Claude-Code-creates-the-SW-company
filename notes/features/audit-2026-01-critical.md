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

- `payment.service.ts:updatePaymentStatus()` has no state machine call despite `validatePaymentStatusTransition()` existing
- The PATCH route in `payment-sessions.ts` already calls it (line 278-283) but only within the $transaction
- The `updatePaymentStatus()` method on PaymentService is called separately and bypasses the state machine
- `blockchain-transaction.service.ts:343-345` uses `Math.floor(amount * Math.pow(10, 6))` which loses sub-cent precision for large amounts
- `refund.service.ts:384` uses `Number(refund.amount)` which loses precision for large Decimal values
- `audit-log.service.ts` stores entries in `private entries: AuditEntry[] = []` — lost on restart
- `env-validator.ts` already errors in production for WEBHOOK_ENCRYPTION_KEY (line 251-254) but API_KEY_HMAC_SECRET only warns (line 293-297)
- `webhook-delivery.service.ts:202` uses fallback `data.id || data.payment_session_id || data.refund_id`
- KMS `findRecoveryParam` already compares against expected address — audit issue is about additional validation

## Status

- [x] Branch created
- [ ] Fix 4 — State machine
- [ ] Fix 1 — Blockchain bypass
- [ ] Fix 5 — Env validation
- [ ] Fix 2 — Decimal precision
- [ ] Fix 7 — Webhook resource ID
- [ ] Fix 8 — Idempotency mismatch
- [ ] Fix 6 — KMS recovery
- [ ] Fix 3 — Audit log persistence
