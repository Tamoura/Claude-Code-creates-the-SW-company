# Refund Idempotency - Blockchain Transaction Service

## Problem
`executeRefund()` in `blockchain-transaction.service.ts` has no
idempotency protection. Network retries or duplicate requests can
submit the same blockchain transaction twice, causing double-spending.

## Solution
Redis-based idempotency key tracking:
1. Add `idempotencyKey?` to `RefundTransactionParams`
2. Check Redis before executing (return cached result if found)
3. Store result in Redis after success (24h TTL)
4. Add `set` to `SpendingLimitRedis` interface
5. Graceful degradation when Redis fails

## Key Decisions
- Idempotency key is optional (backward compatible)
- 24-hour TTL for idempotency cache (`86400` seconds)
- Redis key format: `refund_idem:{key}`
- Graceful degradation: Redis failure does not block refund

## Files Modified
- `src/services/blockchain-transaction.service.ts`
  - `SpendingLimitRedis` interface (add `set`)
  - `RefundTransactionParams` interface (add `idempotencyKey`)
  - `executeRefund()` method (idempotency check + store)

## Test File
- `tests/services/refund-idempotency-blockchain.test.ts`
