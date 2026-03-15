# Database Sharding: Strategies, Implementation, and Operational Reality

Database sharding is the practice of distributing data across multiple database instances (shards) so that no single instance bears the full load. It is the primary mechanism for horizontally scaling databases beyond the capacity of a single machine. Sharding introduces significant operational complexity and should be treated as a last resort after exhausting vertical scaling, read replicas, caching, and query optimization. This guide covers sharding strategies, shard key selection, operational challenges, and lessons from companies that shard at scale.

## When to Use / When NOT to Use

| Scenario | Recommended | Avoid Sharding When... |
|----------|-------------|----------------------|
| Single database exceeds vertical scaling limits (CPU, IOPS, storage) | Sharding is appropriate | You have not tried read replicas, connection pooling, query optimization, or caching first |
| Write throughput exceeds what a single primary can handle | Sharding distributes writes | Read-heavy workloads that read replicas can absorb |
| Dataset size exceeds practical backup/restore windows | Smaller shards = faster operations | Dataset < 500GB on modern hardware (PostgreSQL handles this comfortably) |
| Regulatory requirements mandate data residency by region | Geographic sharding satisfies compliance | You can solve residency with a single multi-region database (CockroachDB, Spanner) |
| Multi-tenant SaaS where tenants must be isolated | Tenant-per-shard or tenant-based shard key | Single-tenant applications |
| You have proven that a single database is the bottleneck (with evidence) | Sharding addresses verified bottleneck | The bottleneck is application-level (N+1 queries, missing indexes, unoptimized code) |

## Sharding Strategies

### Horizontal Sharding (Data Partitioning)

Horizontal sharding splits rows across multiple database instances. Each shard holds a subset of the total rows but maintains the same schema. This is the most common form of sharding.

**Advantages:** Linear write scaling, smaller indexes per shard, faster backups, independent failure domains.

**Disadvantages:** Cross-shard queries are expensive or impossible. Transactions spanning shards require distributed coordination (2PC or saga patterns). Application routing logic adds complexity.

### Vertical Sharding (Functional Partitioning)

Vertical sharding splits tables across different databases based on functional domain. For example: user profiles on one database, order history on another, analytics events on a third. This often aligns with service decomposition in a microservices architecture.

**Advantages:** Each database is optimized for its workload. Simpler than horizontal sharding. Natural alignment with service boundaries.

**Disadvantages:** Cross-domain queries require application-level joins. Does not solve the problem of a single table that exceeds one machine's capacity.

### Shard Key Strategies

#### Hash-Based Sharding

The shard key value is hashed, and the hash determines which shard receives the record. Common approach: `shard_id = hash(tenant_id) % num_shards`.

**Pros:** Even data distribution regardless of key value distribution. Simple to implement. Prevents hotspots from sequential keys.

**Cons:** Range queries across shard key values require scatter-gather to all shards. Adding or removing shards requires rehashing (unless using consistent hashing). Loses data locality -- related records may land on different shards.

#### Range-Based Sharding

Records are assigned to shards based on value ranges of the shard key. For example: users A-F on shard 1, G-M on shard 2, N-T on shard 3, U-Z on shard 4.

**Pros:** Range queries on the shard key are efficient (hit one or few shards). Data locality preserved for sequential access patterns. Easier to reason about data placement.

**Cons:** Prone to hotspots if data distribution is skewed (more users with names starting with S than X). Requires monitoring and periodic range rebalancing. New ranges must be split as shards fill.

#### Directory-Based Sharding

A lookup table (the directory) maps each shard key value to a specific shard. The directory itself is stored in a highly available, low-latency store (often a separate small database or distributed cache).

**Pros:** Maximum flexibility -- any record can be on any shard. Supports arbitrary mapping changes without data movement. Enables tenant-level shard placement policies.

**Cons:** The directory is a single point of failure and a potential bottleneck. Every database operation requires a directory lookup first. Directory must be cached aggressively and kept consistent.

#### Consistent Hashing

A refinement of hash-based sharding that uses a hash ring. When shards are added or removed, only a fraction of keys need to be remapped (approximately `1/n` of keys where `n` is the number of shards).

