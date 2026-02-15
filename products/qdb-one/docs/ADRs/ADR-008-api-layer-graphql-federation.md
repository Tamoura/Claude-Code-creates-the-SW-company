# ADR-008: API Layer — GraphQL Federation with BFF

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: API Architecture

---

## Context

QDB One needs a unified API that spans data from multiple portal databases while allowing each portal team to own their portion of the schema. The API must support:
- Cross-portal queries (e.g., "show my loans with their linked guarantees")
- Multiple client types (web browser, future mobile app, admin panel) with different payload needs
- Authorization checks on every field
- Real-time detail views from authoritative portal databases
- Pre-computed dashboard views from the Read Store

## Decision

Implement **GraphQL Federation** with **Backend For Frontend (BFF)** pattern:

### GraphQL Federation
- **Apollo Router** (or Cosmo) as the federation gateway, composing subgraphs into a unified schema
- Seven subgraphs, each owned by the team responsible for that domain:
  1. **MPI Subgraph** — Person, Organization, Identity
  2. **Financing Subgraph** — LoanApplication, Loan, Payment (queries financing_core directly)
  3. **Guarantee Subgraph** — Guarantee, Signature, Claim, Collateral (queries guarantee_main directly)
  4. **Advisory Subgraph** — Program, Session, Assessment (queries advisory_main directly)
  5. **Dashboard Subgraph** — DashboardItem, ActivityFeed (reads from Unified Read Store)
  6. **Notification Subgraph** — Notification, NotificationPreference
  7. **Document Subgraph** — Document (proxies to portal document stores and MinIO)

- Cross-portal queries resolved naturally by the gateway's query planner:
  ```graphql
  query { me { organizations { loanApplications { ... } guarantees { ... } } } }
  ```

### BFF Pattern
- **Web BFF** (Next.js API routes): Session management, CSRF protection, response caching, GraphQL aggregation for the browser client
- **Admin BFF** (Node.js + Express): Full data access for internal staff, audit log access, foreign shareholder onboarding
- **Mobile BFF** (future): Payload optimization, push notification tokens, offline sync

### REST APIs (Non-GraphQL Services)
- **Auth API**: Login initiation, NAS callback, QFI login, token refresh, session management
- **MPI Internal API**: Match, link, unlink, golden record CRUD (service-to-service only)
- **Webhook Gateway API**: External webhook ingestion (QFC, MOCI) with HMAC verification
- **Admin System API**: System health, Kafka consumer lag, integration status

### Rate Limiting (via Kong API Gateway)
- Web: 100 req/min per user session
- Mobile: 60 req/min per user session
- Admin: 200 req/min per user session
- External: 30 req/min per API key
- Internal: 1,000 req/min per service identity

## Consequences

### Positive
- Each portal team maintains their own subgraph independently
- Cross-portal queries become natural GraphQL queries (no custom orchestration)
- BFF pattern allows client-specific optimizations (web caching, mobile payload reduction)
- GraphQL inherently supports schema evolution (add fields, deprecate old ones) without versioning
- Single API entry point for frontend (no need to know which portal owns which data)

### Negative
- GraphQL introduces a learning curve for teams familiar with REST only
- Federation gateway is a single point of failure for all API queries (must be highly available)
- N+1 query problems require careful DataLoader implementation in subgraphs
- GraphQL introspection must be disabled in production (security)
- REST APIs still needed for auth, webhooks, and system operations (two API paradigms)

### Risks
- GraphQL Gateway performance under load. **Mitigation**: Deploy 3 replicas; implement query complexity limits; DataLoader pattern in all subgraphs; Redis caching in BFF.
- Subgraph compatibility issues during independent deployments. **Mitigation**: Schema Registry for GraphQL federation; composition validation in CI before deployment.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. REST Gateway (API composition)** | Familiar, simple | Must build custom cross-portal query orchestration; over-fetching for complex views | Too much custom orchestration code |
| **B. GraphQL monolith** | Single schema, no federation complexity | All teams coupled to one codebase; deployment coordination required | Does not support independent team deployment |
| **C. GraphQL Federation** (selected) | Independent subgraphs, natural cross-portal queries, schema evolution | Learning curve, gateway as single point | Best fit for multi-team, multi-portal architecture |
| **D. gRPC** | High performance, strong typing | Poor browser support without translation layer; not suited for flexible queries | Not suitable for web frontend consumption |
