# Capacity Planning and Back-of-Envelope Estimation

Capacity planning is the practice of estimating the compute, storage, bandwidth, and infrastructure resources a system needs to serve its expected workload. It is the discipline that prevents both over-provisioning (wasting money) and under-provisioning (causing outages). For CTOs, the ability to do quick back-of-envelope calculations during design discussions and architecture reviews is one of the most practical skills you can develop. You do not need exact numbers; you need order-of-magnitude estimates that tell you whether a design is feasible before you build it.

## Overview

Back-of-envelope estimation is a structured approach to answering questions like "can a single server handle this?" or "how much storage do we need for 1M users?" It combines known constants (latency numbers, storage costs, network throughput) with business projections (DAU, data per user, growth rate) to produce rough but directionally correct resource estimates. The goal is not precision; it is identifying whether you need one server or a thousand, one database or a sharded cluster, gigabytes or petabytes of storage.

## When to Use / When NOT to Use

| Scenario | Estimation Appropriate | Better Alternative |
|---|---|---|
| Architecture review: "will this design work at our scale?" | Yes | N/A |
| Choosing between architectural approaches (monolith vs microservices) | Yes | N/A |
| Budgeting cloud infrastructure costs | Yes (then validate with calculator) | AWS/GCP pricing calculators for final numbers |
| Capacity planning for a product launch | Yes (initial sizing) | Load testing for final validation |
| Debugging a production performance issue | No | Profiling, tracing, metrics |
| Choosing between two equivalent database queries | No | Benchmarking |
| Estimating development time | No (different discipline) | Story points, historical velocity |
| Interview system design questions | Yes (expected by interviewers) | N/A |

## Powers of 2: The Foundation

Every estimation starts with powers of 2. Memorize these:

| Power | Exact Value | Approximate | Common Name |
|---|---|---|---|
| 2^10 | 1,024 | ~1 Thousand | 1 KB |
| 2^20 | 1,048,576 | ~1 Million | 1 MB |
| 2^30 | 1,073,741,824 | ~1 Billion | 1 GB |
| 2^40 | ~1.1 Trillion | ~1 Trillion | 1 TB |
| 2^50 | ~1.1 Quadrillion | ~1 Quadrillion | 1 PB |

**Shortcut**: 2^10 is approximately 10^3. So 2^30 is approximately 10^9 (1 billion). This lets you convert between binary and decimal mentally.

## Latency Numbers Every Engineer Should Know

These are approximate values for 2024-era hardware. The exact numbers shift with each hardware generation, but the relative orders of magnitude remain stable.

| Operation | Latency | Notes |
|---|---|---|
| L1 cache reference | 1 ns | Fastest possible data access |
| L2 cache reference | 4 ns | |
| Branch mispredict | 3 ns | |
| Mutex lock/unlock | 17 ns | |
| Main memory reference | 100 ns | ~100x slower than L1 |
| Compress 1KB with Snappy | 2,000 ns (2 us) | |
| Send 2KB over 10 Gbps network | 1,600 ns (1.6 us) | Within same datacenter |
| Read 1 MB sequentially from memory | 3 us | |
| SSD random read | 16 us | ~100x faster than HDD |
| Read 1 MB sequentially from SSD | 49 us | |
| Round trip within same datacenter | 500 us (0.5 ms) | Network + processing |
| Read 1 MB sequentially from HDD | 825 us | Spinning disk, seek time dominates |
| Disk seek (HDD) | 2 ms | Becoming irrelevant with SSD adoption |
| Send packet CA to Netherlands to CA | 150 ms | Speed of light in fiber, round trip |
| TLS handshake | 250 ms | Significant for mobile clients |
| TCP connection establishment | 100-300 ms | Cross-continent |

**Key takeaways for CTOs**:

1. Memory is 100x faster than SSD, SSD is 100x faster than HDD, network within a datacenter is between SSD and HDD.
2. Cross-continent round trips cost 150ms minimum (physics). This is why CDNs and multi-region deployment matter.
3. A database query that touches disk is 10,000x slower than one served from memory. This is why caching works.

