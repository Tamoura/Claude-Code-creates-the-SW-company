# ADR-001: Monolith Architecture

**Status**: Accepted
**Date**: 2026-02-12
**Deciders**: Architect
**Product**: RecomEngine

---

## Context

RecomEngine is a B2B SaaS product recommendation orchestrator with multiple subsystems: event ingestion, catalog management, recommendation computation, A/B testing, analytics, and an embeddable SDK. The architecture must support 1,000 concurrent tenants, 10,000 events/second aggregate throughput, and 5,000 recommendation requests/second.

We need to decide whether to build the backend as:
1. A single deployable monolith with internal module boundaries
2. A microservices architecture with independently deployed services
3. A hybrid (monolith for most, separate service for event ingestion or recommendations)

The team is a single development organization (ConnectSW agents), and this is the MVP phase. Time to market and operational simplicity are priorities.

## Decision

We will build RecomEngine as a **modular monolith**: a single Fastify application with clean internal module boundaries, deployed as one process.

The backend is organized into 10 domain modules:
```
apps/api/src/modules/
  auth/           -- Registration, login, JWT
  tenants/        -- CRUD, configuration
  api-keys/       -- Generation, revocation
  events/         -- Ingestion, validation, dedup
  catalog/        -- Product CRUD, batch upload
  recommendations/ -- Strategy execution, caching
  experiments/    -- A/B testing
  analytics/      -- KPI aggregation, time-series
  widgets/        -- Configuration
  health/         -- Readiness/liveness
```

Each module has its own `routes.ts`, `handlers.ts`, `service.ts`, and `schemas.ts`. Modules communicate via direct function calls through service imports -- no message bus, no inter-service HTTP calls.

The application shares a single PostgreSQL database and a single Redis instance. All modules run in the same Node.js process.

## Consequences

### Positive

- **Developer velocity**: No distributed system complexity (no service discovery, no API gateway, no distributed tracing setup). Engineers can change multiple modules in a single commit.
- **Operational simplicity**: One deployment unit, one log stream, one health check. Monitoring and debugging are straightforward.
- **Lower infrastructure cost**: No need for container orchestration (Kubernetes) in the MVP phase. A single server or a few load-balanced instances suffice.
- **Shared database transactions**: Cross-module operations (e.g., creating a tenant with default widget config) can use database transactions without distributed coordination.
- **Consistent ConnectSW patterns**: Other ConnectSW products (stablecoin-gateway, invoiceforge) use the same monolith + Fastify pattern, so there is organizational knowledge and reusable components.
- **Performance**: In-process function calls are nanoseconds, not milliseconds. No serialization overhead between modules.

### Negative

- **Scaling granularity**: Cannot scale event ingestion independently of recommendation serving. If ingestion becomes a bottleneck, we must scale the entire application.
  - **Mitigation**: Horizontal scaling of the stateless API behind a load balancer is sufficient for MVP scale (5,000 req/sec). Module extraction is planned for Phase 2 if needed.
- **Blast radius**: A bug in one module (e.g., analytics) can crash the entire process.
  - **Mitigation**: Process-level isolation via multiple instances behind a load balancer. Health checks restart crashed instances. Fastify's error handling prevents most crashes from propagating.
- **Module coupling risk**: Without discipline, module boundaries may erode over time.
  - **Mitigation**: Strict code review enforcement. Each module has its own service layer -- no direct database access from handlers. Module interfaces are documented.

### Neutral

- The module boundary structure is designed so that individual modules (especially `events/` and `recommendations/`) can be extracted into separate services in the future without changing the database schema or API contract. The Route-Handler-Service pattern makes extraction straightforward.

## Alternatives Considered

### Microservices

**Rejected because**:
- Premature for an MVP with a single development team
- Adds operational overhead: service mesh, distributed tracing, API gateway, container orchestration
- ConnectSW does not currently operate a Kubernetes cluster
- Network latency between services would make the <100ms recommendation target harder to achieve
- The team has production experience with monoliths (stablecoin-gateway, invoiceforge), not microservices

### Hybrid (separate event ingestion service)

**Rejected because**:
- Event ingestion volume at MVP launch (estimated 1,000 events/second) is well within PostgreSQL and a single Fastify instance's capacity
- The added complexity of a separate service with its own deployment pipeline is not justified until ingestion exceeds the monolith's capacity
- If needed, extracting the `events/` module later is straightforward due to the modular structure

## References

- Martin Fowler, "MonolithFirst" (https://martinfowler.com/bliki/MonolithFirst.html)
- ConnectSW Architecture Standards (`.claude/CLAUDE.md`)
- stablecoin-gateway architecture (prior art)
