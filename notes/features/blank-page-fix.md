# Phase 0: Blank Page Bug Fix

## Problem
The frontend app may fail to render (blank page) due to:
1. `Security.tsx` line 30 calls `apiClient.request()` which is `private`
2. `event-source-polyfill` top-level import in `api-client.ts` may fail
3. WalletConnect guard doesn't catch all edge cases

## Fix Plan
1. Add `changePassword()` public method to ApiClient
2. Update Security.tsx to use the public method
3. Move `event-source-polyfill` to dynamic import inside `createEventSource()`
4. Harden WalletConnect guard with try/catch
5. Clean up diagnostic code in index.html

## Branch
`fix/stablecoin-gateway/blank-page`