## QPS (Queries Per Second) Calculations

### Single Server Capacity Rules of Thumb

| Server Type | Approximate QPS | Constraints |
|---|---|---|
| Web server (Nginx, static files) | 10,000-50,000 | CPU and connections |
| Application server (Node.js, simple logic) | 1,000-5,000 | Single-threaded, I/O bound |
| Application server (Go, Rust, Java) | 5,000-50,000 | Multi-threaded, CPU bound |
| PostgreSQL (simple queries, indexed) | 5,000-20,000 | Connection count, I/O |
| PostgreSQL (complex joins, aggregations) | 100-1,000 | CPU, memory |
| Redis (GET/SET operations) | 100,000-200,000 | Memory, network |
| Redis (complex operations, Lua scripts) | 10,000-50,000 | CPU (single-threaded) |

### DAU to QPS Conversion

Not all users are active simultaneously. Convert DAU to QPS with these steps:

1. **DAU to daily requests**: assume each active user makes N requests per session (depends on product)
   - Social media (feed scrolling): 50-200 requests/day
   - SaaS dashboard: 10-50 requests/day
   - E-commerce (browsing): 20-100 requests/day
   - API platform: varies wildly by client

2. **Daily requests to average QPS**:
   ```
   Average QPS = (DAU * requests_per_user) / 86,400
   ```
   (86,400 = seconds in a day)

3. **Average to peak QPS**: traffic is not uniform. Apply a peak multiplier:
   - Business SaaS: 2-3x average (office hours spike)
   - Consumer social: 3-5x average (evening spike)
   - E-commerce: 5-10x average (flash sales, holidays)
   - Gaming: 10x+ (new release, events)

4. **Peak QPS to provisioned capacity**: add a safety margin:
   ```
   Provisioned QPS = Peak QPS * 1.5 (50% headroom)
   ```

### Example: 1M DAU Social App

```
Assumptions:
- 1M DAU
- 100 API requests per user per day (feed, notifications, messages)
- Peak multiplier: 4x

Daily requests = 1M * 100 = 100M requests/day
Average QPS   = 100M / 86,400 = ~1,157 QPS
Peak QPS      = 1,157 * 4 = ~4,600 QPS
Provisioned   = 4,600 * 1.5 = ~7,000 QPS

With a Node.js server handling ~2,000 QPS each:
Servers needed = 7,000 / 2,000 = 3.5 → 4 servers (plus 1 for redundancy = 5)
```

## Storage Estimation

### Per-User Data Sizing

| Data Type | Typical Size | Notes |
|---|---|---|
| User profile (text fields) | 1-5 KB | Name, email, bio, settings |
| User avatar (compressed) | 50-200 KB | After resize to standard dimensions |
| Single text post/message | 0.5-2 KB | Including metadata |
| Single photo (compressed for web) | 200-500 KB | After server-side optimization |
| Single 1-minute video (compressed) | 5-10 MB | Varies enormously by quality |
| Session record | 0.5-1 KB | Token, metadata, expiry |
| Audit log entry | 0.2-1 KB | Action, actor, timestamp, metadata |

### Example: Designing Storage for 1M DAU

```
Scenario: SaaS platform with 1M DAU

User profiles: 1M * 5 KB = 5 GB
User avatars:  1M * 100 KB = 100 GB (object storage, not DB)
Documents:     avg 10 docs/user * 50 KB = 500 GB
Audit logs:    100 events/user/day * 0.5 KB * 365 days = 18.25 TB/year

Database storage (profiles + metadata): ~50 GB (fits on one PostgreSQL instance)
Object storage (avatars + documents):   ~600 GB (S3/GCS, cheap)
Log storage:                            ~18 TB/year (needs rotation/archival policy)
```

**Key insight**: relational database storage is usually manageable (tens to hundreds of GB). Object storage (files, media) and logs are where storage explodes. Plan accordingly: use object storage services (S3, GCS) for media, and log rotation/archival for logs.

## Bandwidth Estimation

