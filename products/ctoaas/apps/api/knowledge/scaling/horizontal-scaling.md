# Horizontal Scaling Strategies

Horizontal scaling (scaling out) is the practice of adding more machines to a system rather than upgrading a single machine's resources. It is the foundational approach that enables web-scale systems to serve millions of concurrent users by distributing load across a fleet of commodity servers. For CTOs, understanding when and how to scale horizontally is arguably the most consequential infrastructure decision you will make.

## Overview

Horizontal scaling works by running multiple identical copies of your application behind a load balancer. Each instance handles a fraction of total traffic. When demand grows, you add more instances; when it shrinks, you remove them. This contrasts with vertical scaling (scaling up), where you move to a bigger machine with more CPU, RAM, or storage.

The key architectural prerequisite is **statelessness**: each request must be handleable by any instance without relying on local state from a previous request. Systems that violate this constraint cannot scale horizontally without significant rearchitecture.

## When to Use / When NOT to Use

| Scenario | Horizontal Scaling | Vertical Scaling |
|---|---|---|
| Traffic grows unpredictably (viral events, launches) | Yes | No |
| Latency-sensitive single-threaded workloads (e.g., game tick servers) | No | Yes |
| Stateless web APIs and microservices | Yes | Overkill risk |
| Large single-process in-memory databases | No | Yes (up to a point) |
| You need >99.99% availability | Yes (redundancy) | No (single point of failure) |
| Early-stage startup with <1K DAU | No (premature) | Yes (simpler) |
| Cost optimization at moderate scale (10K-100K DAU) | Depends | Often sufficient |
| Operating beyond a single machine's capacity | Yes (only option) | Impossible |

## Trade-offs

| Dimension | Horizontal | Vertical |
|---|---|---|
| **Complexity** | Higher: load balancers, service discovery, distributed state | Lower: single machine, simpler debugging |
| **Cost curve** | Linear (add commodity machines) | Exponential (high-end hardware premium) |
| **Availability** | Naturally redundant (N-1 tolerance) | Single point of failure |
| **Ceiling** | Practically unlimited | Physical hardware limits |
| **Data consistency** | Requires distributed coordination | Trivial (single process) |
| **Operational burden** | Deployment pipelines, health checks, auto-scaling | Occasional manual resize |
| **Latency** | Network hops between services | In-process calls |

## Real-World Examples

### Netflix: Stateless Microservices on AWS

Netflix moved from a single monolithic Java application running in their own datacenter to hundreds of stateless microservices on AWS. Each service scales independently. Their Edge gateway (Zuul) handles 200K+ requests per second across multiple instances. The key lesson: Netflix invested heavily in making every service stateless, externalizing session data to EVCache (their Memcached wrapper) and Cassandra. This took over two years of migration work but eliminated their scaling ceiling entirely. (Source: Netflix Tech Blog, "Completing the Netflix Cloud Migration," 2016)

### Slack: From Monolith to Horizontally Scaled Services

Slack initially ran as a PHP monolith that they scaled vertically until they could not find bigger machines. At roughly 500K concurrent connections, they decomposed the real-time messaging layer into a horizontally scaled Go service. Websocket connections are distributed across instances, with a message bus (initially Redis, later a custom solution) coordinating between them. Their migration was incremental: the PHP monolith still handled business logic while the Go layer handled connection management. (Source: Slack Engineering Blog, "Scaling Slack's Job Queue," 2018)

### Instagram: Vertical First, Horizontal When Forced

Instagram famously ran on a single Django server for longer than most people expected. With 14 million users, they had just 3 engineers and scaled vertically on AWS until the single-server approach became untenable. When they did go horizontal, they had the advantage of a stateless application layer from day one because Django's shared-nothing architecture naturally supported it. The lesson: do not over-engineer early. Vertical scaling bought Instagram time to find product-market fit before investing in horizontal infrastructure. (Source: Wired, "Instagram Engineering," 2012; Instagram Engineering Blog)

## Decision Framework

**Choose vertical scaling when:**
- Your DAU is under 50K and traffic is predictable
- Your team is small (<5 engineers) and operational simplicity matters more than theoretical scalability
- Your workload is inherently single-process (e.g., a large in-memory computation)
- You have not yet proven product-market fit

**Choose horizontal scaling when:**
- You have passed the vertical ceiling (largest available instance cannot handle peak load)
- You need fault tolerance (a single machine failure cannot take down your service)
- Traffic is spiky or seasonal and you want to autoscale to save cost
- Your architecture is already stateless or you are willing to invest in making it so
- You are operating at >100K DAU with growth trajectory

**Hybrid approach (most common at scale):**
- Scale application servers horizontally (stateless, easy)
- Scale databases vertically as long as possible, then add read replicas and eventually shard
- Use managed services (RDS, ElastiCache) that handle scaling mechanics for you

## Scaling to 10M Users: A Practical Roadmap

### Stage 1: Single Server (0-10K users)
- One application server, one database
- Vertical scaling: increase instance size as needed
- Focus on code quality and schema design

