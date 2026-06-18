# Database Selection: SQL vs NoSQL and Choosing the Right Engine

Selecting a database is one of the most consequential architectural decisions a CTO makes. The wrong choice creates years of compounding friction; the right choice becomes invisible infrastructure that simply works. This guide provides a structured framework for evaluating SQL and NoSQL databases across real-world dimensions: data model fit, query patterns, consistency requirements, operational burden, and team expertise.

## When to Use / When NOT to Use

| Scenario | Recommended Approach | Avoid |
|----------|---------------------|-------|
| Complex relational data with joins, transactions, and referential integrity | SQL (PostgreSQL, MySQL) | Document stores that force denormalization |
| High-velocity event streams or time-series ingestion | Purpose-built stores (TimescaleDB, InfluxDB, Cassandra) | Traditional RDBMS without partitioning |
| Flexible schema with rapidly evolving data models | Document stores (MongoDB, Firestore) | Rigid SQL schemas requiring constant migrations |
| Key-value lookups at massive scale with single-digit ms latency | DynamoDB, Redis, ScyllaDB | Full RDBMS for simple key-value patterns |
| Graph traversals (social networks, recommendation engines) | Neo4j, Neptune, Dgraph | Recursive SQL CTEs at depth > 4 |
| Early-stage startup with unclear data model | PostgreSQL (most flexible relational DB) | Multiple specialized databases before product-market fit |
| Multi-region, partition-tolerant workloads | Cassandra, CockroachDB, DynamoDB Global Tables | Single-region PostgreSQL with replication lag concerns |

## Trade-offs

### ACID vs BASE

**ACID** (Atomicity, Consistency, Isolation, Durability) guarantees that transactions either fully complete or fully roll back. Every SQL database provides ACID semantics. When your application demands correctness over availability -- financial transactions, inventory management, user account operations -- ACID is non-negotiable.

**BASE** (Basically Available, Soft state, Eventually consistent) trades strict consistency for availability and partition tolerance. Systems like Cassandra and DynamoDB operate under BASE semantics by default. This model works when temporary inconsistency is acceptable: social media feeds, analytics counters, content delivery.

The practical distinction matters most during failure scenarios. An ACID system under partition may become unavailable. A BASE system under partition continues serving requests but may return stale data.

### Read/Write Pattern Analysis

| Pattern | Best Fit | Why |
|---------|----------|-----|
| Read-heavy, complex queries | PostgreSQL with read replicas | Mature query optimizer, partial indexes, materialized views |
| Write-heavy, append-only | Cassandra, DynamoDB | LSM-tree storage optimized for sequential writes |
| Mixed read/write with transactions | PostgreSQL, MySQL InnoDB | MVCC provides concurrent reads without blocking writes |
| Random reads at extreme scale | DynamoDB, ScyllaDB | Consistent single-digit ms regardless of dataset size |
| Full-text search alongside relational data | PostgreSQL (built-in) or Elasticsearch sidecar | Avoids sync complexity when PostgreSQL's FTS suffices |

## Real-World Examples

### YouTube: MySQL at 2.49 Billion Monthly Active Users

YouTube has run on MySQL (specifically Vitess, their open-source MySQL sharding middleware) since its early days. Rather than migrating to a "web-scale" NoSQL database, YouTube invested in tooling around MySQL. Vitess provides horizontal sharding, connection pooling, and query routing while preserving MySQL's transactional guarantees. The lesson: you can scale a relational database to extraordinary levels with the right middleware and operational investment. YouTube's engineering team has publicly stated that the transactional guarantees of MySQL were essential for maintaining consistency across video metadata, channel data, and monetization records.

### Figma: PostgreSQL at 4 Million+ Users

Figma built its collaborative design platform on PostgreSQL and scaled it to serve millions of concurrent users. Their engineering blog details how they use PostgreSQL's JSONB columns for flexible metadata, partial indexes for query performance, and logical replication for read scaling. Figma's CTO Evan Wallace chose PostgreSQL early on because it provided the relational integrity needed for file permissions, team management, and billing while offering enough flexibility (via JSONB) to handle the varied metadata attached to design files. When query patterns became hot, they added targeted caching with Redis rather than replacing PostgreSQL.

### Discord: Cassandra to ScyllaDB Migration

Discord initially chose Cassandra for message storage due to its write-optimized, partition-tolerant architecture. As they scaled past 200 million users, they encountered performance issues caused by Cassandra's JVM garbage collection pauses during compaction. In 2023, they migrated to ScyllaDB (a C++ reimplementation of the Cassandra protocol) and achieved p99 latencies under 1ms for reads, down from 40-125ms. The key insight: the data model was correct (wide-column store for time-series message data), but the implementation characteristics of the database engine mattered enormously at scale.

### Airbnb: From MySQL to a Service-Oriented Data Architecture

Airbnb started with a monolithic MySQL database and gradually decomposed it into service-specific databases. Their SOA migration blog posts describe how different services chose different databases based on their specific access patterns: MySQL for booking transactions (ACID required), Elasticsearch for search, Redis for session and cache, and HBase for analytics event storage. The lesson for CTOs: database selection is not a one-time company-wide decision but a per-service decision within a data architecture strategy.

