# Event-Driven Architecture: Decoupling Systems Through Asynchronous Communication

## Overview

Event-driven architecture (EDA) is a design paradigm where system components communicate by producing and consuming events rather than making direct synchronous calls. An event represents a fact that something happened: "order placed," "payment received," "user signed up." This decouples producers from consumers, enabling systems to scale independently, tolerate failures gracefully, and evolve without cascading changes across service boundaries. EDA is not a replacement for synchronous communication but a complement that excels when temporal decoupling, independent scalability, or complex event processing are requirements.

## When to Use / When NOT to Use

| Factor | Use Event-Driven | Use Synchronous |
|--------|-----------------|-----------------|
| Response requirement | Caller does not need an immediate result | Caller blocks until a result is returned |
| Coupling tolerance | Producers should not know about consumers | Tight contract between caller and callee is acceptable |
| Processing latency | Seconds or minutes of delay are acceptable | Sub-second response required |
| Fan-out needs | One event triggers actions in multiple services | One-to-one communication between two services |
| Failure handling | Work can be retried later without user-facing impact | Failure must be communicated immediately to the user |
| Data flow complexity | Complex workflows spanning multiple services | Simple request-response interactions |
| Audit requirements | Complete audit trail of all state changes needed | Current state is sufficient |

## Event Sourcing vs Event-Driven Architecture

These terms are frequently conflated, but they describe different things.

**Event-driven architecture** is a communication pattern. Services emit events when things happen, and other services react to those events. The events are a means of coordination. A service that places an order emits an "OrderPlaced" event. The inventory service, billing service, and notification service all consume this event and act independently. The order service neither knows nor cares who is listening.

**Event sourcing** is a data storage pattern. Instead of storing the current state of an entity, you store the sequence of events that led to that state. The current state is derived by replaying events. A bank account's balance is not stored directly; instead, every deposit, withdrawal, and transfer is stored as an event, and the balance is computed by replaying them. Event sourcing gives you a complete audit trail, the ability to reconstruct state at any point in time, and natural support for temporal queries.

You can use event-driven architecture without event sourcing (most systems do), and you can use event sourcing without a broader event-driven architecture. They compose well together, but treating them as synonymous leads to overengineering simple systems.

## Messaging Patterns

### Publish/Subscribe (Pub/Sub)

A producer publishes an event to a topic. All subscribers to that topic receive a copy of the event. Producers do not know how many subscribers exist or who they are. This enables fan-out: one event triggers independent processing in multiple services.

**Use when:** Multiple services need to react to the same event. For example, when a user signs up, the welcome email service, analytics service, and CRM sync service all need to know, but the signup service should not be coupled to any of them.

### Point-to-Point (Queue)

A producer sends a message to a queue. Exactly one consumer picks up each message and processes it. If multiple consumers are subscribed, the message broker distributes messages across them for parallel processing, but each message is processed exactly once.

**Use when:** You need work distribution, not fan-out. A queue of image processing jobs distributed across a pool of workers is a point-to-point pattern.

### Event Streaming

