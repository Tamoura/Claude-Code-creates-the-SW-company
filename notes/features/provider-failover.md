# Provider Failover Feature

## Summary
Add RPC provider failover with health checks to the stablecoin-gateway
blockchain services. Each network currently uses a single RPC provider
with no fallback. If it goes down, all blockchain operations fail.

## Key Design Decisions
- ProviderManager utility class at `apps/api/src/utils/provider-manager.ts`
- Supports comma-separated RPC URLs via env vars (e.g., `POLYGON_RPC_URLS`)
- Falls back to existing single-value env vars for backwards compatibility
- Health check via `getBlockNumber()`
- Failed providers enter a 60-second cooldown before retry
- Each network has independent failover state

## Files Modified
- `apps/api/src/utils/provider-manager.ts` (new)
- `apps/api/src/services/blockchain-transaction.service.ts` (integrate)
- `apps/api/src/services/blockchain-monitor.service.ts` (integrate)
- `apps/api/tests/services/provider-failover.test.ts` (new)

## Env Var Changes
- New: `POLYGON_RPC_URLS` (comma-separated)
- New: `ETHEREUM_RPC_URLS` (comma-separated)
- Existing: `POLYGON_RPC_URL` / `ETHEREUM_RPC_URL` still supported
