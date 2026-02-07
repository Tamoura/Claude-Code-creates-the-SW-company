# Pulse GitHub Data Ingestion (BACKEND-02)

## Branch: feature/pulse/inception

## What We Built
GitHub data ingestion service for the Pulse API:

### Endpoints
1. GET /api/v1/repos - List connected repos (paginated, filterable by syncStatus)
2. GET /api/v1/repos/available - Check GitHub connection (validates token presence)
3. POST /api/v1/repos - Connect a new repository
4. DELETE /api/v1/repos/:id - Disconnect repository (soft delete)
5. GET /api/v1/repos/:id/sync-status - Get sync status for a repo
6. POST /api/v1/webhooks/github - Receive GitHub webhook events

### Module Structure
- `src/modules/repos/` - schemas.ts, service.ts, handlers.ts, routes.ts
- `src/modules/webhooks/` - schemas.ts, service.ts, handlers.ts, routes.ts

### Key Design Decisions
- Service layer handles all DB and business logic
- Handlers only parse requests and call service methods
- Webhook signature verification uses crypto.timingSafeEqual
- Soft-delete for repos (disconnectedAt field)
- Upsert for all webhook-ingested data (idempotent)
- Team membership resolution centralized in RepoService

### Test Results
- 26 new integration tests (19 repos + 7 webhooks)
- All 41 tests pass (15 original + 26 new)
- Tests use real PostgreSQL database (no mocks)

### What's Not Yet Implemented
- GitHub API client integration (Octokit) for listing available repos
- OAuth code-for-token exchange
- Token encryption (AES-256)
- Historical data ingestion (90-day backfill)
- Rate limit checking (X-RateLimit-Remaining header parsing)
- Conditional requests (ETag/If-None-Match)
- deployment_status event handling (acknowledged but not stored)
