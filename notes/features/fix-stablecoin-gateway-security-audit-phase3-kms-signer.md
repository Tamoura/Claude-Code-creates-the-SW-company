# FIX-PHASE3-01: Remove Private Key from Environment Variable, Use KMS

## Problem
`MERCHANT_WALLET_PRIVATE_KEY` is read directly from environment variable in
`blockchain-transaction.service.ts`. Environment variables are logged, exposed
in process lists, and accessible via SSRF on cloud metadata endpoints.

## Solution
Created a `SignerProvider` abstraction layer with two implementations:
- `KMSSignerProvider` - Uses existing `KMSService` for production signing
- `EnvVarSignerProvider` - Falls back to env var in dev only, with warnings

## Key Files
- `apps/api/src/services/kms-signer.service.ts` - New abstraction layer
- `apps/api/src/services/blockchain-transaction.service.ts` - Updated to use SignerProvider
- `apps/api/src/services/kms.service.ts` - Existing KMS service (unchanged)
- `apps/api/tests/services/kms-signer.service.test.ts` - 13 new tests
- `apps/api/tests/services/blockchain-transaction.test.ts` - Updated tests

## Design Decisions
- Existing `KMSService` already handles AWS KMS signing, so KMSSignerProvider wraps it
- `USE_KMS=true` env var controls which provider is used
- Production (`NODE_ENV=production`) blocks raw private key usage
- Private key is never logged (sanitized from all log output)
- `KMSWalletAdapter` wraps KMSService with wallet-like interface
- Wallet initialization is lazy (async) since KMS requires network calls
- NonceManager integration preserved alongside KMS changes

## Test Coverage (26 total tests)
- Factory: 3 tests (USE_KMS routing)
- KMSSignerProvider: 3 tests (creation, missing config, no key leaks)
- EnvVarSignerProvider: 5 tests (prod block, dev warn, test mode, missing key, no key logged)
- Interface compliance: 2 tests
- BlockchainTransactionService: 13 tests (init, validation, network, nonce)

## Acceptance Criteria
- [x] No direct `process.env.MERCHANT_WALLET_PRIVATE_KEY` in blockchain-transaction.service.ts
- [x] KMS abstraction layer created
- [x] Production blocks raw key usage
- [x] Dev allows with warning
- [x] Tests verify both modes (13 tests in kms-signer.service.test.ts)
- [x] .env.example updated with USE_KMS and MERCHANT_WALLET_PRIVATE_KEY
