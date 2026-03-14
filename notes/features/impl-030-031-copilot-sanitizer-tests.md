# IMPL-030 & IMPL-031: Copilot Runtime + Data Sanitizer Tests

## Status: Red Phase Complete

## What was done

### IMPL-031: tests/unit/sanitizer.test.ts (11 tests)
- DataSanitizer.sanitize(): email, phone, SSN, API keys, credit cards, dollar amounts, context preservation, no-PII passthrough, empty/null input
- DataSanitizer.detectPII(): detection with type/value/position, multiple PII types in same text
- Pure unit tests, no external dependencies needed
- Fails because `src/services/data-sanitizer.ts` does not exist yet

### IMPL-030: tests/integration/copilot.test.ts (5 tests)
- POST /api/v1/copilot/run: streaming response, auth required, AI disclaimer, empty message 400, rate limit 429
- Integration tests using app.inject() with authenticated requests
- Fails because copilot routes are not registered in app.ts yet (404)

## Test counts
- Existing: 63 passing (unchanged)
- New: 16 failing (11 sanitizer + 5 copilot)
- Total: 88 (63 pass + 25 fail -- note: copilot test file has some cascading failures from the auth stub)

## Green phase requirements
- Create `src/services/data-sanitizer.ts` with DataSanitizer class
- Create copilot routes at POST /api/v1/copilot/run
- Register copilot routes in app.ts
- Wire up authentication on copilot endpoint
- Add LLM rate limit config (20/min) for copilot routes
