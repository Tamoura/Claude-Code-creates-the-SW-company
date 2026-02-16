# ADR-010: Observability Stack — OpenTelemetry + Grafana

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice
**Category**: Observability

---

## Context

QDB One is a distributed system with 20+ services spanning authentication, identity resolution, event processing, multiple databases, and external integrations. To meet NFR-041 through NFR-044, every service must produce structured logs, distributed traces must span the full request path (frontend to database), and alerting must catch service degradation before users notice.

The system must correlate a user action (e.g., "Fatima clicks Sign Guarantee") across the WebSocket notification, GraphQL gateway, guarantee subgraph, OpenFGA authorization check, portal database query, Kafka event publication, audit service write, and notification delivery.

## Decision

Implement a unified observability stack based on **OpenTelemetry** for instrumentation and the **Grafana ecosystem** for storage and visualization:

### Three Pillars

1. **Logging**: Grafana Loki
   - All services log in structured JSON format with: `timestamp`, `level`, `service`, `traceId`, `spanId`, `personId`, `action`, `portal`, `duration_ms`
   - Log shipper: Fluent Bit (DaemonSet in Kubernetes)
   - Index per service: `qdb-one-gateway-*`, `qdb-one-mpi-*`, `portal-financing-*`, etc.

2. **Tracing**: Grafana Tempo
   - Distributed tracing via OpenTelemetry SDK in every service
   - TraceID propagated via HTTP `traceparent` header (W3C Trace Context)
   - Full trace from browser click to database query and back
   - Sampling: 100% for errors, 10% for normal requests in production

3. **Metrics**: Prometheus + Grafana
   - Service-level metrics: request rate, error rate, latency percentiles
   - Business metrics: login count, MPI match rate, consumer lag
   - Infrastructure metrics: CPU, memory, disk, network per pod
   - Custom dashboards per team (Auth, MPI, Pipeline, Frontend)

### Alerting Strategy

| Alert | Severity | Channel | Condition |
|-------|----------|---------|-----------|
| Service down | P1 | PagerDuty + SMS | Health check fails 3 consecutive times |
| Response time > 2s | P2 | Slack + Email | 95th percentile > 2000ms for 5 minutes |
| Error rate > 1% | P2 | Slack + Email | Error rate exceeds 1% for 5 minutes |
| Auth failure spike | P1 | PagerDuty + SMS | > 10 auth failures/minute |
| MPI match conflict | P3 | Email | Probabilistic match requires review |
| Kafka consumer lag | P2 | Slack | Consumer lag > 1,000 events for 10 minutes |
| Certificate expiry | P3 | Email | Certificate expires within 30 days |
| Disk usage > 80% | P3 | Slack | Any service disk exceeds 80% |

### Health Checks
- **Deep health checks** (not just HTTP 200): verify database connectivity, Kafka connectivity, external service reachability
- Run every 30 seconds
- Exposed via `/health/ready` (Kubernetes readiness) and `/health/live` (liveness)
- System health dashboard aggregates all service health checks (visible at `/admin/system`)

### Log Format Standard

```json
{
  "timestamp": "2026-02-15T10:30:00.123Z",
  "level": "info",
  "service": "financing-subgraph",
  "traceId": "abc-123-def-456",
  "spanId": "span-789",
  "personId": "mpi-uuid-12345",
  "action": "loan_application_submitted",
  "portal": "direct_financing",
  "duration_ms": 245,
  "metadata": { "applicationId": "LA-2025-456", "amount": 500000 }
}
```

## Consequences

### Positive
- Unified observability across all services (logs, traces, metrics in one platform)
- OpenTelemetry is vendor-neutral — can switch backends without re-instrumenting
- Grafana provides a single pane of glass for dashboards, alerts, and drill-down
- Distributed tracing enables rapid root cause analysis for cross-service issues
- All components are open-source (no licensing cost for observability)
- personId in every log enables "show me everything this user experienced" queries

### Negative
- Observability infrastructure itself requires maintenance (Loki, Tempo, Prometheus, Grafana)
- Log and trace volume can be significant — requires adequate storage provisioning
- OpenTelemetry SDK adds a small overhead to every request (typically < 1ms)
- Must instrument all existing portal code (if it does not already produce structured logs)

### Risks
- Storage costs for logs and traces. **Mitigation**: Log retention policy (30 days hot, 90 days warm, 1 year cold); trace sampling at 10% for normal requests; 100% only for errors.
- Alert fatigue from too many notifications. **Mitigation**: Start with few critical alerts; tune thresholds based on production baseline; use P3 for informational alerts (email only).

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. ELK Stack (Elasticsearch + Logstash + Kibana)** | Mature, well-known | Heavy resource usage, Elastic license changes, separate tracing needed | Grafana ecosystem is lighter and covers all three pillars |
| **B. Datadog / New Relic (SaaS)** | Fully managed, excellent UX | SaaS = data leaves Qatar (sovereignty concern), expensive at scale | NFR-022 (data sovereignty) |
| **C. Grafana ecosystem** (selected) | Open-source, lightweight, covers logs+traces+metrics, self-hosted | Must manage infrastructure | Best fit for on-premise, data-sovereign deployment |
| **D. Custom logging only** | Simple | No tracing, no metrics correlation, no alerting framework | Insufficient for distributed system debugging |
