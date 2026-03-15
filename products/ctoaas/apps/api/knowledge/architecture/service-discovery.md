# Service Discovery: Finding Services in a Dynamic Infrastructure

## Overview

Service discovery is the mechanism by which services in a distributed system locate and communicate with each other without hardcoded network addresses. In a microservices architecture where services scale up and down, move across hosts, and are redeployed frequently, static configuration files with IP addresses and ports are unsustainable. Service discovery automates the process of registering service instances when they start, deregistering them when they stop, and providing other services with the current network location of healthy instances. It is a foundational capability that enables elastic scaling, zero-downtime deployments, and fault tolerance in microservices architectures.

## When to Use / When NOT to Use

| Factor | Use Service Discovery | Skip Service Discovery |
|--------|----------------------|----------------------|
| Service count | 5+ independently deployed services | 1-3 services with stable, known addresses |
| Scaling model | Auto-scaling with dynamic instance counts | Fixed instance count, manually managed |
| Deployment frequency | Multiple deployments per day across services | Infrequent deployments with manual coordination |
| Infrastructure | Containers, Kubernetes, or cloud VMs with dynamic IPs | Bare metal or VMs with static IPs and DNS |
| Failure handling | Automatic rerouting away from unhealthy instances | Manual failover procedures are acceptable |
| Environment complexity | Multiple environments (dev, staging, production) with different topologies | Single environment with stable topology |

## Trade-offs

### Benefits of Service Discovery

**Dynamic scaling.** When a new instance of the payment service spins up (auto-scaling in response to load), it registers itself with the discovery system. Other services immediately start routing traffic to it without any configuration changes. When the instance shuts down, it deregisters, and traffic stops flowing to it.

**Zero-downtime deployments.** During a rolling deployment, new instances register before old instances deregister. The discovery system routes traffic only to healthy instances, enabling seamless transitions between versions. Combined with health checks, this ensures clients never send requests to instances that are starting up or shutting down.

**Fault tolerance.** Health checks continuously verify that registered instances are responsive. When an instance becomes unhealthy (crashes, runs out of memory, loses database connectivity), the discovery system removes it from the registry, and clients automatically route to remaining healthy instances.

**Environment abstraction.** Services reference each other by logical name ("payment-service") rather than by network address. The same code works in development (where payment-service runs on localhost:5001), staging (where it runs on a cloud VM), and production (where it runs across multiple availability zones) without configuration changes.

### Costs of Service Discovery

**Operational complexity.** Service discovery is a critical infrastructure component. If the discovery system goes down, services cannot find each other. This means the discovery system itself needs high availability (clustering, replication, consensus protocols), monitoring, and its own operational runbook.

**Stale routing.** There is always a window between when an instance becomes unhealthy and when the discovery system detects it and deregisters it. During this window, clients may route traffic to an unhealthy instance. Health check intervals, timeout settings, and TTLs must be tuned carefully.

**Network overhead.** Service discovery adds network hops. In client-side discovery, the client queries the registry before each request (or caches the result). In server-side discovery, the load balancer or proxy queries the registry. Both add latency, typically 1-5ms per lookup.

**Consistency challenges.** In a distributed discovery system, different nodes may have slightly different views of which instances are healthy. During network partitions, some clients may see instances that others do not. The discovery system's consistency model (CP vs AP) determines the trade-off between availability and accuracy.

## Client-Side vs Server-Side Discovery

### Client-Side Discovery

The client is responsible for querying the service registry, selecting an available instance (using a load balancing algorithm), and making the request directly.

**How it works:**
1. Service instances register with the service registry on startup
2. The client queries the registry for available instances of the target service
3. The client selects an instance using a load balancing strategy (round-robin, least connections, random)
4. The client makes the request directly to the selected instance
5. The client caches the registry response and periodically refreshes it

**Advantages:** No intermediate proxy, so one fewer network hop and lower latency. The client can implement sophisticated load balancing strategies tailored to its needs. No single point of failure at the load balancer level.

**Disadvantages:** Every client must implement discovery logic (usually via a library). If services are written in multiple languages, the discovery library must exist for each language. Clients are coupled to the discovery system's API.

