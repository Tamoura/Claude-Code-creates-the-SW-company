# DealGate -- System Architecture (Part 2)

Continued from [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 7. API Architecture

- **Versioned REST**: All routes under `/api/v1/`
- **JSON Schema validation**: Fastify's built-in schema validation
- **Consistent response envelope**:
  ```json
  { "data": {...}, "meta": { "page": 1, "total": 42 } }
  ```
- **Error format** (RFC 7807):
  ```json
  { "error": "DEAL_NOT_FOUND", "message": "...", "statusCode": 404 }
  ```
- **Pagination**: Cursor-based for lists (keyset pagination), with `limit`
  and `cursor` parameters. Offset-based fallback for admin queries.
- **Rate limiting**: Per-tenant and per-user via Redis (sliding window).
- **CORS**: Configurable per tenant (white-label domains).

See [API.md](./API.md) for the complete route outline.

---

## 8. Multi-Tenancy Architecture

See ADR-001 for the full evaluation. Summary of chosen approach:

**Shared-schema with tenant_id discrimination** (row-level isolation).

### 8.1 Tenant Resolution

Tenants are resolved via subdomain or `X-Tenant-ID` header:
- `qdb.dealgate.qa` resolves to QDB tenant
- `qfc.dealgate.qa` resolves to QFC tenant
- `api.dealgate.qa` resolves to the default (ConnectSW) tenant

### 8.2 Isolation Guarantees

- All database queries filtered by `tenantId` via Prisma middleware
- Tenant config cached in Redis (branding, features, compliance rules)
- Separate S3 buckets/prefixes per tenant for document storage
- Webhook endpoints scoped to tenant
- API rate limits configurable per tenant

### 8.3 Customization Per Tenant

| Dimension | Mechanism |
|-----------|-----------|
| **Branding** | TenantBranding table (logo, colors, fonts, domain) |
| **Features** | Feature flags in TenantConfig (JSON object) |
| **Compliance** | Per-tenant investor classification rules, KYC thresholds |
| **Deal types** | Feature flags control which deal types are visible |
| **Integrations** | IntegrationConfig table with per-tenant credentials |

---

## 9. Integration Hub Architecture

See ADR-002 for the full evaluation. Summary:

**Adapter pattern with internal event bus** -- each external system has a
dedicated adapter implementing a standard interface. Domain events trigger
adapter calls via BullMQ job queues.

### 9.1 Adapter Interface

```typescript
interface IntegrationAdapter {
  readonly systemId: string;
  connect(config: IntegrationConfig): Promise<void>;
  sync(event: DomainEvent): Promise<SyncResult>;
  healthCheck(): Promise<HealthStatus>;
}
```

### 9.2 Integration Priority

| Priority | System | Adapter |
|----------|--------|---------|
| P0 (Prototype) | Mock/Stub adapters | StubAdapter (all systems) |
| P0 (MVP) | QCSD NIN verification | QcsdAdapter |
| P0 (MVP) | D365 CRM sync | Dynamics365Adapter |
| P1 | Email/SMS notifications | NotificationAdapter |
| P1 | LSEG market data | LsegAdapter |
| P2 | Finastra core banking | FinastraAdapter |
| P2 | Hedera DLT | HederaAdapter |

### 9.3 Webhook Delivery

Outbound webhooks for tenant integrations:
- HMAC-SHA256 signed payloads
- Exponential backoff retry (up to 72 hours)
- Dead-letter queue for failed deliveries
- Webhook event types: `deal.published`, `subscription.received`,
  `allocation.completed`, `deal.status_changed`

---

## 10. Event Architecture

### 10.1 Domain Events

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `DealCreated` | Issuer creates a deal | Audit, Notification |
| `DealPublished` | Deal status -> ACTIVE | Notification, Webhook, CRM |
| `DealStatusChanged` | Any deal status transition | Audit, Notification, Webhook |
| `SubscriptionReceived` | Investor subscribes | Audit, Issuer Notification, CRM |
| `SubscriptionApproved` | Issuer approves | Audit, Investor Notification |
| `AllocationCompleted` | Allocation finalized | Audit, Portfolio, Notification |
| `InvestorClassified` | Classification assigned | Audit, Eligibility Engine |
| `UserRegistered` | New user signup | Audit, Welcome Notification |

### 10.2 Implementation

- **In-process event emitter** for prototype (Fastify plugin)
- **BullMQ job queues** for async processing (notifications, webhooks, CRM sync)
- **Redis pub/sub** for real-time WebSocket updates to connected clients
- Events are persisted to the AuditLog table before processing

---

## 11. Security Architecture

### 11.1 Encryption

| Layer | Standard |
|-------|----------|
| In transit | TLS 1.3 (all connections) |
| At rest (database) | AES-256 (PostgreSQL tablespace encryption) |
| At rest (files) | AES-256 (S3 server-side encryption) |
| PII fields | AES-256-GCM field-level encryption (national ID, bank details) |

### 11.2 Audit Logging

- **Immutable**: AuditLog table with no UPDATE/DELETE permissions
- **Comprehensive**: Every state change on deals, subscriptions, users
- **Structured**: `{ actor, action, resource, resourceId, before, after, ip }`
- **Regulatory**: Retained minimum 5 years per Qatar AML law
- **Tamper-evident**: SHA-256 hash chain linking sequential entries

### 11.3 Data Protection (PDPPL Compliance)

- Explicit consent collection at registration
- Right to access, rectify, and erase personal data (API endpoints)
- Data Processing Impact Assessment documentation
- Payment data stored in Qatar-hosted infrastructure
- Cross-border transfers only with consent or legal necessity
- QFC data protection rules applied for QFC-licensed operations

### 11.4 Additional Security Measures

- **Rate limiting** per user and per tenant
- **Input validation** on all endpoints (JSON Schema)
- **SQL injection prevention** via Prisma parameterized queries
- **XSS prevention** via React's built-in escaping + CSP headers
- **CSRF protection** via SameSite cookies + CSRF tokens
- **Dependency scanning** via `npm audit` in CI pipeline

---

## 12. Scalability and Performance

### 12.1 Caching Strategy (Redis)

| Cache | TTL | Purpose |
|-------|-----|---------|
| Tenant config | 5 min | Avoid DB lookup on every request |
| Deal list (per tenant) | 1 min | Fast marketplace browsing |
| User session | 15 min | JWT validation bypass |
| Search results | 30 sec | Repeat search optimization |

### 12.2 Search Strategy

- **Prototype**: PostgreSQL full-text search with `tsvector` columns
- **Growth**: Elasticsearch for advanced faceted search, Arabic stemming
- **Search index**: Deal title (en/ar), description, sector, issuer name

### 12.3 Real-Time Updates

- **WebSocket** via Fastify WebSocket plugin
- **Channels**: `deals:{tenantId}`, `subscriptions:{dealId}`,
  `notifications:{userId}`
- **Use cases**: Live subscription count, deal status changes, new deal alerts

### 12.4 Performance Targets

| Metric | Prototype Target | Production Target |
|--------|-----------------|-------------------|
| API response (p95) | < 200ms | < 100ms |
| Page load (LCP) | < 2s | < 1.5s |
| Search results | < 500ms | < 200ms |
| Concurrent users | 100 | 10,000 |

---

## 13. Deployment Architecture

### 13.1 Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| Development | Local dev | Docker Compose (PostgreSQL, Redis) |
| Staging | Pre-production testing | AWS Bahrain (me-south-1) |
| Production | Live platform | AWS Bahrain (me-south-1, Multi-AZ) |

### 13.2 Container Strategy

- **Docker** containers for API and web services
- **ECS Fargate** for serverless container orchestration (production)
- **Docker Compose** for local development

### 13.3 CI/CD Pipeline (GitHub Actions)

```
Push -> Lint -> Type Check -> Unit Tests -> Integration Tests
  -> Build -> Deploy to Staging -> E2E Tests -> Deploy to Prod
```

### 13.4 Data Residency

- Primary database: AWS Bahrain region (me-south-1)
- Payment data: Qatar-hosted infrastructure (PDPPL requirement)
- Document storage: S3 in Bahrain region
- CDN: CloudFront with Middle East edge locations

---

## 14. Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./ADRs/ADR-001-multi-tenancy-strategy.md) | Multi-Tenancy Strategy | Proposed |
| [ADR-002](./ADRs/ADR-002-integration-hub-pattern.md) | Integration Hub Pattern | Proposed |
| [ADR-003](./ADRs/ADR-003-internationalization-approach.md) | Internationalization Approach | Proposed |