Unlike traditional messaging where consumed messages are removed, event streaming (Kafka's model) retains events in an ordered, immutable log for a configurable retention period. Consumers maintain their own read position (offset) in the log. This means new consumers can start from the beginning of the log and process the entire history, enabling replay and reprocessing.

**Use when:** You need durable, ordered events that can be replayed. Stream processing, audit trails, and event sourcing all benefit from this model.

## Technology Comparison

### Apache Kafka

Kafka is a distributed event streaming platform designed for high throughput and durability. Events are written to partitioned topics and retained for a configurable period (days, weeks, or indefinitely). Kafka excels at high-volume event streaming where ordering within a partition matters. LinkedIn, where Kafka was created, processes over 7 trillion messages per day through Kafka. Kafka's operational complexity is significant: you manage brokers, ZooKeeper (or KRaft in newer versions), topic partitioning strategies, consumer group rebalancing, and schema evolution. Kafka is not a good fit for low-volume, simple pub/sub where the operational overhead outweighs the benefits.

### RabbitMQ

RabbitMQ is a traditional message broker implementing AMQP. It supports flexible routing through exchanges (direct, fanout, topic, headers), message acknowledgment, and dead letter queues. RabbitMQ excels at task distribution, request-reply patterns, and scenarios where rich routing logic is needed. It is simpler to operate than Kafka but does not provide the same durability guarantees or replay capability. Messages are removed after consumption. RabbitMQ is a strong choice for workload distribution and traditional pub/sub where event replay is not a requirement.

### Amazon SQS / SNS

SQS provides managed queuing (point-to-point) and SNS provides managed pub/sub. Together they cover most messaging patterns with zero operational overhead. SQS guarantees at-least-once delivery with configurable visibility timeouts and dead letter queues. SNS fans out messages to multiple SQS queues, Lambda functions, or HTTP endpoints. The managed nature eliminates broker management but limits customization. SQS does not guarantee ordering (standard queues) unless you use FIFO queues, which have lower throughput limits (3,000 messages per second with batching).

### Cloud-Native Alternatives

Google Pub/Sub, Azure Event Hubs, and AWS EventBridge are managed alternatives with varying feature sets. EventBridge is particularly interesting for event-driven architectures because it supports schema registries, content-based filtering, and native integration with over 90 AWS services. For teams on AWS, EventBridge is often a simpler starting point than Kafka for event routing.

## The Saga Pattern (Brief Overview)

Distributed transactions across services cannot use traditional ACID transactions. The Saga pattern replaces a single distributed transaction with a sequence of local transactions, each publishing an event that triggers the next step. If any step fails, compensating transactions undo the previous steps. See the dedicated saga-pattern.md document for detailed coverage of choreography vs orchestration, compensating transactions, and failure handling strategies.

## Real-World Examples

### LinkedIn: Kafka's Origin Story

LinkedIn created Kafka in 2010 to solve a specific problem: their data pipeline was a tangle of point-to-point connections between systems. Activity data (page views, searches, connections) needed to flow to the data warehouse, search index, monitoring systems, and recommendation engine. With direct connections, adding a new consumer meant modifying the producer. Kafka's log-based model decoupled all of this. Producers write to topics, consumers read at their own pace, and adding a new consumer requires zero changes to producers. Jay Kreps, Kafka's co-creator, described this as turning the data pipeline inside out: instead of each system pulling data from sources, all data flows through a central, ordered log that any system can tap into. By 2023, LinkedIn operated Kafka clusters processing over 7 trillion messages per day across hundreds of topics.

### Uber: Event-Driven Trip Processing

Uber's trip lifecycle is a textbook event-driven architecture. When a rider requests a trip, the system emits a "TripRequested" event. The matching service consumes this and emits "DriverMatched." The driver's acceptance triggers "TripAccepted." Each state change in the trip lifecycle is an event that multiple services react to: the pricing service calculates fare estimates, the ETA service updates arrival times, the notification service sends push notifications, and the analytics service logs data for demand forecasting. This design lets Uber evolve each service independently. When they added Uber Eats, the notification service did not need to change; it simply consumed events from a new topic with the same interface. Uber's custom event platform, formerly called uReplicator (built on top of Kafka), handles cross-datacenter event replication for global availability.

### Stripe: Event-Driven Webhook System

Stripe's webhook system is one of the most widely used event-driven APIs in fintech. When a payment succeeds, a subscription renews, or a dispute is filed, Stripe publishes an event. Merchants subscribe to these events via webhooks, and Stripe delivers them with retry logic and exponential backoff. Stripe's event delivery system ensures at-least-once delivery: if a merchant's endpoint is down, Stripe retries with increasing intervals for up to 72 hours. This design decouples Stripe's internal processing from merchant integration timelines. Merchants process events when they can, and Stripe does not block on merchant responses.

### DoorDash: Event-Driven Order Orchestration

DoorDash processes millions of food delivery orders through an event-driven architecture built on Apache Kafka. When a customer places an order, the system publishes an "OrderCreated" event. The restaurant confirmation service, Dasher assignment service, payment processing service, and real-time tracking service all consume this event independently. DoorDash's engineering team documented how this architecture enabled them to scale from processing thousands to millions of daily orders without redesigning inter-service communication. They also use Kafka Streams for real-time aggregation of delivery metrics, which feeds their operational dashboards and automated alerting.

## Decision Framework

**Choose Kafka when:**
- You need durable, ordered event streams with replay capability
- Your throughput exceeds 100,000 events per second
- Multiple consumers need to process the same events at different paces
- You have the operational capacity to manage Kafka clusters (or use a managed service like Confluent Cloud, Amazon MSK)
- Event sourcing is part of your data strategy

**Choose RabbitMQ when:**
- You need flexible message routing (topic-based, header-based, direct)
- Your primary use case is work distribution across consumers
- You need request-reply messaging patterns
- Throughput is moderate (thousands to tens of thousands of messages per second)
- You do not need event replay or long-term event storage

**Choose SQS/SNS (or equivalent managed service) when:**
- You want zero operational overhead for messaging infrastructure
- Your architecture is cloud-native on a single provider
- At-least-once delivery with dead letter queues meets your needs
- You do not need cross-consumer replay or ordered processing (or can use FIFO queues for ordering)

**Choose EventBridge when:**
- You need content-based event filtering (routing events based on payload content)
- Your architecture integrates heavily with AWS services
- Schema evolution and event schema registry are important
- You want a managed service with built-in routing rules

## Common Mistakes

**Not designing for idempotency.** In any at-least-once delivery system, consumers will occasionally receive the same event twice. If your consumer is not idempotent, duplicate processing causes data corruption. Every event consumer must handle duplicates safely, typically by checking whether the event has already been processed (using an idempotency key or event ID).

**Treating events as commands.** An event says "something happened" (OrderPlaced). A command says "do something" (ProcessPayment). When you design events as commands, you reintroduce coupling: the producer dictates what the consumer should do. Design events as facts about past state changes and let consumers decide how to react.

**No dead letter queue.** When a consumer cannot process an event (malformed payload, transient downstream failure that exhausts retries), the event must go somewhere. Without a dead letter queue, it is either retried forever (blocking subsequent events) or silently dropped (data loss). Every queue and subscription should have a dead letter queue with alerting.

**Schema evolution without a strategy.** As your system evolves, event schemas change. Adding fields is backward-compatible. Removing or renaming fields breaks consumers. Use a schema registry (Confluent Schema Registry, AWS Glue Schema Registry) and follow a compatibility policy: backward-compatible changes are safe for deployment in any order; breaking changes require consumer updates before producer updates.

**Ignoring event ordering.** If your system processes "OrderCreated" after "OrderShipped" because of network delays or partition reassignment, business logic breaks. When ordering matters, use partitioning keys (all events for the same order go to the same partition) and process within a partition sequentially.

**Over-eventing.** Not everything needs to be an event. When two services have a simple request-response interaction and the caller needs an immediate result, a synchronous HTTP or gRPC call is simpler, faster, and easier to debug. Use events for decoupling, not as a universal communication mechanism.

## Key Metrics to Track

| Metric | What It Tells You | Target |
|--------|-------------------|--------|
| Event processing latency (p50, p95, p99) | How long from event production to consumption | Depends on SLA; under 1 second for most real-time systems |
| Consumer lag | How far behind consumers are from the latest event | Near zero for real-time; bounded for batch |
| Dead letter queue depth | How many events are failing processing | Zero in steady state; alert on any growth |
| Event throughput (events/second) | System volume and capacity utilization | Monitor for capacity planning |
| Duplicate event rate | How often consumers see the same event twice | Should be low; high rates indicate delivery issues |
| Consumer processing error rate | How often consumers fail to process events | Under 0.1% |
| Event schema compatibility violations | Whether producers are publishing events that break consumers | Zero |
| End-to-end event delivery time | Total time from event creation to all consumers completing processing | Defined per-workflow SLA |

## References

- Kreps, J. "The Log: What every software engineer should know about real-time data's unifying abstraction." LinkedIn Engineering Blog, 2013.
- Kreps, J., Narkhede, N., Rao, J. "Kafka: a Distributed Messaging System for Log Processing." NetDB Workshop, 2011.
- Kleppmann, M. "Designing Data-Intensive Applications." O'Reilly Media, 2017.
- Richardson, C. "Microservices Patterns." Manning Publications, 2018.
- Uber Engineering. "Building Reliable Reprocessing and Dead Letter Queues with Apache Kafka." Uber Engineering Blog, 2018.
- DoorDash Engineering. "Building Scalable Real-Time Event Processing with Kafka and Flink." DoorDash Engineering Blog, 2021.
- Stripe. "Webhooks Best Practices." Stripe Documentation.
- Confluent. "Kafka Streams Developer Guide." Confluent Documentation.
