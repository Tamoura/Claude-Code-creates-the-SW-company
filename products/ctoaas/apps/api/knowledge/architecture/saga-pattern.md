# Saga Pattern: Managing Distributed Transactions Without Two-Phase Commit

## Overview

The Saga pattern coordinates multi-step business transactions across multiple services by breaking a single logical transaction into a sequence of local transactions, each with a corresponding compensating transaction that undoes its effect if a later step fails. Unlike two-phase commit (2PC), which locks resources across services until all participants agree to commit, sagas release resources after each local transaction, trading strong consistency for availability and partition tolerance. Sagas are the primary mechanism for maintaining data consistency across service boundaries in a microservices architecture.

## When to Use / When NOT to Use

| Factor | Use Saga Pattern | Use Alternative |
|--------|-----------------|-----------------|
| Transaction scope | Spans 3+ services | Contained within a single database (use ACID) |
| Latency tolerance | Seconds of delay between steps are acceptable | Sub-second end-to-end consistency required (consider 2PC or shared DB) |
| Failure frequency | Failures are expected and recoverable | Failures are rare and catastrophic (consider manual intervention) |
| Compensability | Every step can be logically reversed or compensated | Some steps are irreversible (e.g., sending a physical letter) |
| Service autonomy | Services are independently deployed and owned by different teams | Single team owns all involved services |
| Consistency model | Eventual consistency is acceptable for the business process | Strong consistency is a regulatory requirement |

## Trade-offs

### Saga Advantages

**No distributed locks.** Each service commits its local transaction independently and immediately releases database locks. This avoids the performance bottleneck and deadlock risks of 2PC, where all participants hold locks until the coordinator decides to commit or abort.

**Failure isolation.** If one service is down, only the affected saga is impacted. Other sagas involving different services continue processing. In 2PC, a single unresponsive participant blocks all participants from committing.

**Service autonomy.** Each service manages its own data and transactions without needing to participate in a distributed transaction protocol. Services can be deployed, scaled, and maintained independently.

### Saga Disadvantages

**Complexity.** Every step needs a compensating transaction. The compensation logic is often more complex than the forward logic. Reversing a payment is not simply deleting a row; it involves creating a refund record, notifying the customer, updating analytics, and potentially interacting with external payment processors.

**Intermediate inconsistency.** Between steps, the system is in a partially completed state. A customer might see their payment processed before their order is confirmed. Your UI and API must handle these intermediate states gracefully.

**No isolation.** Concurrent sagas operating on the same data can interfere with each other. If two sagas both try to reserve the last item in inventory, one will succeed and one will need to compensate. This requires careful design of idempotency and conflict resolution.

**Testing difficulty.** Testing all possible failure paths through a multi-step saga is combinatorially complex. A five-step saga has five possible failure points, each requiring different compensation paths. Automated testing frameworks for sagas are still maturing.

## Choreography vs Orchestration

### Choreographed Sagas

In choreography, each service knows what event to emit after completing its step, and which events to listen for. There is no central coordinator. The saga proceeds through a chain of events.

**Example flow (e-commerce order):**
1. Order Service creates order (status: PENDING) and emits `OrderCreated`
2. Payment Service listens for `OrderCreated`, processes payment, emits `PaymentProcessed`
3. Inventory Service listens for `PaymentProcessed`, reserves items, emits `InventoryReserved`
4. Shipping Service listens for `InventoryReserved`, creates shipment, emits `ShipmentCreated`
5. Order Service listens for `ShipmentCreated`, updates order status to CONFIRMED

**Compensation flow (payment fails):**
1. Payment Service fails to process payment, emits `PaymentFailed`
2. Order Service listens for `PaymentFailed`, updates order to CANCELLED

**Compensation flow (inventory reservation fails after payment):**
1. Inventory Service cannot reserve items, emits `InventoryReservationFailed`
2. Payment Service listens for `InventoryReservationFailed`, refunds payment, emits `PaymentRefunded`
3. Order Service listens for `PaymentRefunded`, updates order to CANCELLED

**Choreography advantages:** No single point of failure. Adding a new step means adding a new service that listens for the appropriate event. Loose coupling.

**Choreography disadvantages:** The saga's overall flow is implicit, spread across multiple services. Debugging requires correlating events across services with a correlation ID. As the number of steps grows, the event chains become difficult to reason about. Adding conditional logic (skip shipping for digital goods) requires modifying multiple services.

**Use choreography when:** The saga has 3-5 steps, the flow is linear, and the team values loose coupling over visibility.

### Orchestrated Sagas

In orchestration, a central saga orchestrator (sometimes called a saga execution coordinator) manages the saga's state and tells each service what to do. The orchestrator sends commands to services and processes their responses.

**Example flow (same e-commerce order):**
1. Orchestrator creates saga, sends `ProcessPayment` command to Payment Service
2. Payment Service processes payment, responds with success
3. Orchestrator sends `ReserveInventory` command to Inventory Service
4. Inventory Service reserves items, responds with success
5. Orchestrator sends `CreateShipment` command to Shipping Service
6. Shipping Service creates shipment, responds with success
7. Orchestrator updates order to CONFIRMED