**Netflix's implementation:** Netflix's Eureka is the canonical client-side discovery system. Each Netflix service includes the Eureka client library, which registers the service instance and periodically fetches the registry of all available instances. Netflix's Ribbon library provides client-side load balancing on top of Eureka's registry data. This model works well for Netflix because they primarily use Java and can standardize on a single client library.

### Server-Side Discovery

The client makes a request to a known endpoint (load balancer, reverse proxy, or DNS name), which queries the service registry and forwards the request to an appropriate instance.

**How it works:**
1. Service instances register with the service registry on startup
2. The client makes a request to a stable endpoint (load balancer or DNS name)
3. The load balancer queries the registry for available instances
4. The load balancer forwards the request to a healthy instance
5. The response flows back through the load balancer to the client

**Advantages:** Clients are simpler since they do not need discovery logic. Language-agnostic since any HTTP client works. The load balancer provides a single point for traffic management, TLS termination, and observability.

**Disadvantages:** The load balancer is an additional network hop and a potential bottleneck. If not properly scaled, it becomes a single point of failure. The load balancer adds latency (typically 1-5ms).

**AWS implementation:** AWS Elastic Load Balancer (ALB/NLB) combined with ECS service discovery or Auto Scaling Groups is server-side discovery. When ECS tasks start, they register with the ALB's target group. The ALB health checks instances and routes traffic only to healthy ones. Clients use the ALB's DNS name and never know about individual instance addresses.

## Technology Comparison

### DNS-Based Discovery

The simplest form of service discovery uses DNS. Each service is assigned a DNS name (e.g., `payment-service.internal`), and the DNS server returns the IP addresses of healthy instances. When instances change, DNS records are updated.

**Advantages:** Universal client support (every language and framework can make DNS queries). No additional client libraries needed. Well-understood operational model.

**Limitations:** DNS TTLs mean clients cache stale records. Typical DNS TTLs of 60-300 seconds mean that clients may route to deregistered instances for minutes after they go down. DNS does not support metadata (service version, datacenter, health status) and offers limited load balancing (DNS round-robin does not account for instance load or health). DNS is not designed for the rapid registration and deregistration that dynamic container environments require.

**When to use:** Small deployments (under 10 services) with relatively stable instance counts and where the simplicity of DNS outweighs the limitations of stale records.

### HashiCorp Consul

Consul provides service discovery, health checking, KV storage, and multi-datacenter support. Services register with a local Consul agent, which forwards registrations to the Consul server cluster. Health checks (HTTP, TCP, script, gRPC) run on the local agent and automatically deregister unhealthy instances. Consul supports both DNS and HTTP APIs for service lookup, making it compatible with any language while offering rich metadata queries for clients that use the HTTP API.

**Distinctive features:** Multi-datacenter federation with WAN gossip protocol, allowing services to discover instances across datacenters. Service mesh capabilities with Consul Connect (mTLS between services). Intention-based access control that defines which services are allowed to communicate.

**Operational model:** Consul uses the Raft consensus protocol, requiring 3 or 5 server nodes per datacenter for high availability. Consul agents run on every node as a sidecar, which means operational overhead scales with your infrastructure size.

**Best for:** Multi-datacenter deployments, hybrid cloud environments, and organizations using the HashiCorp ecosystem (Terraform, Vault, Nomad).

### Netflix Eureka

Eureka is a REST-based service discovery server designed for AWS cloud environments. It follows an AP model (availability and partition tolerance from the CAP theorem), meaning it prioritizes availability over consistency. During network partitions, Eureka nodes continue serving stale registry data rather than becoming unavailable.

**Distinctive features:** Self-preservation mode that prevents mass deregistration during network issues (if more than 85% of instances miss heartbeats, Eureka assumes a network problem rather than a mass failure). Client-side caching with periodic refresh (default 30 seconds). Region and availability zone awareness for AWS deployments.

**Limitations:** Primarily Java ecosystem. No built-in health checking beyond heartbeat (the client must report its own status). Less actively maintained since Netflix shifted to Kubernetes. No multi-datacenter federation.

