# Remaining Security Findings — Stablecoin Gateway

Branch: `fix/stablecoin-gateway/remaining-security-findings`

## Findings

| # | Severity | Summary | File(s) |
|---|----------|---------|---------|
| 1 | Medium | Refund GET endpoints use `read` instead of `refund` permission | routes/v1/refunds.ts |
| 2 | Low | Logout endpoint has no Zod body validation | routes/v1/auth.ts, utils/validation.ts |
| 3 | Low | Logger does not auto-redact PII keys | utils/logger.ts |
| 4 | Medium | CORS allows null origin with credentials in production | app.ts |
| 5 | Medium | Webhook encryption optional at startup in production | index.ts |

## Progress

- [ ] Finding 1: Refund permissions
- [ ] Finding 2: Logout validation
- [ ] Finding 3: Logger redaction
- [ ] Finding 4: CORS null origin
- [ ] Finding 5: Webhook encryption startup
- [ ] Full suite verification
- [ ] PR created
