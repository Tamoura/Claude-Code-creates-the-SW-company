# Load Balancing Algorithms and Architecture

Load balancing is the practice of distributing incoming network traffic across multiple backend servers to ensure no single server bears too much demand. It is the traffic cop that makes horizontal scaling work. A misconfigured load balancer can negate the benefits of adding servers, while a well-tuned one can extract maximum value from existing infrastructure before you need to add more capacity.

## Overview

A load balancer sits between clients and your server fleet, deciding which backend instance should handle each incoming request. The decision algorithm, operating layer (L4 vs L7), and deployment model (hardware, software, cloud-managed) each have significant implications for performance, cost, and operational complexity. Choosing the right combination depends on your traffic patterns, protocol requirements, and team capabilities.

## When to Use / When NOT to Use

| Scenario | Load Balancer Needed | Alternative |
|---|---|---|
| Multiple application instances serving HTTP traffic | Yes | N/A |
| Single server with low traffic | No | Direct access or simple reverse proxy |
| WebSocket connections requiring sticky routing | Yes (L7 with session affinity) | Application-level routing |
| gRPC or HTTP/2 multiplexed streams | Yes (L7 required) | L4 will not work correctly |
| TCP passthrough for databases or message brokers | Yes (L4) | DNS round-robin (with caveats) |
| Multi-region global traffic distribution | Yes (global LB + regional LB) | GeoDNS as simpler alternative |
| Internal service-to-service communication in Kubernetes | Service mesh (Envoy, Linkerd) | kube-proxy handles basic L4 |
| Static content delivery | No (use a CDN instead) | CDN with origin shielding |

## Load Balancing Algorithms

### Round-Robin

Requests are distributed sequentially across servers: server 1, server 2, server 3, server 1, and so on.

**Strengths**: Simple, predictable, zero state to maintain. Works well when all servers have identical specs and all requests have roughly equal cost.

**Weaknesses**: Ignores server health and current load. If one server is processing a slow query, it still receives the next request. Fails badly with heterogeneous hardware or variable request costs.

**Best for**: Homogeneous fleets handling uniform request types.

### Weighted Round-Robin

Each server receives a weight proportional to its capacity. A server with weight 3 receives three times as many requests as one with weight 1.

**Strengths**: Handles heterogeneous hardware (e.g., during a fleet migration where old and new instance types coexist). Useful for canary deployments (route 5% of traffic to the new version).

**Weaknesses**: Weights are static; they do not adapt to runtime conditions. Requires manual tuning.

**Best for**: Mixed instance types, canary deployments, gradual rollouts.

### Least Connections

New requests go to the server with the fewest active connections. This naturally adapts to variable request processing times because slow servers accumulate connections and stop receiving new ones.

**Strengths**: Self-adjusting to real-time load. Handles variable request costs well. The best general-purpose algorithm for most web applications.

**Weaknesses**: Requires the load balancer to track connection state for every backend. Slightly more overhead than round-robin. Can be suboptimal when connections have wildly different lifetimes (e.g., long-polling mixed with short API calls).

**Best for**: Most HTTP API workloads. Default recommendation for teams that are unsure which algorithm to pick.

### Consistent Hashing

Requests are mapped to servers using a hash function applied to a request attribute (typically a user ID, session ID, or cache key). The same key always routes to the same server. When servers are added or removed, only a fraction of keys are remapped (1/N keys on average, where N is the number of servers).

**Strengths**: Enables server-local caching (each server caches a predictable subset of data). Minimizes cache invalidation during scaling events. Essential for distributed caches and sharded datastores.

**Weaknesses**: Can produce uneven distribution without virtual nodes (vnodes). A single hot key can overload one server. More complex to implement and debug.

**Best for**: Caching layers, sharded databases, any system where request affinity to a specific server improves performance. Memcached and Redis Cluster both use variants of consistent hashing.

### IP Hash

The client's IP address determines which server receives the request. A hash of the source IP maps to a server index.

**Strengths**: Simple sticky sessions without cookies or application-layer changes. Ensures the same client always reaches the same server within a scaling window.

**Weaknesses**: Breaks behind NATs or proxies (many clients share one IP). Uneven distribution when traffic comes from a small number of IP ranges (e.g., corporate proxies). Does not survive server additions or removals gracefully.

**Best for**: Legacy applications that require session affinity and cannot externalize state. Not recommended for new systems.

### Random with Two Choices (Power of Two Choices)

