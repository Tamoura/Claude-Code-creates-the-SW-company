# SEC-015: Idempotency Key Format Validation

## Problem
The `Idempotency-Key` header in `payment-sessions.ts` is accepted
without any format validation. Empty strings, very long strings, or
strings with special/invalid characters are all accepted. This could
lead to database bloat or potential injection via column truncation.

## Fix
- Add `idempotencyKeySchema` in `validation.ts`
- Validate the header in `payment-sessions.ts` before use
- Accept: alphanumeric, hyphens, underscores, 1-64 chars
- Reject: empty, >64 chars, special chars
- Missing header is still allowed (it's optional)

## Files Modified
- `apps/api/tests/routes/v1/idempotency-key-validation.test.ts` (new)
- `apps/api/src/utils/validation.ts`
- `apps/api/src/routes/v1/payment-sessions.ts`
