# API Gateway Patterns: Centralizing Cross-Cutting Concerns at the Edge

## Overview

An API gateway is a single entry point that sits between external clients and your backend services, handling cross-cutting concerns like authentication, rate limiting, request routing, and protocol translation. It decouples clients from the internal service topology, allowing backend teams to restructure, scale, and deploy services independently without breaking client contracts. The gateway is not merely a reverse proxy; it is a policy enforcement point that centralizes operational concerns that would otherwise be duplicated across every service.

## When to Use / When NOT to Use

| Factor | Use an API Gateway | Skip the Gateway |
|--------|-------------------|------------------|
| Number of backend services | 3+ services with different endpoints | Single monolith with one API surface |
| Client diversity | Mobile, web, third-party, and internal clients with different needs | Single client type with uniform requirements |
| Auth complexity | Centralized JWT validation, API key management, OAuth flows | Simple auth that each service handles identically |
| Rate limiting needs | Per-client, per-endpoint, or tiered rate limiting | No rate limiting or simple infrastructure-level throttling |
| Protocol translation | Clients use REST but some services use gRPC or GraphQL | Uniform protocol across all services |
| Team structure | Multiple teams owning different services | Single team managing everything |
| Operational maturity | Team can operate and monitor another infrastructure component | Minimizing operational surface area is the priority |

## Gateway vs Load Balancer vs Reverse Proxy

These three concepts overlap but serve different purposes. Conflating them leads to architectural mistakes.

**Reverse proxy (Nginx, HAProxy).** Accepts client requests and forwards them to backend servers. Handles TLS termination, static file serving, and basic request routing. It operates at the HTTP level but has no awareness of your application's business logic, authentication schemes, or API contracts.

**Load balancer (ALB, NLB, HAProxy).** Distributes traffic across multiple instances of the same service. Can operate at Layer 4 (TCP) or Layer 7 (HTTP). Its job is availability and distribution, not API management. An ALB can do path-based routing, but it does not understand rate limiting policies or JWT claims.

**API gateway (Kong, AWS API Gateway, custom Fastify gateway).** Sits at the application layer and enforces API-level policies. It understands your API contracts, authenticates requests, applies rate limits per consumer, transforms request/response payloads, and routes to different backend services based on API paths, headers, or consumer identity. A gateway often uses a reverse proxy or load balancer underneath, but adds an application-aware policy layer on top.

**The key distinction:** A reverse proxy routes traffic. A load balancer distributes traffic. A gateway governs traffic.

## Core Gateway Patterns

### 1. Authentication Offloading

The gateway validates authentication tokens before requests reach backend services. This means individual services never see unauthenticated traffic and do not need to implement token validation logic.

**How it works:** The gateway intercepts each request, extracts the bearer token or API key, validates it (JWT signature verification, token expiration, API key lookup), and injects the authenticated identity into downstream request headers. Backend services trust these headers because they only accept traffic from the gateway's internal network.

**Trade-off:** Centralizing auth simplifies services but creates a single point of failure for authentication. If the gateway's auth logic has a bug, every service is affected. Mitigate this with extensive testing of auth middleware and canary deployments for gateway changes.

### 2. Rate Limiting

Rate limiting at the gateway prevents abuse before it reaches your services. Gateway-level rate limiting is more efficient than per-service rate limiting because it operates before request processing begins.

**Strategies:**
- **Fixed window:** Simple to implement, but allows burst traffic at window boundaries. A client limited to 100 requests per minute could send 100 requests at 0:59 and 100 more at 1:00, creating a burst of 200.
- **Sliding window:** Eliminates the boundary burst problem. More computationally expensive but fairer.
- **Token bucket:** Allows controlled bursting while enforcing average rate. Stripe uses this model for their API, allowing clients to accumulate tokens during idle periods and spend them during bursts.
- **Adaptive rate limiting:** Adjusts limits based on backend health. When a service's error rate or latency increases, the gateway automatically reduces the rate limit to prevent cascading failure. Netflix's Zuul implements this pattern.

**Per-consumer policies:** Rate limits should vary by consumer tier. Your enterprise API customers get 10,000 requests per minute while free-tier users get 100. The gateway enforces this by looking up the consumer's plan from the authenticated identity.

### 3. Request Routing

The gateway routes requests to appropriate backend services based on URL paths, HTTP methods, headers, or query parameters.

**Path-based routing:** `/api/v1/users/*` routes to the user service, `/api/v1/orders/*` routes to the order service. This is the simplest and most common pattern.

**Header-based routing:** Route requests based on custom headers like `X-API-Version` or `Accept` content types. Useful for API versioning without path changes.