```
Bandwidth = QPS * average_response_size

Example for the 1M DAU social app:
- Average API response: 5 KB
- Peak QPS: 4,600

Peak bandwidth = 4,600 * 5 KB = 23 MB/s = 184 Mbps (outbound)

With media (images in feed):
- 20% of requests include a 200 KB image
- Image bandwidth: 4,600 * 0.2 * 200 KB = 184 MB/s = 1.5 Gbps

Total peak: ~1.7 Gbps outbound
```

**Key insight**: media dominates bandwidth. Use a CDN to offload image and video delivery. Your servers should serve API responses (small); the CDN serves media (large).

## Compute Estimation

### CPU Sizing

```
CPU cores needed = Peak QPS / QPS_per_core

For a Node.js API (single-threaded, I/O bound):
- ~500-1,000 QPS per core (depends on handler complexity)
- Peak 4,600 QPS → 5-10 cores

For a Go/Rust API (multi-threaded, CPU efficient):
- ~2,000-5,000 QPS per core
- Peak 4,600 QPS → 1-3 cores
```

### Memory Sizing

```
Memory = baseline + (connections * per_connection_memory) + (cache_size)

Node.js baseline: ~100 MB
Per connection: ~10 KB
10,000 concurrent connections: 100 MB
In-process cache: 200 MB
Total per instance: ~400 MB → provision 1 GB (headroom)

PostgreSQL:
shared_buffers: 25% of RAM (recommendation)
For a 100 GB database, aim for 32 GB RAM → 8 GB shared_buffers
```

## Complete Example: Designing for 1M DAU

### Requirements
- Social productivity app with 1M DAU
- Users post text updates, share files, send messages
- 50 requests per user per day average
- Read:write ratio is 10:1
- 99.9% availability target

### Step 1: Traffic

```
Daily requests:  1M * 50 = 50M/day
Average QPS:     50M / 86,400 = ~580 QPS
Peak QPS:        580 * 4 = ~2,300 QPS
Read QPS:        2,300 * 0.91 = ~2,100 QPS
Write QPS:       2,300 * 0.09 = ~210 QPS
```

### Step 2: Storage (Year 1)

```
User data:       1M * 5 KB = 5 GB
Posts:           1M * 2 posts/day * 365 * 1 KB = 730 GB
Files:           1M * 0.5 files/day * 365 * 100 KB = 18 TB (object storage)
Messages:        1M * 5 msgs/day * 365 * 0.5 KB = 913 GB
Metadata/indexes: ~20% overhead on DB data

Database:        (5 + 730 + 913) * 1.2 = ~2 TB
Object storage:  18 TB
Total:           ~20 TB
```

### Step 3: Bandwidth

```
Average response:  3 KB (API) + 50 KB (media, amortized)
Peak bandwidth:    2,300 * 53 KB = 122 MB/s = ~1 Gbps
CDN offloads:      ~80% of bandwidth (static/media)
Origin bandwidth:  ~200 Mbps
```

### Step 4: Infrastructure

```
Application servers: 2,300 QPS / 1,500 QPS per server = 2 servers + 1 spare = 3
                     Instance type: 2 vCPU, 4 GB RAM each (~$60/month on AWS)

Database:           2 TB PostgreSQL
                     Primary: 8 vCPU, 32 GB RAM (~$400/month)
                     Read replica: same spec (~$400/month)

Cache (Redis):      Hot data ~5% of DB = 100 GB → 128 GB Redis
                     Instance: r6g.4xlarge (~$600/month) or ElastiCache

Object storage:     18 TB on S3 (~$400/month)

CDN:                ~1 Gbps peak, ~10 TB/month transfer (~$850/month)

Load balancer:      ALB (~$50/month)

Total monthly:      ~$2,800/month infrastructure

Total annual:       ~$34,000/year
```

### Step 5: Sanity Check

Does this pass the smell test?

- $0.034/user/year for infrastructure — reasonable for a social app
- 2 TB database — fits on a single PostgreSQL instance (no sharding needed yet)
- 3 application servers — manageable fleet, can auto-scale
- 99.9% availability — achievable with multi-AZ deployment and read replica failover