**Compensation flow (inventory fails):**
1. Orchestrator receives failure from Inventory Service
2. Orchestrator sends `RefundPayment` command to Payment Service
3. Payment Service processes refund, responds with success
4. Orchestrator updates order to CANCELLED

**Orchestration advantages:** The saga's flow is explicit and centralized. Adding conditional logic, parallel steps, or timeout handling is straightforward. Debugging is simpler because the orchestrator maintains the saga's current state and step history. The orchestrator naturally provides a saga log for observability.

**Orchestration disadvantages:** The orchestrator is a single point of coordination (though not a single point of failure if built with redundancy). Services receive commands, creating a slight coupling to the orchestrator's interface. The orchestrator can become a bottleneck if not scaled properly.

**Use orchestration when:** The saga has more than 5 steps, includes conditional branches or parallel steps, or when visibility into saga state is important for operations.

## Compensating Transactions

Compensating transactions are the core mechanism that makes sagas work. A compensating transaction semantically undoes the effect of a previous step, but it does not literally undo it. The original transaction happened; the compensation creates a new fact that reverses its business effect.

**Key principles:**

**Compensation is not deletion.** When you compensate a payment, you do not delete the payment record. You create a refund record. The audit trail shows both the payment and the refund. This is critical for financial compliance and debugging.

**Compensation must be idempotent.** If the compensation command is delivered twice (due to network retries), executing it twice must produce the same result as executing it once. Check whether compensation has already been applied before applying it again.

**Some actions cannot be compensated.** Sending an email, shipping a physical product, or calling an external API with side effects cannot be undone. For these steps, use a "pivot transaction" pattern: place them as late as possible in the saga, after all compensable steps have succeeded. The pivot transaction is the point of no return.

**Compensation order is the reverse of execution order.** If the saga executed steps A, B, C and C fails, compensate B first, then A. This ensures that dependencies are unwound correctly.

## Real-World Examples

### Halo: Saga Orchestration at 11.6M Concurrent Users

343 Industries, the developer of Halo, implemented the saga pattern to manage multiplayer game session lifecycle at scale. During Halo's peak, the system handled 11.6 million concurrent users, each participating in game sessions that required coordinated state across matchmaking, player inventory, stats tracking, and session management services. Their saga orchestrator managed the lifecycle of each game session: matching players, loading player profiles and inventories, creating the game session, and recording results afterward. If the matchmaking step succeeded but session creation failed, the orchestrator compensated by releasing the matched players back into the matchmaking pool and reverting any temporary inventory locks. The orchestrator maintained saga state in a durable store, allowing recovery after orchestrator crashes without losing in-progress sagas.

### Amazon: Order Processing Pipeline

Amazon's order processing system is a well-known implementation of the saga pattern, though Amazon refers to it as a "pipeline" rather than explicitly calling it a saga. When a customer places an order, the system executes a sequence of steps: validate the order, authorize payment, reserve inventory, schedule fulfillment, and confirm the order. Each step is a separate service with its own database. If inventory reservation fails (out of stock), the system compensates by reversing the payment authorization and notifying the customer. Amazon's system handles millions of orders per day, and the saga pattern allows each service to scale independently and fail independently without blocking the entire order pipeline.

### Uber: Trip Lifecycle as a Saga

Uber's trip processing implements a saga pattern across multiple services. A trip request initiates a saga that coordinates pricing, driver matching, payment authorization, and trip tracking. If a driver cancels after being matched, the saga compensates by releasing the payment authorization, re-entering the trip into the matching queue, and updating the rider's app. If the payment authorization fails after driver matching, the saga compensates by releasing the driver and notifying the rider. Uber uses an orchestrator approach because trip lifecycle involves conditional branches (surge pricing, pool rides, scheduled rides) that would be difficult to manage with choreography.

### Airbnb: Booking Coordination

Airbnb's booking flow coordinates across listing availability, payment processing, host notification, and guest confirmation. Their saga ensures that a listing is not double-booked even under high contention. The saga first places a temporary hold on the listing, then processes payment, then confirms with the host. If payment fails, the hold is released. If the host rejects (within their response window), payment is refunded and the hold is released. Airbnb's engineering team has discussed how they handle the "pivot transaction" problem: the payment charge is the point of no return, placed after all reversible steps.

## Failure Handling Strategies

### Retry with Backoff

Before triggering compensation, retry the failing step with exponential backoff. Many failures are transient (network timeouts, temporary service unavailability). Set a maximum retry count (typically 3-5 attempts) and a maximum retry duration (typically 30-60 seconds). Only trigger compensation after retries are exhausted.

### Timeout-Based Compensation

Set a deadline for each saga step. If a step does not complete within the deadline, assume failure and begin compensation. This prevents sagas from hanging indefinitely when a service is unresponsive. Choose timeouts carefully: too short triggers false compensations; too long leaves the system in an inconsistent state longer than necessary.

### Dead Letter and Manual Resolution

When compensation itself fails (the payment service is down and cannot process a refund), the saga enters a "stuck" state. Route stuck sagas to a dead letter queue and alert operations for manual resolution. Provide tooling that shows the saga's current state, which steps completed, and which compensation steps failed.

