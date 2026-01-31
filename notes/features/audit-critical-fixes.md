# Audit Critical Fixes

**Branch**: `fix/stablecoin-gateway/audit-critical-fixes`
**Date**: 2026-01-31

## Fixes to Implement

1. **Atomic spending limit check** - Replace check-then-record with atomic Redis Lua script in blockchain-transaction.service.ts
2. **Nonce lock TOCTOU fix** - Replace check-then-delete with atomic Lua compare-and-delete in nonce-manager.service.ts
3. **Floating-point precision fix** - DONE. Removed .toNumber() on lines 194 and 240, replaced native >= and < with Decimal.greaterThanOrEqualTo() and Decimal.lessThan() on lines 200 and 244. Added .toNumber() only for log output on line 260. Test: payment-verification-precision.test.ts proves the bug with wei=999999999999999999 where .toNumber() rounds 999999999999.999999 up to 1e12, incorrectly accepting a $0.000001 underpayment.
4. **Refund idempotency** - Add Redis-based idempotency key to executeRefund in blockchain-transaction.service.ts
5. **Remove password reset token from logs** - Remove `token` from logger call in auth.ts:462
6. **SSE rate limiting** - Add rate limit config to SSE endpoint in payment-sessions.ts:404
7. **Decimal serialization fix** - Add .toNumber() on refunded_amount in refund.service.ts:737