Pick two servers at random and route to the one with fewer active connections. This simple algorithm provides surprisingly good load distribution.

**Strengths**: Near-optimal distribution with minimal state tracking. Used internally by Nginx and Envoy. Avoids the herd effect where many requests simultaneously target the least-loaded server.

**Weaknesses**: Less predictable than least-connections for small fleet sizes. Theoretical guarantees require sufficiently large fleets (>10 servers).

**Best for**: Large-scale deployments, service meshes, internal microservice routing.

## Layer 4 vs Layer 7 Load Balancing

| Dimension | Layer 4 (Transport) | Layer 7 (Application) |
|---|---|---|
| **Operates on** | TCP/UDP packets | HTTP requests, headers, URLs, cookies |
| **Routing decisions** | Source/destination IP and port | URL path, host header, HTTP method, cookie values |
| **Performance** | Higher throughput (no payload inspection) | Lower throughput (must parse HTTP) |
| **TLS termination** | Pass-through (backend handles TLS) or terminate | Typically terminates TLS at the LB |
| **Content-based routing** | Not possible | Route `/api/*` to backend fleet, `/static/*` to CDN |
| **WebSocket support** | Works (it is just TCP) | Requires explicit support (upgrade handling) |
| **gRPC** | Broken (multiplexed streams on one TCP conn) | Required for correct per-request balancing |
| **Cost** | Lower (simpler hardware/software) | Higher (more CPU for parsing) |

**Decision**: use L7 for HTTP/HTTPS workloads (almost all web applications). Use L4 only for non-HTTP protocols (databases, message brokers, custom TCP protocols) or when you need maximum throughput and do not need content-based routing.

## Software vs Hardware vs Cloud-Managed

### Software Load Balancers

**Nginx**: the most widely deployed reverse proxy and load balancer. Handles L7 with excellent performance (50K+ concurrent connections on modest hardware). Open-source version supports round-robin, least-connections, IP hash. Nginx Plus adds active health checks, session persistence, and dynamic reconfiguration. Used by Dropbox, Airbnb, and WordPress.com.

**HAProxy**: purpose-built for high-availability load balancing. Supports both L4 and L7. Known for extremely low latency and high connection counts. Powers GitHub's entire edge layer. Configuration is more complex than Nginx but offers finer control over health checks, connection management, and failover behavior. HAProxy's stats dashboard is excellent for real-time debugging.

**Envoy**: designed for service mesh and microservice architectures. L7 proxy with advanced observability (distributed tracing, detailed metrics). Powers Istio and AWS App Mesh. Supports gRPC natively. More complex to operate standalone but excellent when integrated with Kubernetes. Used by Lyft (who created it), Uber, and Slack.

### Cloud-Managed Load Balancers

**AWS ALB (Application Load Balancer)**: L7, supports path-based and host-based routing, WebSocket, gRPC, and native integration with ECS/EKS target groups. Best for most AWS HTTP workloads. Pricing: per hour + per LCU (load capacity unit).

**AWS NLB (Network Load Balancer)**: L4, handles millions of requests per second with ultra-low latency. Preserves source IP. Best for non-HTTP protocols, extreme throughput requirements, or when you need static IPs. Supports TLS termination.

**GCP Cloud Load Balancing**: global anycast L7 load balancer with a single IP address that routes to the nearest healthy backend worldwide. Unique advantage: no pre-warming required (unlike ALB). Backends can span multiple regions transparently.

### Hardware Load Balancers

F5 BIG-IP and Citrix ADC are the legacy enterprise options. Extremely expensive ($50K-$500K+), but offer specialized features (DDoS mitigation, WAF, SSL offloading at line rate). Rarely justified for new deployments. The cloud-managed equivalents now cover nearly all use cases at a fraction of the cost.

## Real-World Examples

### Facebook (Meta): Katran

Facebook built Katran, an open-source L4 load balancer using XDP (eXpress Data Path) and eBPF to handle load balancing at the kernel level, bypassing the normal network stack entirely. At Facebook's scale (billions of users), traditional load balancers became bottlenecks. Katran can process over 10 million packets per second per core. It runs on commodity x86 servers, eliminating the need for expensive hardware load balancers. Facebook open-sourced Katran in 2018, and it runs on every edge PoP in their network. Behind Katran, Facebook uses Proxygen (their custom L7 proxy) for application-layer routing. (Source: Facebook Engineering Blog, "Open-sourcing Katran," 2018)

