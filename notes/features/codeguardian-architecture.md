# CodeGuardian Architecture Design Notes

**Branch**: feature/codeguardian/architecture
**Task**: ARCH-01
**Started**: 2026-02-18

## Key Design Decisions

### Multi-Model Routing
- Route security/logic/performance/style to different AI models in parallel
- Primary + fallback model per check type with configurable timeouts
- BullMQ workers process review jobs asynchronously from Redis queue

### GitHub Integration
- GitHub App (not just OAuth App) for webhook access and review posting
- GitHub OAuth 2.0 with PKCE for user authentication
- Both needed: App for webhooks/reviews, OAuth for user identity

### Async Pipeline
- Webhook endpoint acknowledges immediately (< 500ms)
- Job enqueued in Redis via BullMQ
- Workers process: extract diff -> route to models -> aggregate -> score -> post
- Status polling from dashboard (no WebSocket needed for MVP)

### Scoring
- Weighted categories: Security 35%, Logic 30%, Performance 20%, Style 15%
- Deductions: Critical -25, High -15, Medium -8, Low -3
- Floor at 0 per category

### Reusable Components from Registry
- `@connectsw/shared` for Logger, Crypto, Prisma/Redis plugins
- `@connectsw/billing` for subscription tiers and usage metering
- `@connectsw/audit` for audit logging
- `@connectsw/notifications` for email notifications
- Encryption utils for token storage at rest

## Files Created
- docs/architecture.md
- docs/api-contract.yaml
- docs/db-schema.sql
- docs/ADRs/ADR-001-multi-model-routing.md
- docs/ADRs/ADR-002-async-review-pipeline.md
- docs/ADRs/ADR-003-github-integration.md
- docs/ADRs/ADR-004-scoring-algorithm.md
- .claude/addendum.md (updated)
