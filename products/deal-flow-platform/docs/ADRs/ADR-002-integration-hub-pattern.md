# ADR-002: Integration Hub Pattern

## Status

Proposed

## Context

DealGate must integrate with 13+ enterprise systems across Qatar's financial
ecosystem: CRM (D365, Salesforce), core banking (Finastra), trading (LSEG/FIX),
depository (QCSD), regulatory (QFMA), payment (QCB/BUNA/AFAQ), identity (NAS),
DLT (Hedera), and more. These integrations span different protocols (REST, FIX,
ISO 20022, SOAP), authentication methods, data formats, and reliability
guarantees.

Key requirements:
- **Prototype**: All integrations stubbed with mock adapters
- **MVP**: QCSD NIN, D365 CRM, email/SMS live
- **Growth**: Progressive activation of adapters without core changes
- **Multi-tenant**: Each tenant may have different integration credentials
- **Reliability**: Failed integration calls must not block core operations
- **Auditability**: All integration calls logged for regulatory compliance

## Decision

**Adapter pattern with internal event bus (BullMQ)**. Each external system
has a dedicated adapter class implementing a standard `IntegrationAdapter`
interface. Domain events produced by the core platform are consumed by
integration adapters via BullMQ job queues, decoupling core business logic
from external system availability.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   DealGate Core                         │
│                                                         │
│  DealService ──> EventBus.emit('deal.published')       │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │   BullMQ Queue   │                       │
│              │  'integrations'  │                       │
│              └────────┬─────────┘                       │
│                       │                                 │
│         ┌─────────────┼─────────────┐                  │
│         ▼             ▼             ▼                   │
│  ┌────────────┐ ┌──────────┐ ┌───────────┐            │
│  │ CRM        │ │ QCSD     │ │ Webhook   │            │
│  │ Adapter    │ │ Adapter  │ │ Adapter   │            │
│  │ (D365)     │ │ (NIN)    │ │ (Tenant)  │            │
│  └─────┬──────┘ └────┬─────┘ └─────┬─────┘            │
└────────┼──────────────┼─────────────┼──────────────────┘
         ▼              ▼             ▼
   D365 REST API   QCSD API    Tenant Webhook URL
```

### Adapter Interface

```typescript
interface IntegrationAdapter {
  readonly systemId: string;
  readonly systemName: string;

  // Lifecycle
  initialize(config: IntegrationConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  // Event processing
  handleEvent(event: DomainEvent): Promise<AdapterResult>;

  // Direct operations (for request-response patterns)
  execute(operation: string, params: unknown): Promise<AdapterResult>;
}
```

### Stub Adapter (Prototype)

Every integration ships with a `StubAdapter` that returns realistic mock
data. The stub is the default when no live credentials are configured for a
tenant. This allows the prototype to demonstrate integration flows
(CRM sync, NIN verification) without live connections.

```typescript
class StubQcsdAdapter implements IntegrationAdapter {
  async execute(operation: 'verifyNin', params: { nin: string }) {
    return { success: true, data: { verified: true, name: 'Test Investor' } };
  }
}
```

### Configuration Per Tenant

Integration credentials and settings are stored in the `IntegrationConfig`
table, scoped by `tenantId` and `systemId`. Credentials are encrypted at
rest (AES-256-GCM). Each tenant can independently enable/disable integrations
and provide their own credentials.

## Consequences

### Positive

- **Decoupled**: Core platform never waits on external systems (async via queue)
- **Progressive**: Swap stub for live adapter per tenant without code changes
- **Testable**: Stub adapters enable full E2E testing without live dependencies
- **Resilient**: BullMQ retry with exponential backoff handles transient failures
- **Multi-tenant**: Each tenant configures its own integration credentials
- **Auditable**: All adapter calls logged with request/response data
- **Extensible**: Adding a new integration = implementing the adapter interface

### Negative

- **Eventual consistency**: CRM sync is not real-time (seconds delay via queue)
- **Adapter maintenance**: Each adapter requires ongoing maintenance as external
  APIs evolve
- **Debugging complexity**: Async event flow harder to trace than direct calls.
  Mitigated by correlation IDs on all events and structured logging.
- **Queue infrastructure**: Requires Redis for BullMQ. Already needed for
  caching, so this is a marginal cost.

### Neutral

- Adapter count grows linearly with integrations (expected: 8-15 adapters)
- BullMQ dashboard (Bull Board) provides visibility into queue health

## Alternatives Considered

### Full Message Bus (RabbitMQ / NATS)

- **Pros**: True publish-subscribe; better for microservices; supports complex
  routing topologies; persistent message storage
- **Cons**: Additional infrastructure component (RabbitMQ/NATS server);
  operational complexity; overkill for a monolithic Fastify application with
  8-15 integrations; learning curve for the team
- **Why rejected**: DealGate is a monolith (Fastify), not microservices.
  BullMQ provides sufficient pub-sub semantics via Redis, which is already
  in the stack. Adding RabbitMQ/NATS adds operational cost without
  proportional benefit at this scale.

### API Gateway Proxy (Kong / AWS API Gateway)

- **Pros**: Centralized routing, rate limiting, and transformation; handles
  protocol translation; rich plugin ecosystem
- **Cons**: Additional infrastructure layer; does not solve the adapter logic
  (business-level data mapping); adds latency; vendor lock-in risk; expensive
  at scale; does not handle async event-driven patterns
- **Why rejected**: API gateways handle routing and protocol concerns, but
  DealGate's integrations require business-level data transformation
  (mapping DealGate events to D365 entities, translating NIN verification
  responses, etc.). The adapter pattern handles both routing and business
  logic in one place. An API gateway may be added later as a layer in front
  of adapters for rate limiting and monitoring.

### Direct Service Calls (No Abstraction)

- **Pros**: Simplest implementation; no queue infrastructure
- **Cons**: Tight coupling to external APIs; no retry/resilience; external
  system downtime blocks core operations; no stub capability for testing;
  every integration has different error handling
- **Why rejected**: Unacceptable for a financial platform where external
  system availability cannot impact core deal and subscription operations.

## References

- Product Concept Section 11 (Enterprise Integration Architecture)
- Product Concept Section 11.2 (Integration Points Matrix)
- BullMQ documentation: https://docs.bullmq.io/
- Adapter pattern (Gang of Four)