**Pros:** Minimizes data movement during resharding. Well-suited for caching layers and distributed key-value stores. Used by DynamoDB, Cassandra, and Riak internally.

**Cons:** Virtual nodes are needed to prevent uneven distribution. More complex to implement correctly than simple modulo hashing. Debugging data placement requires understanding the ring topology.

## Real-World Examples

### Quora: MySQL Sharding at 13TB+

Quora shards its MySQL databases by content type and uses a consistent hashing approach for distributing data within each shard group. Their engineering blog describes maintaining over 13TB of data across hundreds of MySQL shards. Key decisions:

- **Shard key: question ID** for the questions shard group, **user ID** for the user activity shard group. This ensures that most queries hit a single shard.
- **Application-level routing:** Quora built a custom ORM that is shard-aware. The application determines the target shard before executing any query.
- **No cross-shard joins:** All queries that previously required joins across shard boundaries were redesigned to use denormalization or application-level aggregation.
- **Incremental migration:** Quora did not shard everything at once. They identified the hottest tables first and sharded those, leaving smaller tables on a single database.

### Instagram: Sharding PostgreSQL for User IDs

Instagram's engineering team published their approach to generating unique IDs across PostgreSQL shards. They use a combination of timestamp, shard ID, and auto-incrementing sequence to generate globally unique, sortable IDs without a centralized ID generator. Each shard runs an independent PostgreSQL instance with a PL/pgSQL function that produces 64-bit IDs. This avoids the bottleneck of a single ID-generation service while maintaining chronological ordering.

### Pinterest: From One MySQL to Hundreds of Shards

Pinterest documented their sharding journey extensively. They started with a single MySQL database, hit scaling limits around 2012, and implemented a custom sharding layer. Key lessons from their blog:

- They chose **hash-based sharding by object ID** to ensure even distribution.
- All objects get a 64-bit ID that encodes the shard number, object type, and local ID.
- They explicitly decided against cross-shard queries -- every query must target a single shard.
- **Resharding** from their initial shard count required a careful dual-write migration over several months.

### Slack: Sharding by Workspace

Slack uses workspace ID (team ID) as the shard key for their MySQL database tier. This is a natural partition boundary because data within a workspace is accessed together far more often than data across workspaces. Their Vitess adoption allowed them to manage hundreds of MySQL shards with a unified query interface while maintaining per-workspace data locality.

## Decision Framework

### Choose Hash-Based Sharding When...

- Your access patterns primarily use point lookups by the shard key
- You need even distribution and want to avoid hotspots
- Range queries on the shard key are rare or can be done via scatter-gather
- You plan to use consistent hashing to simplify future resharding

### Choose Range-Based Sharding When...

- Your primary queries involve range scans on the shard key (time-series data, alphabetical listings)
- You can tolerate some distribution skew and manage rebalancing
- Data has a natural ordering that aligns with access patterns

### Choose Directory-Based Sharding When...

- You need fine-grained control over data placement (compliance, tenant isolation)
- You are building multi-tenant SaaS where large tenants get dedicated shards
- You can afford the operational overhead of maintaining a highly available directory service

### Choose Vertical Sharding First When...

- Different tables have very different access patterns or scaling needs
- You are decomposing a monolith into services and want aligned data boundaries
- A single large table is not the bottleneck -- multiple medium tables are

## Shard Key Selection

Shard key selection is the single most important sharding decision. A poor shard key creates hotspots, forces cross-shard queries, and makes resharding painful.

**Criteria for a good shard key:**

1. **High cardinality:** The key should have many distinct values to distribute evenly across shards. User ID (millions of values) is good. Country code (< 200 values) is bad.

2. **Even distribution:** Values should be roughly uniformly distributed. Sequential IDs with modulo hashing work. Timestamps with range-based sharding create hot shards for recent data.

3. **Query affinity:** Most queries should include the shard key. If 80% of your queries filter by tenant_id, that is a strong shard key candidate. If your most common query is a global search across all tenants, tenant_id is a poor shard key for that query.

