# ADR-005: Multi-Tenancy and Data Isolation

## Status

Accepted

## Context

Mu'aththir stores sensitive child development data (observations, milestones, medical notes). Data isolation between families is a critical security and privacy requirement:

- **COPPA**: Children's data must be protected regardless of jurisdiction (NFR-033)
- **GDPR**: Parents must be able to export and delete all their data (FR-048, FR-049)
- **Trust**: Parents sharing intimate developmental observations must trust that no other parent can access their data
- **Phase 2**: Family sharing (FR-050-052) must be possible without compromising isolation

The key question: how to enforce that Parent A can never access Parent B's children, observations, or milestones.

### Before (No Isolation)

```mermaid
graph TD
    ParentA["Parent A"] -->|"GET /api/children/child-B-id"| API
    API -->|"SELECT * FROM children<br/>WHERE id = child-B-id"| DB
    DB -->|"Returns Parent B's child!"| API

    style DB fill:#EF4444,stroke:#B91C1C,color:#fff
```

### After (Ownership Filter)

```mermaid
graph TD
    ParentA["Parent A"] -->|"GET /api/children/child-B-id"| API
    API -->|"Extract parentId from JWT"| JWT["JWT: {sub: parentA-id}"]
    JWT -->|"SELECT * FROM children<br/>WHERE id = child-B-id<br/>AND parent_id = parentA-id"| DB
    DB -->|"Returns empty (404)"| API

    style DB fill:#10B981,stroke:#065F46,color:#fff
    style JWT fill:#3B82F6,stroke:#1E40AF,color:#fff
```

## Decision

Use **application-level row ownership filtering** (single-database, shared schema) where every query includes the authenticated `parentId` as a filter.

### Implementation Pattern

Every service method receives `parentId` from the JWT and includes it in every database query:

```typescript
// Service layer - EVERY method follows this pattern
class ChildrenService {
  async getChild(childId: string, parentId: string) {
    const child = await prisma.child.findFirst({
      where: { id: childId, parentId }  // BOLA prevention
    });
    if (!child) throw new NotFoundError('Child not found');
    return child;
  }

  async getObservations(childId: string, parentId: string, filters: Filters) {
    // First verify child ownership
    await this.getChild(childId, parentId);
    // Then query observations (child_id is FK, so ownership is transitive)
    return prisma.observation.findMany({
      where: { childId, deletedAt: null, ...filters }
    });
  }
}
```

### Ownership Chain

```mermaid
graph TD
    Parent["Parent (JWT sub)"]
    Child["Child (parent_id FK)"]
    Observation["Observation (child_id FK)"]
    Milestone["ChildMilestone (child_id FK)"]
    Score["ScoreCache (child_id FK)"]
    Session["Session (parent_id FK)"]

    Parent -->|"Direct ownership"| Child
    Parent -->|"Direct ownership"| Session
    Child -->|"Transitive ownership"| Observation
    Child -->|"Transitive ownership"| Milestone
    Child -->|"Transitive ownership"| Score

    style Parent fill:#3B82F6,stroke:#1E40AF,color:#fff
```

All ownership flows through `Parent -> Child`. Observations, milestones, and scores are owned transitively through the child's `parentId`. Every query that accesses child-owned data first verifies the child belongs to the requesting parent.

### Enforcement Layers

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Route** | `request.currentUser.id` from JWT | Extract authenticated parentId |
| **Handler** | Pass parentId to service methods | Ensure parentId reaches every query |
| **Service** | `WHERE parentId = ?` on every query | BOLA prevention |
| **Database** | `ON DELETE CASCADE` on foreign keys | Cascading deletion on account delete |
| **Test** | Integration tests verify cross-tenant isolation | Catch regressions |

### Phase 2: Family Sharing

The `FamilyAccess` table enables controlled data sharing without breaking isolation:

```mermaid
graph TD
    ParentA["Parent A (owner)"] -->|"Creates FamilyAccess"| FA["FamilyAccess<br/>invitee: parentB-email<br/>role: viewer<br/>childIds: [child-1, child-3]"]
    ParentB["Parent B (invitee)"] -->|"Accepts invitation"| FA
    FA -->|"Query: WHERE child_id IN<br/>childIds AND parentId = ownerA"| Child1["Child 1"]
    FA -->|"No access"| Child2["Child 2"]
    FA -->|"Query: WHERE child_id IN<br/>childIds AND parentId = ownerA"| Child3["Child 3"]

    style FA fill:#F59E0B,stroke:#B45309,color:#fff
```

Shared access is additive (invitee gets READ or READ+WRITE on specific children) and never modifies the ownership model. The owner's `parentId` still gates all queries.

## Consequences

### Positive

- **Simple**: No per-tenant database, no schema isolation overhead
- **GDPR-friendly**: `DELETE FROM parents WHERE id = X` cascades to all child data
- **Export-friendly**: `SELECT * FROM children WHERE parent_id = X` gets everything
- **Testable**: Integration tests can create two parents and verify cross-tenant isolation
- **Phase 2 ready**: FamilyAccess model enables sharing without changing the ownership model

### Negative

- **Developer discipline required**: Every new service method must include parentId filter. A missing filter is a data breach.
- **No database-level enforcement**: PostgreSQL Row-Level Security (RLS) would provide stronger guarantees but adds complexity.
- **Performance**: Additional WHERE clause on every query (negligible with indexed parentId column).

### Neutral

- All `children.parent_id` queries are indexed, so the filter adds no measurable overhead.
- Cascading deletes simplify account deletion but require careful testing.

## Alternatives Considered

### Alternative 1: PostgreSQL Row-Level Security (RLS)

```sql
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
CREATE POLICY parent_isolation ON children
  USING (parent_id = current_setting('app.current_parent_id'));
```

- **Pros**: Database-level enforcement, impossible to bypass in application code
- **Cons**: Requires setting session variable per request, complicates Prisma usage, harder to debug, connection pooling complications (PgBouncer)
- **Why rejected**: Prisma does not natively support RLS session variables. Would require raw SQL for every connection setup, losing type safety. Application-level filtering with integration tests is sufficient for MVP scale.

### Alternative 2: Separate Database Per Tenant

- **Pros**: Strongest isolation, easy GDPR compliance (drop database)
- **Cons**: Operational nightmare at scale, expensive, complex connection management, no cross-tenant queries for analytics
- **Why rejected**: Massive over-engineering for a consumer product. Muaththir will have thousands of parents, not enterprise tenants.

### Alternative 3: Schema-Per-Tenant

- **Pros**: Good isolation, single database, easier than separate DBs
- **Cons**: Schema migrations multiply by tenant count, connection pooling issues, Prisma does not support dynamic schemas
- **Why rejected**: Same issues as separate databases, slightly less severe. Still massive overkill.

## References

- OWASP API Security: BOLA (Broken Object Level Authorization) - #1 API vulnerability
- PRD v2.0, Section 9.2: NFR-010 (resource ownership enforcement)
- PRD v2.0, Section 9.2: NFR-032-036 (GDPR compliance)
- ConnectSW addendum: "All queries filtered by parent_id"
