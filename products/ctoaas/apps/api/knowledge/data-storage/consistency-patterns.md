# Consistency Patterns in Distributed Systems

Consistency models define the rules governing when and how updates to data become visible to readers across a distributed system. Choosing the right consistency model is a fundamental architectural decision that directly impacts user experience, system availability, and operational complexity. This guide covers the spectrum of consistency models from strong to eventual, explains the CAP theorem in practical terms, and provides decision frameworks for CTOs navigating these trade-offs.

## When to Use / When NOT to Use

| Consistency Model | Use When | Avoid When |
|-------------------|----------|------------|
| Strong consistency (linearizability) | Financial transactions, inventory counters, leader election, distributed locks | High-availability requirements across multiple regions; latency-sensitive reads |
| Sequential consistency | Collaborative editing where operation order matters; message ordering | The performance cost of total ordering is unacceptable |
| Causal consistency | Social feeds (see your own posts), comment threads, chat applications | You need strict ordering across all operations, not just causally related ones |
| Read-your-writes | User profile updates, settings changes, form submissions | Data is read by a different user than the one who wrote it |
| Eventual consistency | Analytics dashboards, DNS propagation, content distribution, social media likes | Banking, double-spend prevention, booking systems with limited inventory |
| Monotonic reads | Any read-heavy workload where users should not see data go "backward" | You need the absolute latest value on every read |

## The CAP Theorem in Practice

The CAP theorem, formulated by Eric Brewer and proven by Seth Gilbert and Nancy Lynch, states that a distributed data store can provide at most two of three guarantees simultaneously:

- **Consistency (C):** Every read receives the most recent write or an error.
- **Availability (A):** Every request receives a non-error response, without guarantee that it contains the most recent write.
- **Partition tolerance (P):** The system continues to operate despite network partitions between nodes.

### Why "Pick Two" is Misleading

In practice, network partitions happen. They are not a choice -- they are a fact of distributed systems. The real decision is: **when a partition occurs, do you choose consistency or availability?**

- **CP systems** (e.g., ZooKeeper, etcd, HBase): During a partition, nodes that cannot confirm they have the latest data will refuse to serve reads. The system sacrifices availability for consistency.
- **AP systems** (e.g., Cassandra, DynamoDB in eventually consistent mode, CouchDB): During a partition, all nodes continue serving reads and writes, but some may return stale data. The system sacrifices consistency for availability.

When there is no partition (the normal case), you can have both consistency and availability. The CAP trade-off only activates during failure. This is why the PACELC theorem is more useful in practice.

### PACELC: A More Practical Model

Daniel Abadi's PACELC theorem extends CAP: **If there is a Partition, choose between Availability and Consistency; Else (normal operation), choose between Latency and Consistency.**

This captures the reality that even without failures, stronger consistency requires coordination between nodes, which adds latency. Examples:

- **PA/EL:** Cassandra with `ONE` consistency -- available during partitions, low latency normally, sacrifices consistency in both cases.
- **PC/EC:** Traditional single-leader databases -- consistent during partitions (by becoming unavailable on minority side), consistent with higher latency normally.
- **PA/EC:** DynamoDB default mode -- available during partitions, but provides strongly consistent reads as an option (at higher latency).

## Consistency Models in Detail

### Strong Consistency (Linearizability)

Every operation appears to take effect instantaneously at some point between its invocation and response. All readers see the same value at the same logical time. This is the strongest guarantee and the most expensive.

**Implementation:** Single-leader replication with synchronous writes, or consensus protocols like Raft and Paxos. Google Spanner achieves global strong consistency using TrueTime (GPS and atomic clocks) to bound clock uncertainty.

**Cost:** Higher write latency (must wait for quorum or all replicas). Lower availability during partitions. Higher operational complexity.

### Causal Consistency

Operations that are causally related are seen by all nodes in the same order. Concurrent operations (no causal relationship) may be seen in different orders by different nodes.

**Example:** If User A posts a message and User B replies, all readers see the post before the reply. But two independent posts by unrelated users may appear in different orders to different readers.

