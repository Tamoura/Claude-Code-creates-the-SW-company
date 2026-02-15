# ADR-009: Deployment Strategy — On-Premise Kubernetes

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: Architecture Practice, CEO
**Category**: Infrastructure

---

## Context

QDB One processes financial data subject to Qatar PDPPL, QCB regulations, and data sovereignty requirements. All data must remain in Qatar (NFR-022). Encryption keys must be managed by QDB, not by a cloud provider (NFR-015). The platform must support 5,000+ concurrent sessions (NFR-009) with 99.5% uptime (NFR-029).

QDB has existing on-premise data center infrastructure in Qatar.

## Decision

Deploy QDB One on **Kubernetes** in QDB's on-premise data center (or Qatar-based private cloud):

### Cluster Topology
- **Production cluster**: Multi-node Kubernetes (1.29+) with dedicated node pools for different workload types
- **Staging cluster**: Smaller replica of production for pre-release validation
- **Development cluster**: Shared development environment

### Namespace Strategy
- `ingress` — NGINX Ingress Controller
- `frontend` — Shell App, Web BFF, Admin BFF
- `gateway` — Kong API Gateway, GraphQL Gateway
- `auth` — Keycloak (clustered, 3 replicas), OpenFGA (3 replicas)
- `mpi` — MPI Service, MPI Enrichment Service
- `subgraphs` — All GraphQL subgraphs
- `pipeline` — Dashboard Projection, Search Indexer, Notification Router, Webhook Gateway, WebSocket Server
- `audit` — Audit Service
- `observability` — Grafana, Prometheus, Loki, Tempo, Fluent Bit

### Data Tier (Outside Kubernetes)
Databases and stateful middleware run on dedicated servers (not in Kubernetes pods) for stability:
- PostgreSQL instances (MPI, Read Store, Audit, OpenFGA, Keycloak) — Primary + Standby per instance
- Kafka cluster (3 brokers, KRaft or ZooKeeper)
- Debezium Connect cluster (2 workers)
- Redis cluster (3 primary + 3 replica)
- OpenSearch cluster (3 data + 3 master nodes)
- MinIO cluster (4-node erasure coding)
- HashiCorp Vault (3-node HA, HSM-backed)

### Network Security
- DMZ zone: Load Balancer, WAF
- Application zone: Kubernetes cluster (all namespaces)
- Data zone: Databases, Kafka, Redis, OpenSearch, MinIO
- Integration zone: External API adapters (NAS, MOCI, QFC)
- Management zone: Vault, Grafana, CI/CD runners (admin VPN only)

### High Availability
- All stateless services: minimum 2 replicas, with pod anti-affinity rules
- Critical services (Keycloak, Kong, GraphQL Gateway, Dashboard Subgraph): 3 replicas
- WebSocket Server: 3 replicas with sticky sessions
- PostgreSQL: Streaming replication with automatic failover (Patroni or similar)
- Kafka: 3 brokers with replication factor 3
- Redis: 3 primary + 3 replica cluster

## Consequences

### Positive
- Full data sovereignty — all data remains in Qatar on QDB-controlled infrastructure
- QDB controls encryption keys via HSM — no cloud provider key management
- No dependency on foreign cloud providers for data storage
- Kubernetes provides standard orchestration (scaling, rolling updates, health checks)
- Existing QDB infrastructure investment is leveraged

### Negative
- QDB must provision and manage Kubernetes infrastructure (or partner with managed K8s provider in Qatar)
- Higher operational burden than managed cloud services
- Must manage database HA, backup, and disaster recovery manually
- Capacity planning is QDB's responsibility (no elastic auto-scaling to cloud resources)
- Kubernetes operational expertise required on the QDB team

### Risks
- Infrastructure provisioning delays. **Mitigation**: Start hardware procurement in Phase 0 month 1; use existing infrastructure for development; engage systems integrator if needed.
- Kubernetes operational complexity. **Mitigation**: Use managed Kubernetes if available in Qatar (e.g., Red Hat OpenShift, Rancher); train ops team; establish runbooks for common operations.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Public cloud (AWS/Azure/GCP)** | Elastic scaling, managed services, less ops burden | Data sovereignty concern (no Qatar region for some providers), key management by cloud provider | NFR-022 (all data in Qatar), NFR-015 (QDB-managed keys) |
| **B. Qatar-based cloud** | Data in Qatar, some managed services | Limited provider options, potential vendor lock-in | Viable alternative — evaluate available providers |
| **C. On-premise Kubernetes** (selected) | Full sovereignty, QDB-controlled keys, leverage existing DC | Higher ops burden, capacity planning | Best fit for regulatory and sovereignty requirements |
| **D. On-premise bare metal (no K8s)** | Simplest infrastructure | Manual deployment, no orchestration, scaling is painful | Does not support the microservices architecture |
| **E. Hybrid (K8s on-prem + Qatar cloud for non-sensitive)** | Balance of control and convenience | Complexity of hybrid networking, split infrastructure | Consider in Phase 2+ as an optimization |
