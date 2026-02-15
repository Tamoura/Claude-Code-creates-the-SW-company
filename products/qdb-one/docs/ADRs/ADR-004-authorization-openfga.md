# ADR-004: Authorization — OpenFGA (ReBAC + RBAC Hybrid)

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Authorization

---

## Context

QDB One has a complex authorization landscape:
- The same person holds multiple roles across portals (customer in Financing, stakeholder in Advisory, authorized signatory in Guarantees)
- A person may act on behalf of multiple organizations
- Permissions depend on the relationship between person, organization, and resource
- Delegation chains exist (CEO delegates signing authority to CFO)
- Time-bound temporary delegations are required (acting authority during vacation)
- Organizational hierarchy affects access (parent company reps can view subsidiary data)

Traditional RBAC cannot model these relationships without an explosion of role combinations.

## Decision

Implement a **hybrid ReBAC + RBAC** authorization model using **OpenFGA** (CNCF project, open-source Zanzibar implementation):

1. **ReBAC for relationships**: Person-Organization-Role relationships are modeled as a graph. Authorization checks traverse the graph (e.g., "Can Fatima sign guarantee GR-789?" resolves through beneficiary_org -> authorized_signatory).

2. **RBAC for simple portal access**: Portal-level permissions (e.g., "can access Admin panel") use straightforward role assignments within the same OpenFGA model.

3. **Delegation via tuples**: Direct delegation (CEO grants CFO signing authority) is a relationship tuple with optional time bounds and audit reference.

4. **Authorization sync**: When MPI updates person-org-role relationships, the AuthZ Sync service writes corresponding tuples to OpenFGA.

5. **Every API endpoint checks OpenFGA**: No endpoint returns data without a relationship check.

6. **OPA alongside** (future): Open Policy Agent for cross-cutting policies (e.g., "no operations outside business hours") if needed. OPA complements ReBAC, not replaces it.

## Consequences

### Positive
- Natural fit for QDB's person-organization-role model
- Delegation and acting-on-behalf patterns are first-class citizens
- Single authorization engine for all portals (no per-portal role tables)
- OpenFGA is open-source (Apache 2.0) with CNCF backing
- Authorization decisions are auditable (tuple queries have logs)
- Company context switching is a simple change of active organization in the query

### Negative
- Newer paradigm — development team must learn ReBAC concepts
- OpenFGA becomes a critical dependency (must be highly available)
- Must model all cross-portal relationships correctly in the schema upfront
- Authorization checks add latency to every API call (mitigated by Redis caching)
- Debugging authorization failures requires understanding the relationship graph

### Risks
- OpenFGA performance under load. **Mitigation**: Deploy in clustered mode (3 replicas); cache hot authorization paths in Redis; load test with projected concurrent sessions (5,000+).
- Incorrect modeling leads to unauthorized access or over-restriction. **Mitigation**: Comprehensive authorization test suite; review model with security engineer before deployment.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. RBAC per portal** | Simple, familiar | Cannot model cross-portal identity; user manages multiple role sets | Does not solve the problem |
| **B. Unified RBAC** | Single source of truth | No relationship context; cannot model "why does this person have this role?" | Too flat for QDB's needs |
| **C. ABAC (OPA only)** | Flexible, context-aware | Complex policy authoring, hard to debug, no relationship graph | Relationships are the core model |
| **D. ReBAC only (SpiceDB)** | Mature Zanzibar implementation | Commercial licensing for enterprise features | OpenFGA preferred for open-source licensing |
| **E. Hybrid ReBAC + RBAC via OpenFGA** (selected) | Best of both; handles delegation naturally | Learning curve, newer project | Best fit for QDB's relationship-based authorization |