**Implementation:** Vector clocks, Lamport timestamps, or hybrid logical clocks track causal dependencies. Systems like MongoDB (with causal consistency sessions) and CRDT-based systems provide causal consistency.

### Read-Your-Writes Consistency

After a client writes a value, subsequent reads by that same client will always return the written value or a later one. Other clients may still see stale data.

**Implementation:** Route reads to the same node that handled the write (session affinity), or include a write timestamp with read requests and wait until the replica has caught up to that timestamp.

**Practical importance:** This is the minimum viable consistency for user-facing applications. Without it, a user saves their profile and immediately sees the old profile -- a confusing and unacceptable experience.

### Eventual Consistency

If no new updates are made, all replicas will eventually converge to the same value. No guarantee on how long "eventually" takes.

**Implementation:** Gossip protocols, anti-entropy mechanisms, last-writer-wins conflict resolution, or CRDTs (Conflict-free Replicated Data Types).

**Suitable for:** Data that is read far more often than written, where temporary staleness is acceptable, and where availability matters more than precision. DNS is the canonical example: updates propagate globally within minutes to hours, but the system is extraordinarily available.

## Real-World Examples

### Meta's Cache Consistency at Scale

Meta (Facebook) operates one of the largest distributed caching systems in the world, serving billions of reads per second from Memcache clusters. Their published research describes the consistency challenges of maintaining cache coherence across multiple data centers.

**The problem:** When a user updates their profile in the primary data center, the cache in remote data centers contains stale data. A user who updated their name might see the old name if their next request hits a remote data center.

**The solution:** Meta uses a system called McSqueal that tails the MySQL replication stream and invalidates cache entries in remote data centers when the underlying data changes. They also implement "remote markers" -- when a write occurs, a marker is set in the local cache indicating that the remote cache may be stale. Subsequent reads from the writing user are routed to the primary data center until the remote cache is confirmed to be updated.

This is a practical implementation of read-your-writes consistency across a globally distributed system. The engineering blog notes that perfect consistency across all caches is neither achievable nor necessary -- the goal is to prevent the most jarring user-visible inconsistencies.

### Amazon DynamoDB: Tunable Consistency

DynamoDB offers two consistency modes per read operation:

- **Eventually consistent reads** (default): May return stale data but have lower latency and higher throughput. DynamoDB's typical convergence window is under one second.
- **Strongly consistent reads**: Return the most recently committed value but have higher latency and consume more read capacity units.

This per-request tunability allows developers to choose the right consistency level for each use case within the same application. A shopping cart display can use eventually consistent reads (slight staleness is fine), while the checkout process uses strongly consistent reads (double-charging is not fine).

### Google Spanner: Global Strong Consistency

Google Spanner is the only globally distributed database that provides external consistency (stronger than linearizability) across all operations. It achieves this through TrueTime, a clock synchronization system using GPS receivers and atomic clocks in every data center.

Spanner's commit protocol waits for the uncertainty interval of the TrueTime clock to pass before confirming a write. This ensures that any subsequent read, from any node globally, will see the committed write. The cost is higher write latency (typically 10-15ms for single-region, higher for multi-region), but the benefit is that application developers never need to reason about consistency -- they get full ACID semantics globally.

### CockroachDB: Serializable by Default

CockroachDB provides serializable isolation (the strongest SQL isolation level) by default across a distributed cluster. Their approach uses a hybrid logical clock and a transaction protocol that detects and retries conflicts. Unlike most distributed databases that default to weaker consistency for performance, CockroachDB made the design decision that correctness is more important than raw throughput for their target market (OLTP applications migrating from single-node PostgreSQL).

## Quorum Reads and Writes

Quorum-based systems (Cassandra, Riak, DynamoDB under the hood) use a voting mechanism to achieve tunable consistency.

Given a replication factor `N` (total copies of data), a write quorum `W` (number of nodes that must acknowledge a write), and a read quorum `R` (number of nodes that must respond to a read):

- **Strong consistency:** `R + W > N` (read and write quorums overlap, guaranteeing at least one node has the latest value)
- **Common configuration:** `N=3, W=2, R=2` -- tolerates one node failure for both reads and writes
- **Write-optimized:** `N=3, W=1, R=3` -- fast writes, slow reads, but still consistent
- **Read-optimized:** `N=3, W=3, R=1` -- slow writes, fast reads, but any node failure blocks writes

