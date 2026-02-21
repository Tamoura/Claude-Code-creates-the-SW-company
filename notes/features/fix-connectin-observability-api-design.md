# ConnectIn: Observability & API Design Fixes

## Tasks
1. Add Prometheus metrics endpoint (prom-client)
2. Add OpenAPI route schemas (auth + health)
3. Enhanced health check (uptime, version, Redis status)
4. Structured error responses (add `type` field)

## Key Decisions
- Metrics plugin registered early, before routes
- Only auth routes + health get OpenAPI schemas (scope)
- Health check already has DB status; adding uptime + version
- No Redis in the stack currently - report as "not_configured"
- Error `type` field uses URI pattern: https://connectin.dev/errors/{code}

## Files Modified
- `products/connectin/apps/api/src/plugins/metrics.ts` (new)
- `products/connectin/apps/api/src/app.ts`
- `products/connectin/apps/api/src/modules/auth/auth.routes.ts`
- `products/connectin/apps/api/src/modules/health/health.routes.ts`
- `products/connectin/apps/api/src/lib/response.ts`
