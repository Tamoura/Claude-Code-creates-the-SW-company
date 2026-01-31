# Fix: Audit Critical Fixes

Branch: `fix/stablecoin-gateway/audit-critical-fixes`

## Problem 1: Password Reset Token Logged

File: `products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts`
Lines: 458-463

The `token` field is included in the `logger.info()` call for
password reset token generation. In production, logs go to
ELK/Splunk/CloudWatch and are accessible to anyone with log
access. This allows account takeover within the 1-hour TTL.

### Fix

Remove `token` from the logger.info data object. Keep `userId`
and `email` for operational visibility.

## Problem 2: Decimal Serialization in Refund Webhook

File: `products/stablecoin-gateway/apps/api/src/services/refund.service.ts`
Line: 737

`totalRefunded` is a `Decimal.js` object. When serialized to JSON
for webhook delivery, it produces `{"d":[...],"e":...,"s":...}`
instead of a plain number. Merchants receiving the
`payment.refunded` webhook get malformed data.

### Fix

Call `.toNumber()` on `totalRefunded` before assigning to
`refunded_amount` in the webhook payload.

## TDD Approach

- Test 1: Source code static analysis -- auth.ts logger call must
  not contain `token` key
- Test 2: Source code static analysis -- auth.ts logger call must
  still contain `userId` and `email`
- Test 3: `refunded_amount` in `payment.refunded` webhook must be
  a plain number, not a Decimal object
