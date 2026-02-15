# ADR-003: Data Access — CQRS + GraphQL Federation Hybrid

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Data Architecture

---

## Context

QDB One must present a unified dashboard showing data from 10+ databases across three portal groups (Financing, Advisory, Guarantees) plus corporate and reference databases. The databases use mixed engines (Oracle, PostgreSQL) and were never designed for cross-portal queries.

We need a strategy that provides fast dashboard load times (< 3 seconds, 95th percentile), resilience when individual portal databases are unavailable, and real-time detail views for write operations.

## Decision

Implement a **hybrid CQRS + GraphQL Federation** approach:

### Read Path (Dashboard, Search, Notifications)
- **CQRS with event-driven materialized views**: Portal databases publish events (CDC for Tier 1, application events for Tier 2) to Kafka. Stream processors (Dashboard Projection, Search Indexer, Notification Router) consume events and write to a **Unified Read Store** (PostgreSQL 16) and **OpenSearch** index.
- The Read Store contains only cross-portal views needed for the dashboard: `person_summary`, `dashboard_item`, `activity_feed`, `notification`. Portal-specific data goes in JSONB metadata fields.
- Dashboard subgraph queries the Read Store for fast, pre-computed responses.

### Write Path (Detail Views, Mutations)
- **GraphQL Federation**: Each portal has a subgraph that queries its authoritative database directly. Writes (loan submission, guarantee signing) go to the portal database and publish events to Kafka.
- The GraphQL Gateway (Apollo Router / Cosmo) composes subgraphs into a unified schema.
- Cross-portal queries ("show me the guarantee linked to this loan") are resolved by the Gateway's query planner across subgraphs.

### Tiered Database Integration
- **Tier 1 (Identity)**: CDC via Debezium, < 5 second sync
- **Tier 2 (Operational)**: Application events via Kafka, < 30 second sync
- **Tier 3 (Supporting)**: API on-demand queries via subgraphs
- **Tier 4 (Reference)**: Batch sync (daily/hourly)

## Consequences

### Positive
- Dashboard loads from pre-computed views — fast and resilient to individual portal outages
- Detail views query authoritative portal databases — always real-time for critical data
- Portal databases remain independent — no premature consolidation
- JSONB metadata in Read Store allows portal-specific fields without schema migrations
- Event pipeline is replayable — can rebuild Read Store from Kafka offsets

### Negative
- Dashboard data is eventually consistent (typically < 5 seconds for Tier 1, < 30 seconds for Tier 2)
- Must build and maintain event pipeline (Kafka + Debezium + projection services)
- Must handle projection failures gracefully (stale data flagged with "Last updated" timestamp)
- Must version event schemas as portal databases evolve
- Two query paths (read store vs. direct) add complexity

### Risks
- Kafka consumer lag causes stale dashboard data. **Mitigation**: Monitor consumer lag with alerting (P2 alert if > 1,000 events for 10 minutes); auto-scale consumers; implement replay capability.
- Schema evolution in portal databases breaks CDC pipeline. **Mitigation**: Config-based column mapping (YAML); monitor for schema drift; new portal fields go to JSONB metadata.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Database consolidation** | Single query model | Extremely high risk, breaks existing apps, years of effort | Unacceptable risk and timeline |
| **B. Direct cross-DB queries** | Simple initially | Tight coupling, N+1 queries, all portals must be online | Dashboard fails when any portal DB is down |
| **C. CQRS only** | Fast dashboards | No real-time detail views | Need authoritative data for write operations |
| **D. GraphQL Federation only** | Real-time everything | Slow dashboard aggregations, all portals must be online | Does not meet < 3 second dashboard requirement |
| **E. Hybrid C+D** (selected) | Best of both: fast dashboards + real-time detail | Eventually consistent dashboards, pipeline complexity | Best fit for QDB's requirements |
