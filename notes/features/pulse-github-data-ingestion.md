# Pulse GitHub Data Ingestion (BACKEND-02)

## Branch: feature/pulse/inception

## What We're Building
GitHub data ingestion service for the Pulse API with:
1. GitHub OAuth callback handler (exchange code for access token, encrypt and store)
2. Repository listing endpoint - GET /api/v1/repos
3. Available repos endpoint - GET /api/v1/repos/available
4. Connect repo endpoint - POST /api/v1/repos/:id/connect
5. Disconnect repo endpoint - DELETE /api/v1/repos/:id
6. Webhook receiver - POST /api/v1/webhooks/github
7. GitHub API rate limit handling
8. Sync status endpoint - GET /api/v1/repos/:id/sync-status

## Module Structure
- `products/pulse/apps/api/src/modules/repos/` - routes.ts, handlers.ts, service.ts, schemas.ts
- `products/pulse/apps/api/src/modules/webhooks/` - routes.ts, handlers.ts, service.ts

## Key Business Rules
- GitHub API rate budget: <=80% of 5000 req/hour
- Conditional requests (ETag/If-None-Match) to save quota
- Webhook events: push, pull_request, deployment, deployment_status
- Webhook signature verification: HMAC SHA-256
- Historical data: fetch last 90 days, most recent 30 days first
- Track per-repo ingestion progress with percentage
- GitHub OAuth tokens encrypted at rest (AES-256)

## Architecture Decisions
- Service layer handles all GitHub API interaction
- Handlers parse/validate requests and call service
- Routes wire handlers to Fastify endpoints
- Schemas define Zod validation for all inputs/outputs
- Integration tests use real DB, no mocks (for DB)
- GitHub API calls need to be abstracted for testability

## Test Strategy
- Integration tests against real PostgreSQL database
- GitHub API interactions stubbed at the HTTP level in tests
- Test webhook signature verification with real HMAC
- Test OAuth code exchange flow
- Test CRUD operations on repositories
- Test rate limit handling logic

## Progress
- [x] Existing tests pass (15/15)
- [x] Packages installed (@octokit/rest, @octokit/webhooks)
- [ ] Schemas (Zod validation)
- [ ] Service layer
- [ ] Handlers
- [ ] Routes
- [ ] Webhook module
- [ ] Integration tests (target: 10+)