**Best for:** Java-based microservices on AWS where the AP consistency model is acceptable.

### Kubernetes DNS and Service Discovery

Kubernetes has built-in service discovery through DNS and the Service abstraction. A Kubernetes Service creates a stable DNS name and virtual IP (ClusterIP) that routes to pods matching a label selector. When pods are created or destroyed, the endpoints are automatically updated.

**How it works:**
1. A Deployment creates pods with labels (e.g., `app: payment-service`)
2. A Service with a matching selector creates a stable DNS entry (e.g., `payment-service.namespace.svc.cluster.local`)
3. CoreDNS resolves this name to the Service's ClusterIP
4. kube-proxy (or a CNI plugin) routes traffic from the ClusterIP to healthy pod IPs
5. Readiness probes determine whether a pod receives traffic

**Advantages:** Zero additional infrastructure. Service discovery is built into the platform. Works with any language since it uses standard DNS. Integrates with health checks (readiness and liveness probes) natively.

**Limitations:** Only works within a Kubernetes cluster. Cross-cluster discovery requires additional tooling (multi-cluster service mesh, external DNS). The default ClusterIP load balancing is random/round-robin and does not support weighted routing or least-connections without a service mesh.

**Best for:** Any organization running on Kubernetes (which is most modern infrastructure). Kubernetes DNS should be your default service discovery mechanism if you are on Kubernetes.

### etcd / ZooKeeper

These are distributed key-value stores that can be used for service discovery but are not purpose-built for it. etcd is Kubernetes' backing store; ZooKeeper was used by older Kafka and Hadoop deployments. Both provide strong consistency (CP model) through consensus protocols (Raft for etcd, ZAB for ZooKeeper).

**When to consider:** Only if you already operate etcd or ZooKeeper for other purposes and want to avoid adding another infrastructure component. For greenfield deployments, Consul or Kubernetes-native discovery is a better choice.

## Real-World Examples

### Netflix: Eureka at Global Scale

Netflix operates Eureka as the backbone of service discovery across their microservices architecture (700+ services). Every service instance registers with Eureka on startup and sends heartbeats every 30 seconds. If heartbeats stop, Eureka deregisters the instance after 90 seconds. Netflix's engineering team chose an AP consistency model deliberately: during AWS availability zone failures, Eureka continues serving the last known good registry rather than becoming unavailable. This means clients might occasionally route to a stale instance, but service discovery itself never goes down. Netflix's client library (Ribbon) combines Eureka's registry with client-side load balancing, ping-based health checks, and retry logic to route around failures.

### Airbnb: SmartStack (Nerve + Synapse)

Airbnb built SmartStack, a transparent service discovery system using two components: Nerve (registration) and Synapse (discovery). Nerve runs alongside each service instance and registers it with ZooKeeper based on local health checks. Synapse runs alongside each consuming service and watches ZooKeeper for changes, updating a local HAProxy configuration to route traffic to healthy instances. The key insight of SmartStack was making service discovery transparent: services make requests to localhost (through the local HAProxy), and SmartStack handles routing to the correct remote instance. This means services do not need any discovery client library. Airbnb chose this architecture because their services were written in multiple languages (Ruby, Java, Scala), and a language-agnostic approach eliminated the need for per-language discovery clients.

### Uber: Hyperbahn and TChannel

Uber developed Hyperbahn, a service discovery and routing mesh built on their custom RPC protocol TChannel. Hyperbahn nodes form a ring that routes requests to the correct service based on service name. Service instances register with their local Hyperbahn node, which propagates the registration across the ring via a gossip protocol. Uber chose this approach because they needed sub-millisecond routing overhead and cross-datacenter discovery for their real-time trip matching system. While Uber has since migrated much of their infrastructure to Kubernetes (using Kubernetes-native discovery), Hyperbahn demonstrates how high-performance systems sometimes require custom discovery solutions.

## Decision Framework

**Choose Kubernetes-native DNS when:**
- Your services run on Kubernetes (the most common case today)
- You do not need cross-cluster service discovery
- Basic round-robin load balancing meets your needs
- You want zero additional infrastructure for discovery

