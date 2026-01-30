# SEC-013: JWT Secret Entropy Validation

## Problem
The JWT_SECRET validation in `env-validator.ts` checks minimum length (32 chars)
and rejects known defaults, but does not check entropy. A low-entropy secret like
`"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"` (34 a's) passes validation despite being
trivially guessable.

## Solution
Add Shannon entropy calculation to JWT_SECRET validation:
- `calculateShannonEntropy(str)` function exported for testing
- Minimum threshold: 3.0 bits per character
- Minimum unique characters: 16
- Production: throw on failure
- Development: warn only

## Files Modified
- `apps/api/src/utils/env-validator.ts` - Add entropy validation
- `apps/api/tests/utils/jwt-secret-entropy.test.ts` - New test file

## TDD Steps
1. RED: Write failing entropy tests
2. GREEN: Implement calculateShannonEntropy + validation
3. REFACTOR: Clean up if needed