## Decision Framework

### Choose PostgreSQL When...

- You need relational integrity with ACID transactions
- Your data model has clear relationships (foreign keys, joins)
- You want one database that handles relational, JSON, full-text search, and geospatial
- Your team has SQL expertise
- You are pre-product-market-fit and need maximum flexibility
- Your dataset fits comfortably on a single large instance (up to ~2-4TB before considering sharding)

### Choose MySQL When...

- You have an existing MySQL-skilled team or ecosystem
- You plan to use Vitess or PlanetScale for horizontal scaling
- Your read patterns benefit from MySQL's simpler query optimizer (less planning overhead for simple queries)
- You need mature replication with well-understood operational characteristics

### Choose MongoDB When...

- Your data is genuinely document-oriented (CMS, product catalogs with variable attributes)
- Schema flexibility is a real requirement, not a convenience preference
- Your team is more comfortable with document queries than SQL
- You accept eventual consistency for most operations (or use multi-document transactions with their performance cost)

### Choose DynamoDB When...

- You need single-digit millisecond latency at any scale
- Your access patterns are well-defined and unlikely to change (DynamoDB punishes ad-hoc queries)
- You want zero operational overhead (fully managed)
- You are building on AWS and accept vendor lock-in
- Your data model fits key-value or key-document patterns

### Choose Cassandra (or ScyllaDB) When...

- You need linear horizontal write scaling
- Your workload is time-series, event logging, or IoT telemetry
- You require multi-datacenter, active-active replication
- You accept eventual consistency as the default (tunable per query)
- You have the operational expertise to manage a distributed cluster

## Common Mistakes

**1. Choosing NoSQL to avoid schema design.** Schema-on-read does not mean schema-free. Your application code becomes the schema enforcer, and bugs in that enforcement are harder to detect than a database constraint violation. If you are choosing MongoDB because "we don't want to deal with migrations," you are deferring complexity, not eliminating it.

**2. Premature database diversification.** Running PostgreSQL, MongoDB, Redis, and Elasticsearch in production when your startup has 1,000 users creates operational burden disproportionate to the benefit. Start with PostgreSQL. Add specialized stores only when you have concrete evidence that PostgreSQL cannot serve a specific access pattern.

**3. Ignoring operational cost.** DynamoDB's pricing model rewards well-designed access patterns and punishes table scans. Cassandra requires dedicated expertise for compaction tuning, repair scheduling, and cluster topology management. Factor operational cost -- both human and financial -- into your database selection.

**4. Selecting based on benchmarks instead of your actual workload.** Synthetic benchmarks (YCSB, TPC-C) measure capabilities that may not reflect your access patterns. A database that excels at 100% write workloads may not matter if your application is 95% reads. Profile your actual queries before selecting.

**5. Underestimating migration cost.** Changing databases after launch is one of the most expensive engineering projects a company undertakes. Instagram's migration from Redis to Cassandra for feed storage took over a year. Plan for the possibility that your initial choice persists for 5-10 years.

**6. Conflating database and caching.** Using Redis as a primary database or using your primary database where a cache layer would suffice are both mistakes. Design your data tier with clear separation between durable storage and ephemeral cache.

## Key Metrics to Track

| Metric | Why It Matters | Target Range |
|--------|---------------|--------------|
| p50 / p95 / p99 query latency | User experience and SLA compliance | p99 < 100ms for OLTP |
| Connections in use vs pool size | Connection exhaustion causes cascading failures | < 70% pool utilization |
| Replication lag (for read replicas) | Stale reads affect user experience | < 1s for most applications |
| Storage growth rate | Capacity planning and cost forecasting | Monitor monthly, project 12 months |
| Cache hit ratio | Indicates whether your caching strategy works | > 95% for hot-path queries |
| Lock wait time / deadlock rate | Contention reduces throughput | Deadlocks < 1/hour; lock waits < 10ms p99 |
| IOPS utilization | Disk I/O is often the bottleneck | < 80% provisioned IOPS |
| Slow query count | Performance regression detection | Trending down or stable |
| Backup success rate and RTO/RPO | Data durability and disaster recovery | 100% backup success; RPO < 1hr for most apps |

## References

- Vitess: YouTube's MySQL scaling solution -- vitess.io and Sugu Sougoumarane's talks at Percona Live
- Figma engineering blog: "How Figma's databases team lived to tell the scale" (2023)
- Discord engineering blog: "How Discord Stores Trillions of Messages" (2023)
- Airbnb engineering blog: "The Great Migration" SOA series (2020-2022)
- Martin Kleppmann, "Designing Data-Intensive Applications" (O'Reilly, 2017) -- Chapters 2, 5, 6
- AWS documentation: DynamoDB best practices for partition key design
- MongoDB documentation: Data Modeling Introduction
- PostgreSQL documentation: JSONB indexing and full-text search