### GitHub: HAProxy at the Edge

GitHub uses HAProxy as their primary edge load balancer, handling all incoming Git and HTTP traffic. They run multiple HAProxy instances in an active-active configuration behind DNS-based global load balancing. HAProxy's ability to handle tens of thousands of concurrent connections with sub-millisecond latency makes it well-suited for Git's long-lived connections during push and pull operations. GitHub has published detailed posts about their HAProxy configuration, including custom Lua scripts for intelligent routing. (Source: GitHub Engineering Blog, "GLB: GitHub's open source load balancer," 2018)

### Cloudflare: Unimog

Cloudflare built Unimog, a custom L4 load balancer that distributes traffic across their 300+ edge locations. It uses a variant of consistent hashing with Maglev-style lookup tables to achieve even distribution while minimizing connection disruption during server changes. Unimog operates at the Linux kernel level using XDP, similar to Facebook's approach. (Source: Cloudflare Blog, "Unimog - Cloudflare's edge load balancer," 2020)

## Decision Framework

**Choose round-robin** when your fleet is homogeneous and request costs are uniform. It is the simplest option and the right default for teams starting out.

**Choose least-connections** when request processing times vary significantly (some endpoints are fast, others involve database queries or external API calls). This is the best general-purpose algorithm.

**Choose consistent hashing** when request affinity improves performance (caching layers, sharded data) and you can tolerate some imbalance.

**Choose ALB/NLB (cloud-managed)** when your team is small and you want zero operational burden for the load balancer itself. The cost premium over self-managed Nginx or HAProxy is usually worth it for teams under 20 engineers.

**Choose Nginx** when you need a flexible reverse proxy that also handles TLS termination, rate limiting, and static file serving. The most versatile option.

**Choose HAProxy** when you need maximum performance and fine-grained control over health checking and connection management. Better for teams with infrastructure expertise.

**Choose Envoy** when you are building a service mesh or need advanced observability (distributed tracing, per-route metrics) integrated into the proxy layer.

## Common Mistakes

1. **Using L4 for HTTP/2 or gRPC**: L4 load balancers see one TCP connection with multiplexed streams. All requests from one connection go to one backend, destroying load distribution. Use L7.

2. **No health checks**: without active health checks, the load balancer continues sending traffic to crashed or unresponsive servers. Configure both liveness (is the process running?) and readiness (can it serve traffic?) checks.

3. **Ignoring connection draining**: during deployments or scale-in events, in-flight requests on a removed server get terminated. Enable connection draining (deregistration delay) to let existing requests complete (typically 30-60 seconds).

4. **Sticky sessions as a crutch**: using IP hash or cookie-based sticky sessions to avoid fixing stateful application code creates scaling limitations and uneven load distribution. Externalize state instead.

5. **Single load balancer without redundancy**: the load balancer itself is a single point of failure. Run at least two instances with failover (VRRP for on-prem, multi-AZ for cloud).

6. **Not monitoring backend connection counts**: a misconfigured load balancer can open thousands of connections to a single backend, exhausting its connection pool. Set max-connections-per-backend limits.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|---|---|---|
| Backend response time (p50, p99) | <100ms (p50), <500ms (p99) | Detect slow backends before users notice |
| Active connections per backend | Even distribution (within 20%) | Ensures the algorithm is distributing correctly |
| Error rate (5xx from backends) | <0.1% | Distinguish LB errors from backend errors |
| Health check failure rate | 0 in steady state | Any failure triggers investigation |
| Connection draining duration | <60 seconds | Requests completing during deployments |
| LB CPU and memory utilization | <60% | LB itself becoming a bottleneck |
| TLS handshake latency | <50ms | TLS termination overhead |
| Requests per second (total) | Trend, not absolute | Capacity planning input |

## References

- Eisenbud, D. et al. (2016). "Maglev: A Fast and Reliable Software Network Load Balancer." NSDI. (Google's production L4 load balancer)
- Facebook Engineering. "Open-sourcing Katran, a scalable network load balancer." (2018). https://engineering.fb.com
- GitHub Engineering. "GLB: GitHub's open source load balancer." (2018). https://github.blog/engineering
- Cloudflare Blog. "Unimog - Cloudflare's edge load balancer." (2020). https://blog.cloudflare.com
- Nginx Documentation. "HTTP Load Balancing." https://docs.nginx.com
- HAProxy Documentation. "Configuration Manual." https://www.haproxy.org
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. Chapter 6.
