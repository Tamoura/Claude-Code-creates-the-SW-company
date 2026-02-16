# ADR-007: Unified Read Store — PostgreSQL + OpenSearch

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Data Architecture

---

## Context

The unified dashboard must load in under 3 seconds (95th percentile) and remain functional even when individual portal databases are temporarily unavailable. Cross-portal search must return results within 1 second with support for Arabic text including transliteration variants.

Querying 10+ portal databases directly at dashboard render time would be too slow and too fragile (any portal DB outage would break the dashboard).

## Decision

Build a **Unified Read Store** as a thin projection layer using two technologies:

### PostgreSQL 16 (Dashboard and Notification Data)
- Stores pre-computed materialized views: `person_summary`, `organization_summary`, `dashboard_item`, `activity_feed`, `notification`, `notification_preference`
- Uses **JSONB for portal-specific metadata** in `dashboard_item.metadata` — each portal can add its own fields without requiring schema migrations
- Core columns (`status`, `amount`, `due_date`, `requires_action`) are normalized across all portals for uniform sorting and filtering
- Written by Dashboard Projection Service and Notification Router (Kafka consumers)
- Read by Dashboard Subgraph and Notification Subgraph

### OpenSearch 2.x (Full-Text Search)
- Full-text search index across all portal entities (companies, applications, guarantees, sessions, documents)
- **Arabic analyzer** with custom transliteration normalization for name matching
- Written by Search Indexer (Kafka consumer)
- Read by Search Subgraph (queries via REST API)

### What Does NOT Go in the Read Store
- Full document content (PDFs, images) — stored in MinIO
- Complete loan amortization schedules — queried from financing_core on demand
- Detailed assessment reports — queried from advisory_assess on demand
- Historical audit logs — queried from audit DB on demand
- Employee/HR data — not customer-facing
- The Read Store is a thin projection: just enough for dashboard cards, search results, and notification routing. Detail views query portal DBs directly via GraphQL subgraphs.

### Idempotency
- Each projection table includes a `projection_version` column (monotonically increasing)
- Consumers use event IDs and projection versions to handle duplicate events without data corruption (at-least-once delivery guarantee)

## Consequences

### Positive
- Dashboard queries hit a single PostgreSQL database — fast (sub-100ms for typical queries)
- Dashboard renders with stale data if portal DBs are down (with "Last updated" indicator)
- JSONB metadata allows portal-specific fields without schema migrations
- OpenSearch provides Arabic-aware full-text search out of the box
- Read Store can be rebuilt from Kafka event replay if corrupted

### Negative
- Dashboard data is eventually consistent (< 5s for identity, < 30s for operational)
- Requires ongoing synchronization (projection services must be reliable)
- Two stores to maintain (PostgreSQL for structured data, OpenSearch for search)
- Nightly reconciliation job needed to detect and fix any drift between Read Store and portal source databases

### Risks
- Data inconsistency between Read Store and portal databases. **Mitigation**: Nightly reconciliation job compares Read Store with source-of-truth; discrepancies flagged for investigation; "Last updated" timestamp on all dashboard cards.
- Read Store grows too large. **Mitigation**: Only cross-portal views are stored (thin projection); older activity_feed entries archived after 12 months; notifications archived after read + 90 days.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Query portal DBs directly** | Always real-time, no sync needed | Too slow for dashboard (10+ DB queries), fragile (any DB down = dashboard down) | Does not meet performance or resilience requirements |
| **B. PostgreSQL only** | Single technology for both structured data and search | PostgreSQL full-text search is limited for Arabic | Insufficient Arabic search capability |
| **C. OpenSearch only** | Excellent search, handles structured data too | Not ideal for relational dashboard queries (joins, aggregations) | Dashboard queries are naturally relational |
| **D. PostgreSQL + OpenSearch** (selected) | PostgreSQL for structured dashboard data, OpenSearch for full-text search | Two stores to maintain | Best fit: each technology used for its strength |
| **E. Materialized views in portal DBs** | No additional infrastructure | Cross-portal views are impossible within a single portal DB | Fundamental architectural mismatch |