**Canary routing:** Send a percentage of traffic to a new service version while the majority goes to the stable version. The gateway manages the traffic split, often using weighted routing or cookie-based stickiness.

**Backend-for-Frontend (BFF):** Different gateways (or gateway configurations) for different clients. The mobile BFF aggregates multiple service calls into a single response optimized for mobile bandwidth. The web BFF returns richer payloads. Netflix uses dedicated BFF gateways for each device platform (iOS, Android, TV, web) because each has different data and latency requirements.

### 4. Request/Response Transformation

The gateway can modify requests before forwarding and responses before returning to clients. This includes adding headers, stripping internal fields from responses, transforming between protocols (REST to gRPC), and aggregating responses from multiple services.

**Response aggregation (API composition):** A single client request to `/api/v1/dashboard` might require data from user, analytics, and billing services. The gateway fans out to all three, combines results, and returns a single response. This reduces client-side complexity and round trips.

**Caution:** Heavy transformation logic in the gateway creates a bottleneck and makes the gateway a deployment chokepoint. Keep transformations thin. If you need complex aggregation, consider a dedicated BFF service rather than embedding logic in the gateway.

### 5. Circuit Breaking and Resilience

The gateway can implement circuit breakers that stop sending traffic to unhealthy services. When a backend service starts returning errors or timing out, the circuit opens and the gateway returns a cached response or a graceful degradation response immediately, protecting both the failing service and the client from cascading failure.

## Technology Comparison

### Kong (Open Source / Enterprise)

Kong is built on Nginx and OpenResty (Lua). It excels at high-throughput scenarios and has a large plugin ecosystem. Kong Gateway handles authentication, rate limiting, logging, and transformation through plugins. The enterprise edition adds a management UI, RBAC, and developer portal. Kong is a strong choice when you need a standalone, infrastructure-level gateway that is language-agnostic.

### AWS API Gateway

Fully managed, zero-infrastructure gateway. Integrates deeply with AWS services (Lambda, IAM, Cognito, CloudWatch). Supports REST, HTTP, and WebSocket APIs. The managed nature eliminates operational overhead but limits customization. Pricing is per-request, which can become expensive at high volumes (roughly $3.50 per million requests plus data transfer). Best for AWS-native architectures where you want to minimize operational burden.

### Custom Fastify Gateway

Building a gateway with Fastify gives you full control over routing logic, authentication, and middleware. Fastify's plugin architecture maps well to gateway concerns: `@fastify/rate-limit` for throttling, `@fastify/jwt` for token validation, `@fastify/http-proxy` for reverse proxying to backend services. A custom gateway is appropriate when your routing logic is tightly coupled to business rules or when you need deep integration with your service framework. The trade-off is that you own all the operational complexity: health checks, graceful shutdown, connection pooling, and failover.

### Envoy / Istio (Service Mesh)

Envoy operates as a sidecar proxy alongside each service rather than as a centralized gateway. Istio builds a control plane on top of Envoy sidecars. This pattern handles east-west traffic (service-to-service) rather than north-south traffic (client-to-service). You often use both: an API gateway for north-south and a service mesh for east-west. Lyft developed Envoy specifically because existing proxy solutions did not handle their microservices observability needs.

## Real-World Examples

### Netflix Zuul: The Programmable Edge

Netflix's Zuul gateway handles all incoming traffic to their streaming platform, processing billions of requests daily. Zuul's architecture is based on filters: pre-filters handle authentication and routing, route-filters handle proxying to backend services, post-filters handle response modification, and error-filters handle failure scenarios. What makes Zuul distinctive is its dynamic filter loading: Netflix engineers can deploy new routing rules or authentication logic without redeploying the gateway itself. Zuul also implements adaptive rate limiting that throttles traffic when backend services show signs of stress, which has been critical for Netflix's resilience during traffic spikes.

### Stripe: API Versioning Through the Gateway

Stripe maintains backward compatibility across years of API versions. Their gateway plays a central role in this: when a client sends a request with an API version header, the gateway routes to the appropriate version handler. Internally, Stripe transforms older API requests into the current internal format, processes them, and transforms the response back to the version the client expects. This means backend services only implement the current API version, and the gateway handles version translation. This pattern has allowed Stripe to evolve their API without breaking existing integrations, which is critical for a payments platform where breaking changes mean lost revenue for merchants.

### Uber: Multi-Tier Gateway Architecture

