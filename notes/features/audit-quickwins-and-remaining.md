# Audit Quick Wins & Remaining Fixes

**Branch**: `fix/stablecoin-gateway/audit-quickwins-and-remaining`
**Date**: 2026-01-30

## Fixes Implemented

1. **Pagination on list queries** - Added take/skip to GET /v1/api-keys and GET /v1/webhooks with limit (default 50, max 100) and offset params
2. **refund.processing in WebhookEventType** - Added to union type and both Zod webhook schemas
3. **Circuit breaker atomicity** - Replaced non-atomic incr+check+set with Redis Lua script, with fallback
4. **Transfer sender validation** - blockchain-monitor validates sender against customerAddress when available
5. **HMAC-SHA-256 for API keys** - Replaced plain SHA-256 with HMAC using API_KEY_HMAC_SECRET env var
6. **Decimal precision** - Migrated from Decimal(10,2) to Decimal(18,6) for payment and refund amounts
7. **Deploy pre-flight tests** - Added test gate before Docker build/push in deploy-production.yml

## Also Created

- `/audit` command for on-demand product audits via Code Reviewer agent
