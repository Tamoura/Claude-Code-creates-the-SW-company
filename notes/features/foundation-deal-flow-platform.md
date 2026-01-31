# Foundation: Deal Flow Platform (DealGate)

## Task: ARCH-01 -- System Architecture Design

**Branch**: foundation/deal-flow-platform
**Status**: Complete
**Date**: 2026-01-31

## Key Architectural Decisions

### 1. Multi-Tenancy: Shared-Schema with tenant_id (ADR-001)

Chose shared-schema over schema-per-tenant or database-per-tenant.
- Prisma middleware injects tenantId filter on all queries
- Government-tier isolation available via per-tenant encryption keys
- Tenants resolved from subdomain or X-Tenant-ID header
- Rationale: Prisma lacks native multi-schema support; 5-20 tenants does
  not justify the operational overhead of separate schemas/databases

### 2. Integration Hub: Adapter Pattern + BullMQ (ADR-002)

Chose adapter pattern with BullMQ event bus over full message broker or
API gateway proxy.
- Each external system has a dedicated adapter implementing IntegrationAdapter
- Domain events trigger adapter calls via BullMQ job queues
- Stub adapters for prototype; swap for live adapters per tenant
- Rationale: Monolithic Fastify app does not need RabbitMQ/NATS complexity;
  BullMQ on Redis (already in stack) is sufficient

### 3. Internationalization: next-intl (ADR-003)

Chose next-intl over react-i18next or custom solution.
- RSC-compatible (designed for Next.js App Router)
- ICU message format (critical for Arabic's 6 plural forms)
- URL-based locale routing (/en/deals, /ar/deals)
- RTL via Tailwind CSS rtl: variant
- Rationale: react-i18next requires client component wrappers in App Router

## Deliverables

1. `docs/ARCHITECTURE.md` -- System overview, components, data, auth, i18n
2. `docs/ARCHITECTURE-PART2.md` -- API, tenancy, integration, events,
   security, scalability, deployment
3. `docs/ADRs/ADR-001-multi-tenancy-strategy.md`
4. `docs/ADRs/ADR-002-integration-hub-pattern.md`
5. `docs/ADRs/ADR-003-internationalization-approach.md`
6. `docs/API.md` -- v1 route outline (all endpoints)
7. `apps/api/prisma/schema.prisma` -- Full Prisma schema (20 models)

## Schema Summary (20 models)

- Tenant, TenantConfig, TenantBranding (multi-tenancy)
- User, RefreshToken (auth)
- InvestorProfile, IssuerProfile (user types)
- Deal, DealDocument (offerings)
- Subscription (investment lifecycle)
- PortfolioItem (holdings)
- WatchlistItem (investor interest)
- Notification, NotificationPreference (alerts)
- AuditLog (compliance)
- IntegrationConfig, WebhookEndpoint (integrations)

## Open Questions / Risks

1. **Prisma middleware performance**: Need to benchmark tenant_id filtering
   middleware at scale. If it becomes a bottleneck, consider Prisma client
   extensions or PostgreSQL Row-Level Security policies.

2. **Arabic search**: PostgreSQL full-text search has limited Arabic stemming.
   May need Elasticsearch sooner than planned if Arabic search quality is
   poor in the prototype.

3. **Government data sovereignty**: Some government tenants may contractually
   require a dedicated database instance. The architecture supports this
   as a future option but it is not implemented in the prototype.

4. **PDPPL payment data residency**: Payment data must be stored in Qatar.
   AWS Bahrain (me-south-1) is close but not Qatar. May need Qatar-hosted
   infrastructure for payment-specific data.

5. **Hijri calendar**: Intl.DateTimeFormat supports Hijri via
   ar-SA-u-ca-islamic locale, but rendering quality varies by browser.
   Need to verify behavior and consider a polyfill.
