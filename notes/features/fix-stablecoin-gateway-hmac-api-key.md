# HMAC API Key Hashing

## Task
Replace unsalted SHA-256 API key hashing with HMAC-SHA-256 using a server-side secret.

## Why
- Plain SHA-256 is vulnerable to rainbow table attacks
- HMAC-SHA-256 uses a server-side secret, binding the hash to the server
- API keys need fast hash lookups, so bcrypt is inappropriate
- Falls back to plain SHA-256 in dev/test when no secret is set

## Files modified
- crypto.ts -- hashApiKey function
- env-validator.ts -- add HMAC secret validation
- tests/utils/hmac-api-key.test.ts -- new test file