### Saga State Machine

Model each saga as a finite state machine with explicit states for each step's success and failure. This makes the saga's behavior deterministic and testable. States like PAYMENT_PENDING, PAYMENT_SUCCEEDED, INVENTORY_RESERVING, INVENTORY_FAILED, COMPENSATING_PAYMENT, COMPENSATION_COMPLETE make the saga's progression explicit and debuggable.

## Saga vs Two-Phase Commit (2PC)

| Dimension | Saga | Two-Phase Commit |
|-----------|------|-----------------|
| Consistency | Eventual (ACD from ACID) | Strong (full ACID) |
| Availability | High (no distributed locks) | Lower (participants blocked during prepare phase) |
| Latency | Lower per-step (immediate local commits) | Higher (all participants wait for coordinator) |
| Failure handling | Compensating transactions | Coordinator timeout and rollback |
| Scalability | High (services scale independently) | Limited (coordinator is bottleneck) |
| Implementation complexity | High (compensation logic) | Moderate (protocol is well-defined) |
| Network partition tolerance | Tolerant (eventual reconciliation) | Intolerant (partition can block commits) |

**Choose 2PC when:** You have 2-3 tightly coupled services within the same datacenter, strong consistency is a regulatory requirement (financial settlement), and latency of the prepare phase is acceptable.

**Choose sagas when:** You have 3+ independently deployed services, services may be in different datacenters or clouds, availability is more important than immediate consistency, and the business process can tolerate seconds of delay between steps.

## Decision Framework

**Choose choreographed sagas when:**
- The saga has 3-5 linear steps without conditional branches
- Teams owning each service want full autonomy over their step's implementation
- You prefer loose coupling and are willing to invest in distributed tracing for visibility
- Adding new consumers of existing events is a common pattern

**Choose orchestrated sagas when:**
- The saga has more than 5 steps or includes conditional logic
- You need centralized visibility into saga state for operations and debugging
- The saga includes parallel steps (e.g., reserve inventory AND authorize payment simultaneously)
- You need timeout management and automatic compensation
- Regulatory requirements demand an audit trail of saga execution

**Choose 2PC when:**
- Two services share a database or are colocated in the same process
- The transaction is simple (debit account A, credit account B) and must be atomic
- Both services are always available simultaneously

## Common Mistakes

**No saga identifier.** Every saga instance needs a unique ID that propagates through all steps and events. Without it, correlating events across services during debugging is nearly impossible. Use a UUID generated at saga creation and include it in every message.

**Not handling partial failures in compensation.** Compensation can fail too. If the refund service is down when you need to reverse a payment, your saga is stuck in an inconsistent state. Design compensation to be retryable and idempotent, and have a dead letter mechanism for compensations that exhaust retries.

**Ignoring concurrent saga conflicts.** Two sagas might both try to reserve the last item in inventory. The first succeeds; the second must compensate. Design services to handle optimistic concurrency (version numbers, conditional updates) and return clear failure codes that the saga can interpret.

**Monolithic orchestrator.** Putting all saga orchestration logic in a single service creates a deployment bottleneck. Use one orchestrator per business domain (order saga orchestrator, onboarding saga orchestrator) rather than a single mega-orchestrator.

**No saga timeout.** A saga that never completes ties up resources indefinitely. Every saga must have a maximum execution time. When exceeded, automatically trigger compensation and alert operations.

**Skipping the state machine.** Implementing saga logic with ad-hoc if/else chains instead of an explicit state machine leads to bugs when unexpected events arrive out of order. Model your saga as a state machine from the start.

## Key Metrics to Track

| Metric | What It Tells You | Target |
|--------|-------------------|--------|
| Saga completion rate | Percentage of sagas that complete successfully | Above 99% |
| Saga compensation rate | How often compensations are triggered | Below 1% in steady state |
| Saga duration (p50, p95, p99) | End-to-end time for saga completion | Defined per-saga SLA |
| Compensation success rate | Whether compensations are working reliably | 100% (failures go to dead letter) |
| Stuck saga count | Sagas that are neither completed nor compensated | Zero (alert on any) |
| Step-level failure rate | Which saga steps fail most often | Identify and fix the weakest link |
| Concurrent saga count | How many sagas are in progress simultaneously | Monitor for capacity |
| Dead letter queue depth for sagas | Sagas requiring manual intervention | Zero in steady state |

## References

- Garcia-Molina, H. and Salem, K. "Sagas." ACM SIGMOD Conference, 1987.
- Richardson, C. "Microservices Patterns." Manning Publications, 2018. Chapter 4: Managing Transactions with Sagas.
- 343 Industries. "Building the Halo Multiplayer Experience at Scale." GDC Talks, various years.
- Kleppmann, M. "Designing Data-Intensive Applications." O'Reilly Media, 2017.
- Uber Engineering. "Cadence: The Workflow Engine for Microservices." Uber Engineering Blog, 2020.
- Richardson, C. "Saga Pattern." microservices.io.
- Newman, S. "Building Microservices." O'Reilly Media, 2nd Edition, 2021.
