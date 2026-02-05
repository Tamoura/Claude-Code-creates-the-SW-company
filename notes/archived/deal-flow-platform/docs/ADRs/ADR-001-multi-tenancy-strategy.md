# ADR-001: Multi-Tenancy Strategy

## Status

Proposed

## Context

DealGate must support white-label deployments for Qatar government entities
(QDB, QFC, QFMA, QSE) and commercial banks. Each tenant operates with its own
branding, feature set, compliance rules, and user base. The multi-tenancy
strategy directly impacts data isolation, operational complexity, cost, and the
ability to serve government data sovereignty requirements.

Key requirements:
- 5-10 tenants in Year 1, growing to ~20 by Year 3
- Each tenant requires data isolation (no cross-tenant data leakage)
- Some tenants (government) may require stricter data residency controls
- Shared codebase -- no code forks per tenant
- Prototype must demonstrate multi-tenant branding switching

## Decision

**Shared-schema multi-tenancy with tenant_id discrimination**, augmented by
per-tenant encryption keys for government tenants requiring enhanced isolation.

Every tenant-scoped table includes a mandatory `tenantId` foreign key. All
queries are automatically filtered by `tenantId` via Prisma middleware. A
small number of tables (AuditLog, SystemConfig) are global/unscoped.

### Implementation Details

1. **Prisma middleware** intercepts all queries and injects `tenantId` filter:
   ```typescript
   prisma.$use(async (params, next) => {
     if (TENANT_SCOPED_MODELS.includes(params.model)) {
       params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
     }
     return next(params);
   });
   ```

2. **Tenant resolution** from request context:
   - Subdomain: `qdb.dealgate.qa` -> tenantId lookup
   - Header: `X-Tenant-ID` for API consumers
   - JWT claim: `tenantId` embedded in access token

3. **Tenant configuration** cached in Redis (5-min TTL):
   - Branding (logo URL, color palette, fonts, custom domain)
   - Feature flags (enabled deal types, integration toggles)
   - Compliance rules (investor classification scheme, KYC thresholds)

4. **Government-tier isolation** (optional per tenant):
   - Per-tenant encryption keys for PII fields
   - Dedicated S3 bucket for document storage
   - Separate audit log partition
   - Option to deploy on Qatar-hosted infrastructure

## Consequences

### Positive

- **Low operational cost**: Single database instance, single deployment
- **Fast tenant onboarding**: New tenant = database rows, not infrastructure
- **Shared improvements**: Bug fixes and features benefit all tenants
- **Prototype-friendly**: Easy to demonstrate branding switching
- **Scalable**: PostgreSQL handles millions of rows efficiently with indexes

### Negative

- **Risk of data leakage**: A bug in the middleware could expose cross-tenant
  data. Mitigated by integration tests validating tenant isolation.
- **Noisy neighbor risk**: One tenant's heavy queries could impact others.
  Mitigated by per-tenant rate limiting and query timeouts.
- **Schema migrations affect all tenants**: Downtime or errors impact everyone.
  Mitigated by zero-downtime migration practices.
- **Government tenants may demand physical isolation**: The government-tier
  isolation option addresses this, but adds operational complexity.

### Neutral

- Query performance is not meaningfully different from single-tenant with
  proper indexing on `tenantId`
- Backup/restore operates on the full database; per-tenant restore requires
  application-level filtering

## Alternatives Considered

### Schema-Per-Tenant (Separate PostgreSQL schemas)

- **Pros**: Stronger isolation; independent migrations; simpler per-tenant
  backup/restore; easier to reason about data boundaries
- **Cons**: Operational complexity grows linearly with tenants; Prisma does not
  natively support dynamic schema switching; connection pool management
  becomes complex; migrations must be applied to every schema
- **Why rejected**: Prisma's lack of native multi-schema support makes this
  significantly more complex. For 5-20 tenants, the operational overhead
  outweighs the isolation benefits. Government-tier isolation addresses the
  strictest requirements without full schema separation.

### Database-Per-Tenant (Separate PostgreSQL instances)

- **Pros**: Maximum isolation; independent scaling; simplest data sovereignty
- **Cons**: Highest operational cost; requires connection management per
  tenant; cross-tenant analytics become complex; significant infrastructure
  overhead for 5-20 tenants
- **Why rejected**: Extreme overkill for the expected tenant count. Cost and
  operational burden are disproportionate. May be revisited if a government
  tenant contractually requires a dedicated database instance.

## References

- Product Concept Section 10.3 (White-Label Architecture)
- Prisma middleware documentation
- PostgreSQL Row-Level Security documentation
