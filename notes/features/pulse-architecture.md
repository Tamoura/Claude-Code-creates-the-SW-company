# Pulse Architecture - Feature Notes

## Task
ARCH-01: Design full system architecture for Pulse.

## Branch
`feature/pulse/inception` (shared with PRD-01)

## Key Decisions

1. **WebSocket**: `@fastify/websocket` (not Socket.io). Native WebSocket protocol, room-based via Redis pub/sub. ~200 bytes per connection overhead.

2. **GitHub Ingestion**: Webhooks + 30-min polling hybrid. Webhooks for real-time, polling as failsafe. ETag conditional requests to minimize rate limit consumption.

3. **Risk Scoring**: Rule-based weighted scoring with 7 factors. No ML for MVP (cold start problem, no training data). Template-based NL explanations. Path to ML in Phase 2 once labeled data exists.

4. **Charts**: Recharts. SVG-based, React composition model, ~45KB gzipped. Best balance of bundle size, accessibility, and DX.

5. **Caching**: Single Redis instance for 4 purposes: metric cache, pub/sub, rate limiting, WS room state. Graceful degradation if Redis unavailable.

## Artifacts Created

- `products/pulse/docs/architecture.md` - Full system architecture with Mermaid diagrams
- `products/pulse/docs/api-schema.yml` - OpenAPI 3.0, all 35 endpoints
- `products/pulse/docs/db-schema.sql` - PostgreSQL DDL, 15 tables, 50+ indexes
- `products/pulse/docs/ADRs/ADR-001-websocket-library.md`
- `products/pulse/docs/ADRs/ADR-002-github-data-ingestion.md`
- `products/pulse/docs/ADRs/ADR-003-sprint-risk-scoring.md`
- `products/pulse/docs/ADRs/ADR-004-chart-library.md`
- `products/pulse/docs/ADRs/ADR-005-realtime-caching-strategy.md`
- `products/pulse/.claude/addendum.md` - Updated with architecture decisions

## Component Registry Reuse

15 components identified for reuse from stablecoin-gateway and invoiceforge. No new generic components to add to registry (all Pulse-specific).

## Open Questions

- Sprint definition: Currently undefined. Teams need a way to mark sprint start/end dates for risk scoring context. Could be manual or imported from Jira/Linear in Phase 2.
- Coverage data source: GitHub Checks API may not have coverage data for all repos. Need graceful fallback UX.
- Push notification infrastructure: Expo push service for MVP. May need direct APNs/FCM integration for higher volume in Phase 2.