Uber operates a multi-tier gateway architecture. The outer tier handles external client traffic (rider app, driver app, Uber Eats), performing TLS termination, authentication, and coarse-grained rate limiting. An inner tier handles service-to-service traffic within their datacenter, enforcing service-level authorization and fine-grained traffic management. This separation allows Uber to apply different policies to external versus internal traffic while maintaining a consistent routing infrastructure. Their gateway also implements request hedging: for latency-critical paths like ride matching, the gateway sends the same request to multiple backend instances and returns whichever responds first.

## Decision Framework

**Choose a managed gateway (AWS API Gateway, Google Cloud Endpoints) when:**
- You are running on a single cloud provider and want minimal operational overhead
- Your traffic volume is under 100 million requests per month (cost-effective range)
- Your routing and transformation needs are standard (path-based routing, JWT validation)
- You do not need custom logic beyond what plugins or configurations provide

**Choose an open-source gateway (Kong, Traefik, APISIX) when:**
- You need vendor independence or run across multiple clouds
- You require extensive customization through plugins
- Your traffic volume makes per-request pricing expensive
- You want a developer portal and API lifecycle management

**Choose a custom gateway (Fastify, Express, Go) when:**
- Your routing logic is tightly coupled to business rules
- You need deep integration with your service framework
- Your team has strong operational capabilities
- You want full control over the request lifecycle

**Choose a service mesh (Istio, Linkerd) when:**
- You have 20+ microservices and need service-to-service traffic management
- mTLS between services is a requirement
- You need fine-grained observability across service calls
- You already have an edge gateway and need to manage internal traffic

## Common Mistakes

**Making the gateway a monolith.** When teams add business logic, data transformation, and aggregation to the gateway, it becomes a deployment bottleneck. Every team's changes flow through the gateway, creating merge conflicts and deployment coordination overhead. Keep the gateway thin: auth, rate limiting, routing, and minimal transformation.

**Single gateway for all traffic types.** External client traffic, internal service traffic, and partner API traffic have different security, rate limiting, and SLA requirements. Using a single gateway for all three forces compromises. Use separate gateways (or gateway configurations) for each traffic type.

**No gateway health monitoring.** The gateway is a single point of failure. If it goes down, everything goes down. Implement comprehensive health checks, automated failover, and dashboard alerting for gateway latency, error rates, and connection pool exhaustion.

**Caching too aggressively at the gateway.** Gateway-level caching can dramatically improve performance but introduces consistency issues. If a user updates their profile, the gateway's cache might serve stale data. Only cache responses that are explicitly cache-safe, and provide cache invalidation mechanisms.

**Ignoring gateway latency overhead.** Every millisecond the gateway adds to request processing is multiplied by every request. Profile your gateway's overhead and keep it under 5-10ms for simple pass-through routing. If your gateway adds 50ms of latency, that may be unacceptable for real-time applications.

**Not versioning gateway configurations.** Gateway routing rules, rate limit policies, and auth configurations should be version-controlled and deployed through the same CI/CD pipeline as your services. Manual gateway configuration changes are a top cause of production incidents.

## Key Metrics to Track

| Metric | What It Tells You | Target |
|--------|-------------------|--------|
| Gateway latency overhead (p50, p95, p99) | How much latency the gateway adds to each request | Under 10ms for p99 |
| Error rate at the gateway | Whether the gateway itself is failing | Under 0.1% |
| Rate limit trigger rate | How often consumers hit rate limits | Varies; high rates may indicate limits are too restrictive |
| Authentication failure rate | Unauthorized access attempts or token issues | Monitor for spikes indicating attacks |
| Upstream service response time (per service) | Backend performance as seen from the gateway | Defined per-service SLA |
| Connection pool utilization | Whether the gateway is running out of connections to backends | Under 80% |
| Cache hit ratio (if caching) | Whether caching is effective | Above 80% for cacheable endpoints |
| Requests per second (total and per consumer) | Traffic volume and distribution | Monitor for capacity planning |

## References

- Anand, M. "Zuul 2: The Netflix Journey to Asynchronous, Non-Blocking Systems." Netflix Tech Blog, 2018.
- Richardson, C. "API Gateway Pattern." microservices.io.
- Brandur, L. "API Versioning at Stripe." Stripe Engineering Blog, 2017.
- Kong Inc. "Kong Gateway Architecture." Kong Documentation.
- AWS. "Amazon API Gateway Developer Guide." AWS Documentation.
- Lyft Engineering. "Envoy Proxy." envoyproxy.io.
- Newman, S. "Building Microservices." O'Reilly Media, 2nd Edition, 2021.
- Richardson, C. "Microservices Patterns." Manning Publications, 2018.
