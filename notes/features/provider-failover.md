# Provider Failover Feature

## Status: Complete

## Summary
Added RPC provider failover with health checks to the stablecoin-gateway
blockchain services. Each network previously used a single RPC provider
with no fallback. If it went down, all blockchain operations failed.

## Implementation

### New Files
- `products/stablecoin-gateway/apps/api/src/utils/provider-manager.ts`
  - ProviderManager class with failover, health checks, cooldown
- `products/stablecoin-gateway/apps/api/tests/services/provider-failover.test.ts`
  - 15 tests covering all failover scenarios

### Modified Files
- `products/stablecoin-gateway/apps/api/src/services/blockchain-transaction.service.ts`
  - Replaced `Map<string, provider>` with `ProviderManager`
  - Added `getRpcUrls()` helper for env var parsing
  - Accepts optional `providerManager` in constructor options
- `products/stablecoin-gateway/apps/api/src/services/blockchain-monitor.service.ts`
  - Same changes (was already updated via parallel branch work)
- `products/stablecoin-gateway/apps/api/tests/services/blockchain-monitor.test.ts`
  - Updated to inject mock providers via ProviderManager
- `products/stablecoin-gateway/apps/api/tests/services/blockchain-monitor-tolerance.test.ts`
  - Updated to inject mock providers via ProviderManager
- `products/stablecoin-gateway/apps/api/tests/services/blockchain-multi-transfer.test.ts`
  - Updated to inject mock providers via ProviderManager

## Key Design Decisions
- Health check via `getBlockNumber()` (lightweight, fast)
- 60-second cooldown for failed providers before retry
- Each network has independent failover state
- Backwards compatible with existing single-value env vars
- Constructor dependency injection for testability

## Environment Variables
- New: `POLYGON_RPC_URLS` (comma-separated, e.g. `url1,url2,url3`)
- New: `ETHEREUM_RPC_URLS` (comma-separated)
- Existing: `POLYGON_RPC_URL` / `ETHEREUM_RPC_URL` still supported

## Test Results
- 45 tests passing across 5 test suites
- 15 new provider-failover tests
- 30 existing tests updated and passing