4. **Stability:** The shard key value should not change for a given record. Moving a record between shards because its shard key changed is expensive and error-prone.

5. **Composite keys when needed:** If no single field satisfies all criteria, consider a composite shard key. For example, `(tenant_id, date)` gives tenant locality with time-based distribution within each tenant.

## Resharding Challenges

Resharding -- changing the number of shards or the sharding strategy -- is one of the most operationally dangerous procedures in distributed systems.

**Why resharding is hard:**

- **Data movement:** Records must be copied from old shards to new shards while the system remains operational. This requires dual-writes during the migration window.
- **Consistency during migration:** Reads must return correct data even when a record might exist on the old shard, the new shard, or both.
- **Application routing updates:** All application instances must be updated to route to new shard assignments, ideally without downtime.
- **Backfill verification:** After migration, every record must be verified to exist on the correct new shard. This is a full table scan of all original shards.

**Mitigation strategies:**

- **Over-provision shards initially.** Start with more logical shards than physical machines. Multiple logical shards can share a physical machine and be split to separate machines later without data movement.
- **Use consistent hashing.** Reduces the percentage of data that moves when adding shards.
- **Use Vitess, Citus, or ProxySQL.** These middleware layers handle shard routing and can manage resharding operations.
- **Plan for resharding from day one.** Ensure your shard key and ID generation scheme support future shard count changes.

## Common Mistakes

**1. Sharding prematurely.** Most applications never need sharding. PostgreSQL on a modern machine with NVMe storage, 128GB RAM, and proper indexing handles billions of rows and thousands of transactions per second. Shard only when you have concrete evidence that a single database cannot serve your workload.

**2. Choosing a low-cardinality shard key.** Sharding by country code, user type, or status creates a small number of very large shards. When one shard fills up, you cannot split it further without changing your shard key.

**3. Ignoring cross-shard query patterns.** If your reporting dashboard needs to aggregate data across all users, and you shard by user ID, every dashboard query becomes a scatter-gather across all shards. Design your analytics pipeline separately from your transactional sharding.

**4. No backpressure on shard growth.** Even with good distribution, some shards grow faster than others. Monitor shard sizes and set alerts when any shard exceeds 80% of the target maximum size.

**5. Treating sharding as a one-time project.** Sharding is an ongoing operational commitment. You need monitoring for shard health, tooling for shard splits, runbooks for shard failures, and on-call expertise for shard-specific incidents.

**6. Not testing shard failure scenarios.** What happens when one shard goes down? Can your application degrade gracefully, serving users on healthy shards while returning errors only for users on the failed shard? Test this before it happens in production.

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Shard size distribution (data volume per shard) | Detects hotspots and uneven growth | Coefficient of variation < 20% |
| Queries per shard per second | Identifies hot shards | No shard > 2x the mean |
| Cross-shard query percentage | Higher = more latency, more complexity | < 5% of total queries |
| Shard replication lag | Stale reads on shard replicas | < 1 second |
| Shard failover time | RTO for a single shard outage | < 30 seconds with automated failover |
| Connection count per shard | Connection exhaustion on hot shards | < 70% of max_connections |
| Migration progress (during resharding) | Track completion and ETA | Monotonically increasing toward 100% |
| Data verification errors (during resharding) | Catch consistency issues early | Zero tolerance |

## References

- Quora engineering blog: "MySQL Sharding at Quora" (2021-2023)
- Instagram engineering blog: "Sharding & IDs at Instagram" (2012)
- Pinterest engineering blog: "Sharding Pinterest: How we scaled our MySQL fleet" (2015)
- Slack engineering blog: "Scaling Datastores at Slack with Vitess" (2020)
- Vitess documentation: vitess.io/docs -- architecture and resharding operations
- Citus documentation: Distributed PostgreSQL extension for horizontal scaling
- Martin Kleppmann, "Designing Data-Intensive Applications" (O'Reilly, 2017) -- Chapter 6: Partitioning
- Sugu Sougoumarane, "Vitess: Scaling MySQL" -- KubeCon talks (2019-2023)
