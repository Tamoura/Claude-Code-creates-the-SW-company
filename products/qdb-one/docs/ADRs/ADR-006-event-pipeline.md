# ADR-006: Event Pipeline Architecture — Kafka + Debezium CDC

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Data Integration

---

## Context

QDB One needs to synchronize data from 10+ databases (Oracle and PostgreSQL) across three portal groups into a Unified Read Store, OpenSearch index, and MPI golden records. The data must flow in near real-time (< 5 seconds for identity, < 30 seconds for operational data) to support the unified dashboard and notification system.

Portal codebases are all in-house (full source access), which gives us two integration options: modify portal code to publish events, or capture database-level changes via CDC.

## Decision

Implement a **dual-channel event pipeline** using **Apache Kafka** as the event mesh and **Debezium** for Change Data Capture:

### Channel 1: CDC (Debezium)
- Captures database-level changes (INSERT/UPDATE/DELETE) by reading transaction logs
- Used for **Tier 1 (Identity)** databases — catches every change including direct SQL, batch jobs, stored procedures
- Debezium connectors: Oracle (LogMiner) for financing_core, guarantee_main, guarantee_claims, corporate_crm; PostgreSQL (pgoutput) for advisory_main, advisory_assess
- Topics follow naming: `cdc.{database}.{table}`

### Channel 2: Application Events
- Portal code modified to publish domain events to Kafka when business operations occur
- Used for **Tier 2 (Operational)** databases — events carry business meaning ("LoanApproved", not "row updated")
- Topics follow naming: `app.{portal}.{entity}-{action}`

### Dual-Write Strategy
- Tier 1 databases: CDC (catch everything) + application events (business context)
- Tier 2 databases: Application events (preferred) + CDC (safety net)
- Tier 3 databases: API on-demand (no streaming)
- Tier 4 databases: Batch sync (scheduled)

### Stream Processors
Four consumer groups process events:
1. **MPI Enrichment Service** — CDC identity events to MPI golden record updates
2. **Dashboard Projection Service** — App events to Unified Read Store materialized views
3. **Search Indexer** — All events to OpenSearch index
4. **Notification Router** — App events to user notifications

### Schema Management
- Confluent Schema Registry (or Apicurio) for event schema versioning
- Event envelope includes `schemaVersion` for compatibility
- CDC column mapping via YAML configuration (no code changes for schema drift)

## Consequences

### Positive
- CDC catches all changes including direct SQL and stored procedures — nothing falls through the cracks
- Application events provide business-meaningful context for dashboards and notifications
- Kafka provides durable, ordered, replayable event log — can rebuild any downstream store
- At-least-once delivery with idempotent consumers — no data loss
- Schema Registry prevents breaking consumer changes
- Each consumer group scales independently based on load

### Negative
- Two event channels (CDC + app events) increase operational complexity
- CDC events are row-level (require transformation to business meaning)
- Oracle LogMiner requires ARCHIVELOG mode and supplemental logging (DBA involvement)
- Event pipeline introduces eventual consistency (dashboard may lag behind portal DBs)
- Dead letter queues require monitoring and manual remediation

### Risks
- Oracle CDC requires complex configuration. **Mitigation**: Engage Oracle DBA early; run Debezium Oracle connector PoC in Phase 0 month 1; have application-level events as fallback.
- Kafka consumer lag causes stale data. **Mitigation**: Monitor lag with P2 alerting (> 1,000 events for 10 minutes); auto-scale consumers; implement replay capability from offsets.
- Schema evolution breaks CDC pipeline. **Mitigation**: Config-based column mapping (YAML); schema drift monitoring; new fields go to JSONB metadata.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Application events only** | Clean business events, no DB dependency | Misses direct SQL changes, requires code changes in every portal | Insufficient for Tier 1 identity tables |
| **B. CDC only** | Catches everything, no portal code changes | Events are row-level (not business-meaningful), transformation overhead | Insufficient business context for notifications |
| **C. Dual-channel (CDC + App events)** (selected) | Best coverage: catches everything + business context | Operational complexity of two channels | Best fit for QDB's mixed database landscape |
| **D. ETL/batch sync** | Simple, well-understood | Too slow for real-time dashboard (minutes/hours vs. seconds) | Does not meet latency requirements |
| **E. Direct API polling** | Simple to implement | Expensive (polling overhead), misses interim state changes | Does not scale to 10+ databases |
