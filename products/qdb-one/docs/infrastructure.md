# QDB One: Infrastructure & DevOps

**Version**: 1.0
**Date**: February 15, 2026
**Classification**: Confidential - Internal Use Only

---

## Table of Contents

1. [Kubernetes Cluster Topology](#1-kubernetes-cluster-topology)
2. [Database Deployment Plan](#2-database-deployment-plan)
3. [Kafka Cluster Sizing](#3-kafka-cluster-sizing)
4. [Debezium Connect Deployment](#4-debezium-connect-deployment)
5. [CI/CD Pipeline Design](#5-cicd-pipeline-design)
6. [Environment Strategy](#6-environment-strategy)
7. [Backup and Disaster Recovery](#7-backup-and-disaster-recovery)
8. [Network Topology and Security Zones](#8-network-topology-and-security-zones)

---

## 1. Kubernetes Cluster Topology

### 1.1 Cluster Sizing (Production)

| Node Pool | Count | Spec (Minimum) | Purpose |
|-----------|-------|-----------------|---------|
| Control Plane | 3 | 4 vCPU, 16 GB RAM, 100 GB SSD | Kubernetes API, etcd, scheduler |
| Application | 6 | 8 vCPU, 32 GB RAM, 200 GB SSD | Stateless services (subgraphs, BFFs, projections) |
| Gateway | 3 | 4 vCPU, 16 GB RAM, 100 GB SSD | Kong, GraphQL Gateway, Ingress |
| Auth | 3 | 4 vCPU, 16 GB RAM, 100 GB SSD | Keycloak, OpenFGA (latency-sensitive) |
| Observability | 2 | 8 vCPU, 32 GB RAM, 500 GB SSD | Grafana, Prometheus, Loki, Tempo |

**Total**: 17 nodes for production cluster (can start smaller in Phase 0 and scale)

### 1.2 Namespace Allocation

| Namespace | Services | Replica Count | Resource Limits (per pod) |
|-----------|----------|---------------|---------------------------|
| `ingress` | NGINX Ingress Controller | 3 | 1 CPU, 2 GB RAM |
| `frontend` | Shell App, Web BFF, Admin BFF | 3, 3, 2 | 1 CPU, 2 GB RAM |
| `gateway` | Kong Gateway, GraphQL Gateway | 3, 3 | 2 CPU, 4 GB RAM |
| `auth` | Keycloak, OpenFGA | 3, 3 | 2 CPU, 4 GB RAM |
| `mpi` | MPI Service, MPI Enrichment | 3, 2 | 2 CPU, 4 GB RAM |
| `subgraphs` | Fin/Guar/Adv/Dash/Notif/Doc Subgraphs | 2-3 each | 1 CPU, 2 GB RAM |
| `pipeline` | DashProj, SearchIdx, NotifRouter, Webhook, WS | 2-3 each | 1 CPU, 2 GB RAM |
| `audit` | Audit Service | 2 | 1 CPU, 2 GB RAM |
| `observability` | Grafana, Prometheus, Loki, Tempo, Fluent Bit | 1/each + DaemonSet | 2 CPU, 8 GB RAM (Prometheus) |

### 1.3 Resource Quotas per Namespace

```yaml
# Example: subgraphs namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: subgraphs-quota
  namespace: subgraphs
spec:
  hard:
    requests.cpu: "24"
    requests.memory: "48Gi"
    limits.cpu: "48"
    limits.memory: "96Gi"
    pods: "50"
```

### 1.4 Pod Disruption Budgets

All production services have PDBs to ensure availability during rolling updates:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: graphql-gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: graphql-gateway
```

### 1.5 Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dashboard-subgraph-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dashboard-subgraph
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 2. Database Deployment Plan

### 2.1 New Databases (QDB One Owned)

| Database | Engine | Purpose | HA Strategy | Storage |
|----------|--------|---------|-------------|---------|
| `qdb_mpi` | PostgreSQL 16 | Master Person Index | Primary + Standby (streaming replication, Patroni) | 100 GB initial, grow to 500 GB |
| `qdb_read_store` | PostgreSQL 16 | Unified Read Store | Primary + Standby (streaming replication) | 200 GB initial, grow to 1 TB |
| `qdb_audit` | PostgreSQL 16 | Audit trail (immutable, 7-year retention) | Primary + Standby + Archive | 500 GB initial, grow to 5 TB over 7 years |
| `qdb_openfga` | PostgreSQL 16 | OpenFGA authorization store | Primary + Standby | 50 GB |
| `qdb_keycloak` | PostgreSQL 16 | Keycloak sessions, realm config | Primary + Standby | 20 GB |

### 2.2 Existing Databases (Portal Owned — No Changes)

| Database | Engine | Portal | QDB One Integration |
|----------|--------|--------|---------------------|
| `financing_core` | Oracle | Financing | CDC (LogMiner) + Financing Subgraph reads |
| `financing_docs` | Oracle | Financing | Document Subgraph reads |
| `guarantee_main` | Oracle | Guarantees | CDC (LogMiner) + Guarantee Subgraph reads |
| `guarantee_claims` | Oracle | Guarantees | Guarantee Subgraph reads |
| `advisory_main` | PostgreSQL | Advisory | CDC (pgoutput) + Advisory Subgraph reads |
| `advisory_assess` | PostgreSQL | Advisory | Advisory Subgraph reads |
| `corporate_crm` | Oracle | Corporate | CDC (LogMiner) |
| `moci_cache` | PostgreSQL | Integration | Batch sync + MOCI Adapter reads |
| `notifications_db` | PostgreSQL | Legacy | Reference only (QDB One has its own notifications) |
| `reporting_dw` | Oracle | Reporting | Tier 4 reference (reuse existing aggregations) |

### 2.3 PostgreSQL Configuration (New Databases)

```ini
# postgresql.conf (production recommendations for QDB One databases)

# Connections
max_connections = 200
shared_buffers = 8GB              # 25% of total RAM (assuming 32 GB)
effective_cache_size = 24GB       # 75% of total RAM
work_mem = 64MB
maintenance_work_mem = 1GB

# WAL (for replication and CDC)
wal_level = logical               # Required for Debezium CDC
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 2GB

# Performance
random_page_cost = 1.1            # SSD storage
effective_io_concurrency = 200    # SSD storage
default_statistics_target = 200

# Logging
log_min_duration_statement = 200  # Log queries > 200ms
log_line_prefix = '%t [%p] %u@%d '

# Encryption at rest
# Managed via filesystem-level encryption (LUKS) or TDE extension
```

### 2.4 Connection Pooling

Each service connects through **PgBouncer** (connection pooler):

| Database | Pool Mode | Max Connections | Max Client Connections |
|----------|-----------|-----------------|------------------------|
| `qdb_mpi` | Transaction | 50 | 200 |
| `qdb_read_store` | Transaction | 100 | 400 |
| `qdb_audit` | Transaction | 30 | 100 |
| `qdb_openfga` | Transaction | 30 | 100 |
| `qdb_keycloak` | Session | 30 | 100 |

---

## 3. Kafka Cluster Sizing

### 3.1 Cluster Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Broker count | 3 | Minimum for production HA with replication factor 3 |
| Controller mode | KRaft (preferred) or ZooKeeper | KRaft eliminates ZooKeeper dependency (Kafka 3.7+ native) |
| Replication factor | 3 | Every partition replicated to all brokers |
| Min in-sync replicas | 2 | Writes succeed if 2 of 3 brokers acknowledge |
| Default partitions | 6 | Per topic (adjustable per topic based on throughput) |
| Retention (CDC topics) | 7 days | CDC events can be replayed from Debezium snapshot if needed |
| Retention (app topics) | 30 days | Application events retained for replay and debugging |
| Retention (DLQ topics) | 90 days | Dead letter queue retained for investigation |
| Log segment size | 1 GB | Default |
| Compression | LZ4 | Good compression ratio with low CPU overhead |

### 3.2 Broker Sizing

| Resource | Per Broker | Rationale |
|----------|-----------|-----------|
| CPU | 8 vCPU | Handles compression, replication, and consumer group coordination |
| RAM | 32 GB | 6 GB for JVM heap + OS page cache for hot data |
| Storage | 1 TB SSD | 30 days retention across all topics. Monitor and expand. |
| Network | 10 Gbps | High throughput for replication between brokers |

### 3.3 Topic Inventory

| Topic Group | Topic Count | Estimated Daily Volume | Partition Count |
|-------------|-------------|------------------------|-----------------|
| CDC topics (`cdc.*`) | ~15 | 50,000-200,000 events | 6 per topic |
| Application topics (`app.*`) | ~20 | 10,000-50,000 events | 6 per topic |
| MPI topics (`mpi.*`) | ~8 | 5,000-20,000 events | 3 per topic |
| Notification topics | 3 | 10,000-30,000 events | 6 per topic |
| External topics (`ext.*`) | ~5 | 1,000-5,000 events | 3 per topic |
| DLQ topics (`dlq.*`) | ~5 | < 100 events (ideally 0) | 1 per topic |

### 3.4 Consumer Groups

| Consumer Group | Topics Consumed | Instance Count | Processing |
|----------------|----------------|----------------|------------|
| `mpi-enrichment` | `cdc.*.{identity tables}` | 2 | Identity matching + golden record update |
| `dashboard-projection` | `app.*`, `mpi.person.*` | 2 | Materialized view updates |
| `search-indexer` | `app.*`, `mpi.*` | 2 | OpenSearch index updates |
| `notification-router` | `app.*` | 2 | Notification generation + delivery |
| `webhook-processor` | `ext.*` | 2 | External webhook processing |
| `audit-writer` | All topics (selective) | 1 | Audit trail recording |

---

## 4. Debezium Connect Deployment

### 4.1 Connect Cluster

| Parameter | Value |
|-----------|-------|
| Workers | 2 (active-active for HA) |
| CPU per worker | 4 vCPU |
| RAM per worker | 16 GB |
| Connector framework | Kafka Connect (distributed mode) |
| Config storage topic | `connect-configs` (replication factor 3) |
| Offset storage topic | `connect-offsets` (replication factor 3) |
| Status storage topic | `connect-status` (replication factor 3) |

### 4.2 Connector Configuration

#### Oracle Connectors (financing_core, guarantee_main, corporate_crm)

```json
{
  "name": "debezium-financing-core",
  "config": {
    "connector.class": "io.debezium.connector.oracle.OracleConnector",
    "tasks.max": "1",
    "database.hostname": "financing-oracle.qdb.internal",
    "database.port": "1521",
    "database.user": "debezium_cdc",
    "database.password": "${vault:secret/debezium/financing-core}",
    "database.dbname": "financing_core",
    "database.server.name": "financing_core",
    "database.pdb.name": "financing_pdb",
    "schema.include.list": "FINANCING",
    "table.include.list": "FINANCING.CUSTOMERS,FINANCING.LOANS,FINANCING.LOAN_APPLICATIONS,FINANCING.PAYMENTS",
    "database.history.kafka.bootstrap.servers": "kafka1:9092,kafka2:9092,kafka3:9092",
    "database.history.kafka.topic": "schema-changes.financing_core",
    "log.mining.strategy": "online_catalog",
    "log.mining.continuous.mine": "true",
    "snapshot.mode": "initial",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "financing_core\\.FINANCING\\.(.*)",
    "transforms.route.replacement": "cdc.financing_core.$1",
    "heartbeat.interval.ms": "10000",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "dlq.debezium-financing-core",
    "errors.deadletterqueue.context.headers.enable": "true"
  }
}
```

#### PostgreSQL Connectors (advisory_main, advisory_assess)

```json
{
  "name": "debezium-advisory-main",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "database.hostname": "advisory-pg.qdb.internal",
    "database.port": "5432",
    "database.user": "debezium_cdc",
    "database.password": "${vault:secret/debezium/advisory-main}",
    "database.dbname": "advisory_main",
    "database.server.name": "advisory_main",
    "plugin.name": "pgoutput",
    "publication.name": "qdb_one_cdc",
    "schema.include.list": "public",
    "table.include.list": "public.users,public.programs,public.sessions",
    "slot.name": "qdb_one_advisory",
    "snapshot.mode": "initial",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.schema.registry.url": "http://schema-registry:8081",
    "transforms": "route",
    "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
    "transforms.route.regex": "advisory_main\\.public\\.(.*)",
    "transforms.route.replacement": "cdc.advisory_main.$1",
    "heartbeat.interval.ms": "10000",
    "errors.tolerance": "all",
    "errors.deadletterqueue.topic.name": "dlq.debezium-advisory-main"
  }
}
```

### 4.3 Oracle Prerequisites

Before deploying Oracle CDC connectors, the Oracle DBA must:

1. Enable ARCHIVELOG mode: `ALTER DATABASE ARCHIVELOG;`
2. Enable supplemental logging: `ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;`
3. Create a dedicated CDC user with privileges:
   ```sql
   CREATE USER debezium_cdc IDENTIFIED BY <password>;
   GRANT CONNECT, RESOURCE TO debezium_cdc;
   GRANT SELECT ANY TABLE TO debezium_cdc;
   GRANT FLASHBACK ANY TABLE TO debezium_cdc;
   GRANT SELECT ON V_$LOG TO debezium_cdc;
   GRANT SELECT ON V_$LOGMNR_CONTENTS TO debezium_cdc;
   GRANT SELECT ON V_$DATABASE TO debezium_cdc;
   GRANT EXECUTE ON DBMS_LOGMNR TO debezium_cdc;
   GRANT SELECT ON V_$ARCHIVED_LOG TO debezium_cdc;
   ```

### 4.4 PostgreSQL Prerequisites

```sql
-- On advisory_main and advisory_assess databases
ALTER SYSTEM SET wal_level = logical;
-- Restart PostgreSQL after this change

-- Create publication for CDC
CREATE PUBLICATION qdb_one_cdc FOR TABLE users, programs, sessions;

-- Create replication slot (Debezium creates this automatically, but document for reference)
SELECT pg_create_logical_replication_slot('qdb_one_advisory', 'pgoutput');
```

---

## 5. CI/CD Pipeline Design

### 5.1 Pipeline Architecture

```
Developer Push --> GitHub / GitLab --> CI Pipeline --> Artifact Registry --> CD Pipeline --> Kubernetes
```

### 5.2 CI Pipeline (per service)

```yaml
# .github/workflows/ci.yml (example for a subgraph service)
name: CI

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: self-hosted  # On-premise runners (data does not leave Qatar)
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: self-hosted
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:integration

  security-scan:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - run: trivy fs --exit-code 1 --severity HIGH,CRITICAL .

  build:
    needs: [lint, test, security-scan]
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t registry.qdb.internal/$SERVICE_NAME:$GITHUB_SHA .
      - run: docker push registry.qdb.internal/$SERVICE_NAME:$GITHUB_SHA

  schema-check:
    # For GraphQL subgraphs: validate federation composition
    needs: [build]
    runs-on: self-hosted
    steps:
      - run: rover subgraph check qdb-one@production --schema ./schema.graphql
```

### 5.3 CD Pipeline

```yaml
# Deployment stages
stages:
  - deploy-staging:
      trigger: merge to main
      target: staging cluster
      strategy: rolling update
      validation:
        - smoke tests
        - integration tests against staging
        - schema composition check

  - deploy-production:
      trigger: manual approval after staging validation
      target: production cluster
      strategy: rolling update (zero-downtime)
      pre-deploy:
        - database migration check
        - feature flag verification
        - Kafka consumer group offset check
      post-deploy:
        - health check verification (all pods healthy)
        - smoke tests against production
        - metric baseline comparison (latency, error rate)
      rollback:
        - automatic if health checks fail for 5 minutes
        - manual via kubectl or Argo CD
```

### 5.4 Feature Flags

Feature flags are managed via a configuration service (e.g., LaunchDarkly on-prem or custom Redis-backed):

```json
{
  "flags": {
    "qdb.financing.enabled": true,
    "qdb.guarantee.enabled": false,
    "qdb.advisory.enabled": false,
    "qdb.guarantee.digital-signing": false,
    "qdb.cross-portal.related-items": false,
    "qdb.notification.push-fcm": false,
    "qdb.migration.wave2-linking": true,
    "qdb.migration.legacy-login-banner": false
  }
}
```

Feature flags enable:
- Per-portal rollout (enable Financing before Guarantees)
- Instant rollback of specific features without full deployment rollback
- A/B testing during pilot phase
- Migration wave control

---

## 6. Environment Strategy

### 6.1 Environment Matrix

| Environment | Purpose | Cluster | Data | Access |
|-------------|---------|---------|------|--------|
| **Development** | Daily development, feature branches | Shared dev cluster | Synthetic test data | All developers |
| **Integration** | Cross-service integration testing | Shared dev cluster (separate namespace) | Synthetic + seeded | CI/CD pipelines |
| **Staging** | Pre-production validation | Dedicated staging cluster | Anonymized production-like data | QA team, tech leads |
| **Production** | Live system | Production cluster | Real data | Ops team, on-call |
| **DR** | Disaster recovery standby | Separate DC / zone | Replicated from production | Emergency activation only |

### 6.2 Environment Configuration

| Config Item | Development | Staging | Production |
|-------------|-------------|---------|------------|
| NAS integration | Mock NAS (local) | NAS sandbox (if available) | Production NAS |
| MOCI integration | Mock API | MOCI sandbox | Production MOCI |
| QFC integration | Mock webhook sender | QFC sandbox | Production QFC |
| Keycloak realm | `qdb-one-dev` | `qdb-one-staging` | `qdb-one` |
| Kafka retention | 1 day | 3 days | 30 days |
| Log retention | 3 days | 7 days | 30 days hot, 90 days warm |
| Audit retention | 30 days | 90 days | 7 years |
| SSL certificates | Self-signed | Internal CA | Public CA (TLS 1.3) |
| Feature flags | All enabled | Production-like | Controlled rollout |

### 6.3 Secrets Management

All secrets managed via **HashiCorp Vault**:

```
vault/
├── secret/
│   ├── databases/
│   │   ├── mpi-primary         # PostgreSQL credentials
│   │   ├── read-store-primary
│   │   ├── audit-primary
│   │   ├── financing-core      # Oracle read credentials
│   │   ├── guarantee-main
│   │   └── advisory-main
│   ├── keycloak/
│   │   ├── admin-password
│   │   └── nas-signing-cert
│   ├── kafka/
│   │   ├── jaas-config
│   │   └── truststore
│   ├── debezium/
│   │   ├── financing-core      # CDC user credentials
│   │   └── advisory-main
│   ├── external/
│   │   ├── moci-api-key
│   │   ├── qfc-api-key
│   │   ├── qfc-mtls-cert
│   │   └── cbq-api-key
│   └── encryption/
│       ├── mpi-field-key       # Application-level PII encryption key
│       ├── audit-hmac-key      # Audit hash chain key
│       └── jwt-signing-key     # JWT token signing key
├── transit/                    # HSM-backed encryption engine
│   └── mpi-encryption          # For QID and NAS ID field encryption
```

Kubernetes services access secrets via:
- **Vault Agent Injector** (sidecar that injects secrets into pod volumes)
- **Vault CSI Provider** (mounts secrets as Kubernetes volumes)

---

## 7. Backup and Disaster Recovery

### 7.1 Backup Strategy

| Component | Method | Frequency | Retention | RTO | RPO |
|-----------|--------|-----------|-----------|-----|-----|
| MPI Database | pg_basebackup + WAL archiving | Continuous WAL, daily base backup | 30 days | 1 hour | 0 (WAL replay) |
| Read Store | pg_basebackup + WAL archiving | Continuous WAL, daily base backup | 7 days | 2 hours | 5 minutes |
| Audit Database | pg_basebackup + WAL archiving + offsite copy | Continuous WAL, daily base backup, weekly offsite | 7 years | 4 hours | 0 |
| Keycloak DB | pg_dump | Daily | 30 days | 1 hour | 24 hours |
| OpenFGA DB | pg_dump | Daily | 30 days | 1 hour | 24 hours |
| Kafka | Topic replication (factor 3) | Continuous | Per retention policy | 30 minutes | 0 |
| OpenSearch | Snapshot to MinIO | Daily | 30 days | 4 hours | 24 hours |
| MinIO (documents) | Erasure coding (built-in) + weekly offsite | Continuous | Per document lifecycle | 2 hours | 0 |
| Vault | Raft snapshots | Hourly | 30 days | 1 hour | 1 hour |
| Kubernetes state | etcd backup | Hourly | 7 days | 30 minutes | 1 hour |

### 7.2 Disaster Recovery

**RPO (Recovery Point Objective)**: Maximum data loss tolerable
- MPI and Audit: 0 (no data loss — WAL-based recovery)
- Read Store: 5 minutes (can be rebuilt from Kafka events if needed)
- Other services: 24 hours

**RTO (Recovery Time Objective)**: Maximum downtime tolerable
- Authentication (Keycloak): 1 hour
- Dashboard (Read Store + Subgraphs): 2 hours
- Full platform: 4 hours

### 7.3 DR Scenarios

| Scenario | Impact | Recovery Procedure | RTO |
|----------|--------|-------------------|-----|
| Single pod failure | None (auto-restart) | Kubernetes restarts pod automatically | < 1 minute |
| Single node failure | Minimal (pods reschedule) | Kubernetes reschedules pods to healthy nodes | < 5 minutes |
| Database primary failure | Service degradation | Patroni promotes standby to primary automatically | < 30 seconds |
| Kafka broker failure | Minimal (replication) | Remaining brokers serve all partitions | < 1 minute |
| Full cluster failure | Full outage | Restore from backup to DR cluster; switch DNS | 2-4 hours |
| Data center failure | Full outage | Activate DR site (if provisioned); restore from offsite backups | 4-8 hours |

### 7.4 Backup Verification

- **Monthly**: Restore MPI database backup to a test environment and verify data integrity
- **Quarterly**: Full DR drill — restore all databases and services to DR cluster, verify end-to-end functionality
- **Annually**: Audit backup retention compliance (especially 7-year audit trail)

---

## 8. Network Topology and Security Zones

### 8.1 Zone Architecture

```
                    ┌─────────────────────────────────┐
                    │         INTERNET                 │
                    └──────────┬──────────────────────┘
                               │ HTTPS (443)
                    ┌──────────▼──────────────────────┐
                    │         DMZ ZONE                 │
                    │                                  │
                    │  ┌─────────┐  ┌──────────────┐  │
                    │  │ HAProxy │  │     WAF       │  │
                    │  │ (L4 LB) │  │ (ModSecurity) │  │
                    │  └────┬────┘  └──────┬───────┘  │
                    └───────┼──────────────┼──────────┘
                            │              │
                    ┌───────▼──────────────▼──────────┐
                    │      APPLICATION ZONE            │
                    │      (Kubernetes Cluster)        │
                    │                                  │
                    │  Ingress → Kong → GraphQL GW     │
                    │  Shell → BFF → Subgraphs         │
                    │  Pipeline Services               │
                    │  Auth Services (Keycloak, FGA)    │
                    └──────────┬───────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐ ┌─────▼──────┐ ┌───────▼──────┐
     │  DATA ZONE     │ │INTEGRATION │ │ MANAGEMENT   │
     │                │ │   ZONE     │ │    ZONE      │
     │ PostgreSQL     │ │            │ │              │
     │ Kafka          │ │ NAS Adapter│ │ Vault        │
     │ Redis          │ │ MOCI Adapt.│ │ Grafana      │
     │ OpenSearch     │ │ QFC Adapter│ │ CI/CD        │
     │ MinIO          │ │ Webhook GW │ │ Jumpbox      │
     │ Debezium       │ │            │ │              │
     └────────────────┘ └────────────┘ └──────────────┘
```

### 8.2 Firewall Rules

| Source Zone | Destination Zone | Allowed Ports | Protocol | Purpose |
|-------------|-----------------|---------------|----------|---------|
| Internet | DMZ | 443 | HTTPS | User traffic (TLS 1.3 only) |
| DMZ | Application | 8080, 8443 | HTTP/HTTPS | Ingress to K8s services |
| Application | Data | 5432 (PG), 9092 (Kafka), 6379 (Redis), 9200 (OS), 9000 (MinIO) | TCP | Service to data stores |
| Application | Integration | 8443 | HTTPS | Internal adapters |
| Integration | External (NAS) | 443 | HTTPS (SAML/OIDC) | Authentication delegation |
| Integration | External (MOCI) | 443 | HTTPS (REST/SOAP) | CR verification |
| Integration | External (QFC) | 443 | HTTPS (mTLS) | Company status |
| Management | All Zones | Various | TCP | Monitoring, secrets, CI/CD |
| Admin VPN | Management | 443, 22 | HTTPS, SSH | Operator access |
| Data | (none) | -- | -- | No outbound from data zone |

### 8.3 TLS Configuration

| Layer | TLS Version | Certificate Authority | Notes |
|-------|-------------|----------------------|-------|
| External (user-facing) | TLS 1.3 | Public CA (e.g., DigiCert) | `qdb.qa`, `auth.qdb.qa`, `admin.qdb.qa` |
| Internal (service-to-service) | TLS 1.3 | Internal CA (Vault PKI) | All internal communication encrypted |
| External integrations (mTLS) | TLS 1.3 | QFC CA + QDB CA (mutual) | Bidirectional certificate verification |
| Database connections | TLS 1.3 | Internal CA | `sslmode=verify-full` for all PostgreSQL connections |
| Kafka | TLS 1.3 + SASL | Internal CA | SASL/SCRAM for authentication, TLS for encryption |

### 8.4 DNS Configuration

| Domain | Points To | Purpose |
|--------|-----------|---------|
| `qdb.qa` | Load Balancer (DMZ) | Main QDB One application |
| `auth.qdb.qa` | Load Balancer (DMZ) | Keycloak auth endpoints |
| `admin.qdb.qa` | Load Balancer (DMZ) | Admin panel (restricted IP range) |
| `api.qdb.qa` | Load Balancer (DMZ) | API Gateway (Kong) |
| `ws.qdb.qa` | Load Balancer (DMZ) | WebSocket server (sticky sessions) |
| `grafana.qdb.internal` | Management zone | Observability dashboards (VPN only) |
| `vault.qdb.internal` | Management zone | Secrets management (VPN only) |

---

## Appendix: Infrastructure Provisioning Timeline

| Phase | Month | Infrastructure Activity |
|-------|-------|------------------------|
| Phase 0 | 1 | Procure/provision Kubernetes nodes, database servers |
| Phase 0 | 1-2 | Deploy Kafka cluster, Debezium, Schema Registry |
| Phase 0 | 1-2 | Deploy PostgreSQL instances (MPI, Read Store, Audit) |
| Phase 0 | 2 | Deploy Keycloak, OpenFGA, Redis, Vault |
| Phase 0 | 2-3 | Deploy Grafana stack (Loki, Tempo, Prometheus) |
| Phase 0 | 3 | Deploy OpenSearch cluster, MinIO |
| Phase 0 | 3-4 | Configure Debezium connectors for Tier 1 databases |
| Phase 0 | 4-6 | Load testing, security hardening, DR setup |
| Phase 1 | 7 | Staging cluster deployment, staging data seeding |
| Phase 1 | 8 | Production deployment (Financing only) |
| Phase 2 | 11 | Scale Kafka (add partitions as needed for new portals) |
| Phase 2 | 11-16 | Additional Debezium connectors for Guarantees, Advisory |
| Phase 3 | 17-18 | Legacy infrastructure decommission planning |