## Decision Framework

**When to scale vertically (bigger machine)**:
- Database is under 5 TB and query patterns are indexable
- Single-digit application servers can handle peak QPS
- Team is small and operational simplicity reduces risk

**When to scale horizontally (more machines)**:
- Peak QPS exceeds single-server capacity
- You need fault tolerance (lose one server, service continues)
- Traffic is spiky and auto-scaling saves cost

**When to add caching**:
- Database CPU or IOPS is the bottleneck
- Read:write ratio exceeds 5:1
- Same data is read repeatedly (high cache hit potential)

**When to shard the database**:
- Single database exceeds 5-10 TB or query latency degrades under load
- Write QPS exceeds single-node capacity (usually 5K-20K writes/second for PostgreSQL)
- Regulatory requirements mandate data isolation by geography

**When to add a CDN**:
- Media or static content accounts for >50% of bandwidth
- Users are geographically distributed
- Always, for any consumer-facing product

## Common Mistakes

1. **Optimizing for peak from day one**: a startup with 1K users does not need the architecture for 1M users. Premature capacity planning leads to over-provisioning and wasted engineering effort. Plan for 10x your current scale, not 1000x.

2. **Ignoring the read:write ratio**: a 100:1 read:write system has completely different infrastructure needs than a 2:1 system. Caching is transformative for the former and nearly useless for the latter.

3. **Forgetting about data growth**: storage estimates must account for time. A system that generates 1 TB/year of data will have 5 TB in 5 years. Plan retention and archival policies from the start.

4. **Using average instead of peak**: a system with 100 QPS average and 1,000 QPS peak needs infrastructure for 1,000 QPS. Average numbers are useful for cost estimation but dangerous for capacity planning.

5. **Not accounting for supporting systems**: databases need backups (2x storage), logs need storage and processing, monitoring needs compute. Supporting systems can cost 30-50% as much as the primary system.

6. **Confusing theoretical throughput with practical throughput**: a server rated for 10,000 QPS in a microbenchmark will handle 2,000-5,000 QPS with real application logic, database queries, and network calls. Apply a 2-5x reduction factor to benchmarks.

7. **Linear cost extrapolation**: infrastructure costs are not linear. Managed database pricing has tiers. CDN pricing decreases per GB at volume. Committed-use discounts (1-3 year) reduce compute costs 30-60%. Factor in volume discounts for large-scale estimates.

## Key Metrics to Track

| Metric | Why It Matters | Action Threshold |
|---|---|---|
| CPU utilization (p95) | Compute capacity indicator | >70% sustained: scale up or out |
| Memory utilization | OOM risk and cache effectiveness | >80%: investigate, >90%: immediate action |
| Disk I/O utilization | Database bottleneck indicator | >70%: optimize queries or upgrade storage |
| Network throughput | Bandwidth saturation | >60% of provisioned: upgrade or add CDN |
| Request latency (p99) | User experience and SLA | Trending up: investigate before it breaches SLA |
| Error rate (5xx) | System health | >0.1%: investigate. >1%: incident. |
| Database connections | Connection pool exhaustion risk | >80% of max: increase pool or add connection pooler |
| Storage growth rate | Predict when you run out | Project forward 6 months; plan before 80% full |
| Cost per request | Economic efficiency | Track trend monthly; investigate jumps |

## References

- Dean, J. (2013). "Numbers Every Programmer Should Know." (Updated periodically by various authors).
- Xu, A. (2020). *System Design Interview: An Insider's Guide*. Independently published. Chapters 2 and 3.
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. Chapter 1.
- Hamilton, J. (2007). "On Designing and Deploying Internet-Scale Services." USENIX LISA.
- AWS Architecture Center. "AWS Well-Architected Framework — Performance Efficiency Pillar."
- Google Cloud Architecture. "Capacity Planning." https://cloud.google.com/architecture/capacity-planning
- Gregg, B. (2020). *Systems Performance: Enterprise and the Cloud*. Addison-Wesley. Chapter 2.
