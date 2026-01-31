# Remaining Security Findings — Stablecoin Gateway

Branch: `fix/stablecoin-gateway/remaining-security-findings`

## Findings

| # | Severity | Summary | File(s) | Tests |
|---|----------|---------|---------|-------|
| 1 | Medium | Refund GET endpoints required `read` not `refund` | routes/v1/refunds.ts | 5 |
| 2 | Low | Logout had no Zod body validation | routes/v1/auth.ts, utils/validation.ts | 4 |
| 3 | Low | Logger did not redact PII keys | utils/logger.ts | 8 |
| 4 | Medium | CORS allowed null origin with credentials in prod | app.ts | 4 |
| 5 | Medium | Webhook encryption optional in production | index.ts, utils/startup-checks.ts | 3 |

## Progress

- [x] Finding 1: Refund permissions
- [x] Finding 2: Logout validation
- [x] Finding 3: Logger redaction
- [x] Finding 4: CORS null origin
- [x] Finding 5: Webhook encryption startup
- [x] Full suite verification (24/24 new tests passing)
- [x] PR created
