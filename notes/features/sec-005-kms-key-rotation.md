# SEC-005: KMS Key Rotation and Health Check

## Problem
The KMS service has no code-level key rotation mechanism. While AWS KMS
handles automatic rotation, there is no emergency revocation path or
programmatic way to rotate to a new key ID at runtime.

## Approach
1. Add `rotateKey(newKeyId)` method to `KMSService`
2. Add `isKeyHealthy()` boolean convenience method
3. Ensure `keyId` property is mutable for rotation
4. `clearCache()` already exists and works correctly

## Key Decisions
- `rotateKey` logs a warning with truncated key IDs (first 8 chars)
- `isKeyHealthy()` returns a simple boolean (delegates to `getPublicKey`)
- Existing `healthCheck()` returns a richer status object; `isKeyHealthy`
  is a simpler convenience for automated checks

## Files Changed
- `products/stablecoin-gateway/apps/api/tests/services/kms-key-rotation.test.ts` (new)
- `products/stablecoin-gateway/apps/api/src/services/kms.service.ts` (modified)