**Sloppy quorums and hinted handoff:** During a partition, DynamoDB uses sloppy quorums -- writes can go to any `W` available nodes, not necessarily the designated replicas. Hinted handoff later delivers the write to the correct replicas when they recover. This improves availability at the cost of consistency guarantees.

## Decision Framework

### Choose Strong Consistency When...

- Incorrect data has financial, legal, or safety consequences
- You are building payment processing, booking systems, or inventory management
- The system operates within a single region (strong consistency is much cheaper without geographic distribution)
- You can tolerate higher write latency (10-50ms) for correctness

### Choose Causal Consistency When...

- Users must see their own actions reflected immediately
- Comment threads, chat, and collaborative documents need ordered operations
- You need better performance than strong consistency but more guarantees than eventual
- You can track causal dependencies in your application

### Choose Eventual Consistency When...

- Data is read-heavy and can tolerate seconds of staleness
- The system must remain available across multiple regions during partitions
- Analytics, dashboards, recommendation engines, and content feeds
- Conflict resolution is straightforward (last-writer-wins, or domain-specific merge logic)

## Common Mistakes

**1. Assuming "eventual" means "soon."** Eventual consistency provides no upper bound on convergence time. In practice, most systems converge within seconds, but under load or during network issues, convergence can take minutes. Design your application to handle this gracefully.

**2. Using eventual consistency for operations that require strong guarantees.** The classic example: checking if a username is available, then inserting it. Under eventual consistency, two concurrent requests can both see the username as available and both insert, creating a duplicate. Use strongly consistent operations for uniqueness constraints.

**3. Not implementing read-your-writes at the application layer.** Even if your database is eventually consistent, you can implement read-your-writes by routing reads from a user to the same replica that handled their writes, or by caching writes locally and merging with database reads.

**4. Ignoring the "E" in PACELC.** Many teams focus on partition behavior but ignore the latency-consistency trade-off during normal operation. If your global user base experiences 200ms read latency due to synchronous replication, you have a consistency-latency problem, not a CAP problem.

**5. Conflating isolation levels with consistency models.** Database isolation levels (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) govern concurrent transaction behavior on a single node. Consistency models govern how updates propagate across distributed replicas. They are related but distinct concepts.

**6. Over-engineering consistency.** Not every piece of data needs strong consistency. A user's "last seen" timestamp can be eventually consistent. Their account balance cannot. Analyze each data entity and assign the weakest consistency model that satisfies business requirements.

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Replication lag (per replica) | Measures staleness of eventually consistent reads | < 1s p99 for user-facing data |
| Stale read percentage | How often users see outdated data | < 0.1% for critical paths |
| Write confirmation latency | Cost of your consistency choice | < 50ms p99 for strong; < 10ms for eventual |
| Conflict rate (for multi-leader/CRDT) | Indicates how often concurrent writes collide | Trending stable or down |
| Quorum success rate | How often reads/writes achieve quorum | > 99.9% |
| Consistency violation incidents | Detected cases where guarantees were not met | Zero (any nonzero is a bug) |
| Cross-region write latency | Cost of geographic strong consistency | Track and report to product team for SLA decisions |

## References

- Eric Brewer, "CAP Twelve Years Later: How the 'Rules' Have Changed" (IEEE Computer, 2012)
- Seth Gilbert and Nancy Lynch, "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services" (2002)
- Daniel Abadi, "Consistency Tradeoffs in Modern Distributed Database System Design" (IEEE Computer, 2012) -- PACELC
- Meta engineering blog: "Scaling Memcache at Facebook" (NSDI 2013)
- Google, "Spanner: Google's Globally Distributed Database" (OSDI 2012)
- Amazon, "Dynamo: Amazon's Highly Available Key-value Store" (SOSP 2007)
- Martin Kleppmann, "Designing Data-Intensive Applications" (O'Reilly, 2017) -- Chapters 5, 7, 9
- CockroachDB blog: "Living Without Atomic Clocks" (2016) -- how CockroachDB achieves serializability without TrueTime
