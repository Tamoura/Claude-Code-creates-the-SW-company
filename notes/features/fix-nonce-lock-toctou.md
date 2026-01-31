# Fix: Nonce Lock TOCTOU Race Condition

## Problem
In `nonce-manager.service.ts` lines 101-107, lock release uses a
non-atomic GET + compare + DEL pattern. Between the GET and DEL,
the lock could expire and be re-acquired by another process, and
the DEL would then remove the wrong owner's lock.

## Solution
Replace with an atomic Redis Lua compare-and-delete script.
Add a fallback to non-atomic release if Lua eval fails.

## Files Changed
- `products/stablecoin-gateway/apps/api/src/services/nonce-manager.service.ts`
- `products/stablecoin-gateway/apps/api/tests/services/nonce-lock-atomicity.test.ts` (new)

## Test Cases
1. Lock is released atomically via Lua script after getNextNonce
2. Lock owned by another process is NOT released
3. Fallback to non-atomic release if eval throws
4. Full acquire-and-release flow works correctly