### Stage 2: Separate Tiers (10K-100K users)
- Separate application server from database server
- Add a CDN for static assets
- Add a caching layer (Redis/Memcached) for hot data
- Still possible to scale vertically

### Stage 3: Horizontal Application Layer (100K-1M users)
- Add a load balancer in front of multiple application instances
- Externalize sessions to Redis or use JWT tokens
- Add database read replicas for read-heavy workloads
- Implement health checks and auto-scaling groups

### Stage 4: Data Layer Scaling (1M-10M users)
- Shard the database by tenant, geography, or hash key
- Implement connection pooling (PgBouncer, ProxySQL)
- Add asynchronous processing for non-critical paths (queues)
- Consider separating read and write models (CQRS) for hot paths
- Multi-region deployment for latency reduction

### Session Management at Scale

Statelessness requires externalizing session state. Options ranked by maturity:

1. **JWT tokens** (simplest): encode session data in signed tokens. No server-side state. Downsides: token size, inability to revoke without a blocklist.
2. **Centralized session store (Redis)**: store session ID in a cookie, session data in Redis. Fast lookups, supports revocation. Downsides: Redis becomes a dependency.
3. **Sticky sessions** (avoid if possible): load balancer routes users to the same instance. Breaks auto-scaling and complicates deployments.

### Auto-scaling Triggers

| Metric | Threshold | Why |
|---|---|---|
| CPU utilization | Scale out at 65-70%, scale in at 30% | Most common, but can lag behind request spikes |
| Request count per target | Scale based on requests per instance | Better for web workloads than CPU |
| Queue depth (SQS, RabbitMQ) | Scale workers when queue length > N | Best for async processing workloads |
| Custom metrics (p99 latency) | Scale when latency exceeds SLA | Most precise, requires instrumentation |
| Memory utilization | Scale at 75%+ | Important for JVM or in-memory workloads |

**Critical rule**: always set a scale-in cooldown (5-10 minutes) to prevent thrashing. Scale out aggressively, scale in conservatively.

### Load Testing Before Scaling

Never scale based on assumptions. Load test first.

1. **Establish a baseline**: measure throughput and latency of a single instance under realistic traffic
2. **Identify the bottleneck**: is it CPU, memory, database connections, or network I/O?
3. **Test linearity**: add a second instance and verify throughput roughly doubles. If it does not, you have a shared bottleneck (usually the database).
4. **Simulate failure**: kill an instance during a load test to verify the system degrades gracefully
5. **Test auto-scaling**: verify your auto-scaling policy triggers at the right threshold and new instances become healthy fast enough

Tools: k6, Locust, Gatling, or AWS-native load testing. Run tests in a staging environment that mirrors production topology.

## Common Mistakes

1. **Scaling horizontally with a stateful application**: adding instances when sessions are stored in-memory leads to users losing state randomly. Fix: externalize state before scaling.

2. **Ignoring the database bottleneck**: scaling the application tier while the database is a single instance just moves the bottleneck. Your app servers will wait on DB connections.

3. **No health checks**: without proper health checks, the load balancer routes traffic to unhealthy or still-initializing instances, causing errors during deployments and scaling events.

4. **Scaling too early**: horizontal infrastructure adds operational complexity (service discovery, distributed tracing, deployment coordination). If your team is small and traffic is low, this complexity slows you down.

5. **Treating auto-scaling as fire-and-forget**: auto-scaling policies need tuning. Default CloudWatch metrics have 5-minute granularity, which is too slow for traffic spikes. Use detailed monitoring (1-minute) or custom metrics.

6. **Not testing scale-in behavior**: most teams test scale-out but forget to test what happens when instances are terminated. In-flight requests must be drained gracefully (connection draining).

## Key Metrics to Track

| Metric | Target | Why It Matters |
|---|---|---|
| Requests per second per instance | Baseline for capacity planning | Determines how many instances you need |
| p99 latency under load | <200ms for APIs | Ensures scaling actually improves UX |
| Instance boot time (cold start) | <60 seconds | Slow starts mean auto-scaling cannot react fast enough |
| Error rate during scaling events | <0.1% | Measures graceful scaling behavior |
| Cost per 1K requests | Track trend | Ensures scaling is cost-efficient |
| Auto-scaling event frequency | <5/day in steady state | Frequent scaling suggests wrong thresholds |
| Database connection count | < pool max * 80% | Horizontally scaled apps can exhaust DB connections |

## References

- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. Chapters 1 and 6.
- Netflix Technology Blog. "Completing the Netflix Cloud Migration." (2016). https://netflixtechblog.com
- Slack Engineering Blog. "Scaling Slack's Job Queue." (2018). https://slack.engineering
- Hamilton, J. (2007). "On Designing and Deploying Internet-Scale Services." USENIX LISA.
- AWS Well-Architected Framework, Reliability Pillar. https://docs.aws.amazon.com/wellarchitected/
- Google SRE Book, Chapter 22: "Addressing Cascading Failures." https://sre.google/sre-book/