**Choose Consul when:**
- You run across multiple datacenters or cloud providers
- You need service mesh capabilities (mTLS, access control)
- You need rich health checking beyond simple HTTP/TCP
- You use other HashiCorp tools (Terraform, Vault, Nomad)

**Choose DNS-based discovery when:**
- You have fewer than 10 services with relatively stable instance counts
- You want maximum simplicity and universal compatibility
- Minutes-long stale routing is acceptable during instance changes
- You are not running containers or auto-scaling groups

**Choose Eureka when:**
- You have a Java-centric microservices architecture on AWS
- AP consistency (availability over accuracy) is the right trade-off
- You need client-side load balancing with customizable strategies

**Choose a service mesh (Istio, Linkerd) when:**
- You need discovery plus mTLS, traffic splitting, and observability
- You have 20+ services and need fine-grained traffic management
- You are already on Kubernetes and want Layer 7 traffic control

## Common Mistakes

**Hardcoding service addresses.** Even "just for now" or "in development." Configuration files with IP addresses create deployment coupling and break when instances move. Use service discovery from day one, even if it is just Docker Compose DNS or Kubernetes Services.

**Not implementing health checks.** Registering a service without health checks means the registry will continue routing to crashed instances until a heartbeat timeout expires (often 60-90 seconds). Implement application-level health checks that verify the service can actually handle requests (database connectivity, dependency availability), not just that the process is running.

**Too-long TTLs and cache durations.** DNS TTLs of 300 seconds or client-side registry caches refreshed every 60 seconds mean that clients route to stale instances for minutes after they go down. For dynamic environments, use TTLs of 5-15 seconds for DNS and 10-30 seconds for client-side cache refresh.

**No fallback for discovery failure.** If the service registry is unavailable, what happens? Clients should cache the last known good registry and continue using it, not fail open (route to any address) or fail closed (reject all requests). Eureka's self-preservation mode is an example of this principle.

**Treating discovery as optional.** Some teams add service discovery to some services but not others, or use discovery in production but hardcode addresses in development. This inconsistency leads to environment-specific bugs and undermines the value of service discovery. Make discovery the only way services find each other in all environments.

**Ignoring cross-cluster and cross-datacenter discovery.** Kubernetes DNS works within a single cluster. If your services span multiple clusters, regions, or cloud providers, you need an additional discovery layer. Plan for this before you need it, not during an incident.

## Key Metrics to Track

| Metric | What It Tells You | Target |
|--------|-------------------|--------|
| Service registration latency | How long until a new instance is discoverable | Under 5 seconds |
| Service deregistration latency | How long until a downed instance is removed from discovery | Under 30 seconds |
| Health check failure rate | How often instances fail health checks | Under 1% in steady state |
| Discovery query latency (p50, p95, p99) | How long discovery lookups take | Under 5ms for cached, under 50ms for uncached |
| Stale routing rate | How often clients route to instances that are no longer healthy | Under 0.1% |
| Registry size (total registered instances) | Discovery system capacity and growth | Monitor for capacity planning |
| Registry availability | Whether the discovery system itself is available | 99.99% (four nines minimum) |
| Cross-datacenter replication lag | How long for registration changes to propagate across datacenters | Under 5 seconds |

## References

- Cockcroft, A. "Netflix and Open Source." Netflix Tech Blog, various posts 2013-2016.
- Netflix. "Eureka at a Glance." Netflix OSS Documentation.
- Airbnb Engineering. "SmartStack: Service Discovery in the Cloud." Airbnb Engineering Blog, 2013.
- Burns, B. "Designing Distributed Systems." O'Reilly Media, 2018.
- Kubernetes Documentation. "Service." kubernetes.io.
- HashiCorp. "Consul Service Discovery." consul.io.
- Richardson, C. "Microservices Patterns." Manning Publications, 2018. Chapter 3: Interprocess Communication.
- Newman, S. "Building Microservices." O'Reilly Media, 2nd Edition, 2021.
- Uber Engineering. "Introducing TChannel and Hyperbahn." Uber Engineering Blog, 2015.
