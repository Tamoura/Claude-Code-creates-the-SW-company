# Sender Validation for Blockchain Monitor

## Summary

Add transfer sender validation to `blockchain-monitor.service.ts`.
Currently it extracts the sender from transfer events but never validates
it against the expected customer wallet address.

## Changes

1. Add optional `customerAddress` field to `PaymentSessionForVerification`
   interface (backwards compatible).
2. After finding the matching transfer, if `customerAddress` is set on the
   session, validate that `fromAddress` matches it (case-insensitive).
3. If sender does not match, log a warning and return `valid: false` with
   a descriptive error.
4. If `customerAddress` is not set, skip the check entirely (soft
   validation / backwards compatible).

## Test Cases

- Payment with matching sender address is valid
- Payment with mismatched sender returns valid:false with sender mismatch
- Payment without customerAddress skips sender check
- Sender comparison is case-insensitive

## File Locations

- Service: `products/stablecoin-gateway/apps/api/src/services/blockchain-monitor.service.ts`
- New test: `products/stablecoin-gateway/apps/api/tests/services/sender-validation.test.ts`
