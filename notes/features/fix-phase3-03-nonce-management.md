# FIX-PHASE3-03: Transaction Nonce Management

## Problem
`blockchain-transaction.service.ts` called `tokenContract.transfer()` without
nonce management. Concurrent refunds could submit transactions with the same
nonce, causing failures or transaction replacements.

## Solution
Created `NonceManager` service using Redis distributed locking to serialize
nonce acquisition across concurrent transactions.

## Files Changed
- `apps/api/src/services/nonce-manager.service.ts` - New service
- `apps/api/src/services/blockchain-transaction.service.ts` - Integration
- `apps/api/tests/services/nonce-manager.test.ts` - 13 tests
- `apps/api/tests/services/blockchain-transaction.test.ts` - 4 new tests

## NonceManager Design
- Uses Redis `SET key value PX timeout NX` for distributed lock
- Queries network for pending nonce via `getTransactionCount('pending')`
- Tracks used nonces in Redis to avoid conflicts
- Uses `max(networkNonce, trackedNonce + 1)` to handle gaps
- Safe lock release: only the lock owner can release (UUID comparison)
- Lock timeout prevents deadlocks from crashed processes

## Integration Points
- `BlockchainTransactionService` constructor accepts optional `NonceManager`
- Before `transfer()`: acquires nonce via `getNextNonce(address, provider)`
- After `tx.wait(1)`: confirms nonce via `confirmNonce(address, nonce)`
- Transfer called with `{ nonce }` option when managed
- Fully backward compatible: works without NonceManager

## Test Coverage
- 13 NonceManager unit tests
- 4 blockchain-transaction integration tests
- Total: 17 tests, all passing
