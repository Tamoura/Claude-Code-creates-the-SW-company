# Pulse Security Critical Fixes

## Branch: feature/pulse/inception

## Fixes Required

### Fix 1: Webhook Signature Verification
- Problem: Using JSON.stringify(request.body) instead of raw body bytes
- Solution: Add rawBody content type parser in app.ts, use in handler

### Fix 2: Webhook Payload Zod Validation
- Problem: request.body cast to `any` with no Zod validation after signature check
- Solution: Add Zod schemas for push, PR, deployment events; validate in handler

### Fix 3: GitHub Token Encryption Integration
- Problem: encryption.ts exists but is never called; tokens stored plaintext
- Solution: Integrate encryptToken/decryptToken into token storage/retrieval

## Baseline: 118 tests passing (8 suites)
