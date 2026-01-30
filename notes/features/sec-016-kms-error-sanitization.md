# SEC-016: KMS Error Messages Leak Implementation Details

## Problem

In `products/stablecoin-gateway/apps/api/src/services/kms.service.ts`, four catch blocks in `getAddress()`, `getPublicKey()`, `sign()`, and `signTransaction()` pass the original AWS error message into the `AppError.details` field via `originalError`. This means AWS-specific details (key ARN, region, IAM permission names) can leak to API consumers.

## Fix

1. Add `sanitizeKmsError()` helper that:
   - Logs the full original error for debugging (via logger)
   - In production (`NODE_ENV === 'production'`), returns a generic message
   - In development, includes the original error message for debugging
2. Replace all four catch blocks to use `sanitizeKmsError()`
3. Remove `originalError` from `AppError.details` to prevent info disclosure

## Files Changed

- `apps/api/tests/services/kms-error-sanitization.test.ts` (new test file)
- `apps/api/src/services/kms.service.ts` (error handling fix)
