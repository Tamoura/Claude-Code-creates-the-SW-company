# Container Orchestration: Kubernetes, ECS, Docker Compose, and Nomad

Container orchestration automates the deployment, scaling, networking, and lifecycle management of containerized applications. The choice of orchestration platform is one of the highest-leverage infrastructure decisions a CTO makes, because it determines operational complexity, hiring requirements, cloud costs, and the ceiling on how far your infrastructure can scale. Getting this wrong means either paying the Kubernetes tax too early or hitting the Docker Compose ceiling too late.

## When to Use / When NOT to Use

| Scenario | Recommended | Avoid |
|----------|-------------|-------|
| 1-5 services, small team (<5 engineers) | Docker Compose + managed hosting, or ECS | Kubernetes (operational overhead will consume the team) |
| 5-20 services, growing team | ECS Fargate or managed K8s (EKS/GKE) | Self-managed Kubernetes; Docker Compose in production |
| 20-100+ services, platform team exists | Managed Kubernetes (EKS, GKE, AKS) | ECS (feature ceiling); Docker Compose (not designed for this) |
| Mixed workloads (containers + VMs + batch) | HashiCorp Nomad | Kubernetes (unless you containerize everything) |
| Edge computing or IoT | K3s (lightweight K8s) or Nomad | Full Kubernetes (resource requirements too high) |
| Local development | Docker Compose | Kubernetes (unless testing K8s-specific features) |
| Regulated industries with audit requirements | Managed K8s with policy engines (OPA/Kyverno) | Unmanaged solutions without audit trails |

## Platform Comparison

### Kubernetes

Kubernetes is the industry standard for container orchestration, originally developed by Google based on their internal Borg system. It provides a declarative API for managing containerized workloads with built-in service discovery, load balancing, rolling updates, self-healing, and secrets management.

**Strengths:**
- Largest ecosystem: Helm charts, operators, CNCF projects, community support
- Portable across clouds and on-premises
- Declarative configuration with GitOps workflows (ArgoCD, Flux)
- Extensive networking model (Ingress, NetworkPolicies, service mesh integration)
- Auto-scaling at pod level (HPA) and node level (Cluster Autoscaler, Karpenter)

**Weaknesses:**
- Steep learning curve: a team needs 3-6 months to become proficient
- Significant operational overhead even with managed services
- YAML configuration complexity grows rapidly
- Security surface area is large (RBAC, network policies, pod security standards, secrets)
- Cost of running the control plane, monitoring stack, and supporting infrastructure

**When Kubernetes is overkill:** If your application is a monolith or has fewer than 5 services, Kubernetes adds complexity without proportional benefit. The overhead of maintaining Helm charts, managing cluster upgrades, configuring Ingress, and debugging networking issues will consume engineering time that could be spent on product development.

### Amazon ECS (Elastic Container Service)

ECS is AWS's proprietary container orchestration service. It comes in two launch types: EC2 (you manage the instances) and Fargate (serverless, AWS manages the infrastructure).

**Strengths:**
- Deep AWS integration (ALB, CloudWatch, IAM, Secrets Manager, VPC)
- Fargate eliminates server management entirely
- Simpler mental model than Kubernetes (tasks, services, clusters)
- No control plane costs (Kubernetes charges $0.10/hour for EKS control plane)
- AWS Copilot CLI simplifies common patterns

**Weaknesses:**
- AWS lock-in: ECS task definitions and service discovery are AWS-specific
- Smaller ecosystem than Kubernetes: fewer third-party tools and operators
- Feature set is narrower (no equivalent to K8s CRDs, operators, or admission webhooks)
- Multi-region and multi-account setups require more manual configuration
- No on-premises option (compared to K8s which runs anywhere)

**ECS Fargate pricing model:** You pay per vCPU-second and GB-second of memory. For steady-state workloads, Fargate is more expensive than reserved EC2 instances. For bursty workloads with variable traffic, Fargate can be cheaper because you pay only for what you use. Fargate Spot offers up to 70% discount for fault-tolerant workloads.

### Docker Compose

Docker Compose defines multi-container applications in a single YAML file. It is the simplest orchestration tool and is designed for local development and small-scale production.

**Strengths:**
- Zero learning curve for anyone who knows Docker
- Single file defines the entire application stack
- Perfect for local development environments
- Adequate for single-server production deployments
- Built-in support for environment variables, volumes, and networking

**Weaknesses:**
- Single host only: no clustering, no multi-node distribution
- No auto-scaling, health-check-based restarts are basic
- No rolling updates: `docker compose up` recreates containers
- No service mesh, ingress, or advanced networking
- No secrets management beyond environment variables
- Not suitable for high-availability production workloads

**Docker Compose in production:** It works for small applications on a single server, especially with a process manager like systemd to restart the Compose stack on failure. Companies like Basecamp have famously run large applications on simple server setups. But once you need multi-server deployment, auto-scaling, or zero-downtime updates, you need to graduate to ECS or Kubernetes.

### HashiCorp Nomad

Nomad is a workload orchestrator that handles containers, VMs, Java applications, and batch jobs. It is simpler than Kubernetes while supporting more workload types.

**Strengths:**
- Simpler architecture: single binary, no etcd dependency
- Supports non-container workloads (Java JARs, raw executables, QEMU VMs)
- Integrates with HashiCorp ecosystem (Consul for service discovery, Vault for secrets)
- Scales to large clusters with less operational overhead than Kubernetes
- Multi-region federation is a first-class feature

**Weaknesses:**
- Smaller ecosystem and community than Kubernetes
- Fewer managed service options (HashiCorp Cloud Platform exists but is less mature)
- Hiring: fewer engineers have Nomad experience compared to Kubernetes
- Third-party tooling and integrations are more limited
- No equivalent to Kubernetes operators for automated application management

## Cost Comparison

| Component | Kubernetes (EKS) | ECS Fargate | ECS EC2 | Docker Compose |
|-----------|-------------------|-------------|---------|----------------|
| Control plane | $0.10/hr ($73/mo) | Free | Free | Free |
| Compute (small app, 2 vCPU, 4GB) | EC2 instances (~$60-150/mo) | ~$90-120/mo | ~$60-80/mo (on-demand) | Single server ($20-80/mo) |
| Load balancer | ALB ($16/mo + LCU) | ALB ($16/mo + LCU) | ALB ($16/mo + LCU) | Nginx on same server |
| Monitoring | Prometheus + Grafana (self-hosted) or Datadog ($15-23/host/mo) | CloudWatch (included basic) | CloudWatch (included basic) | Manual or basic tools |
| Engineering time | 0.5-1 FTE for cluster operations | Minimal | 0.25 FTE for instance management | Minimal |
| **Total (small team)** | **$500-2,000/mo + engineer time** | **$150-300/mo** | **$100-200/mo** | **$20-100/mo** |
| **Total (mid-scale)** | **$2,000-10,000/mo + platform team** | **$500-2,000/mo** | **$300-1,500/mo** | **Not applicable** |

These estimates assume a modest workload. Costs scale differently: Kubernetes has high fixed costs but efficient scaling; Fargate has low fixed costs but higher per-unit compute costs; Docker Compose has the lowest costs but cannot scale beyond a single server.

## Team Size Requirements

| Platform | Minimum Team to Operate | Ideal Team | Skills Required |
|----------|------------------------|------------|-----------------|
| Docker Compose | 1 developer | 1-3 developers | Docker basics, Linux sysadmin |
| ECS Fargate | 1-2 developers | 3-8 developers | AWS fundamentals, networking basics |
| ECS EC2 | 2-3 developers | 5-15 developers | AWS, EC2 instance management, AMIs |
| Managed K8s (EKS/GKE) | 3-5 developers (or 1 platform engineer) | 10+ developers with platform team | K8s concepts, Helm, networking, RBAC |
| Self-managed K8s | Minimum 2 dedicated platform engineers | Platform team of 3-5 | Deep K8s internals, etcd, networking, security |
| Nomad | 1-2 developers | 5-15 developers | Nomad, Consul, Vault |

## Real-World Examples

**Shopify's Kubernetes migration (2019-2020):** Shopify migrated their monolithic Rails application to Kubernetes to support Black Friday traffic (80,000+ requests per second). The migration took over a year and required a dedicated platform team. They reported significant benefits in deployment speed and reliability but acknowledged the substantial investment in tooling and training. Their blog details how they built custom autoscaling to handle traffic spikes that exceeded standard HPA capabilities.

**Render.com and Fly.io:** Both platforms built their PaaS offerings on top of container orchestration but explicitly chose NOT to expose Kubernetes to users. Render uses a custom orchestration layer; Fly.io uses a custom scheduler built on Firecracker MicroVMs. Their thesis: developers want the benefits of orchestration without the complexity.

**Cloudflare Workers (2017-present):** Cloudflare chose to build their serverless platform on V8 isolates rather than containers, bypassing container orchestration entirely. This demonstrates that containers are not always the answer; for certain workloads (especially edge computing), alternative approaches can offer better performance and lower overhead.

**Basecamp/37signals (2023):** David Heinemeier Hansson publicly documented 37signals' move off cloud back to owned hardware, using Kamal (formerly MRSK) for deployment. Kamal uses Docker but not Kubernetes, proving that not every successful company needs complex orchestration. Their workload (a large Rails monolith) did not benefit from microservice-oriented orchestration.

## Decision Framework

**Choose Docker Compose when:**
- You are building an MVP or prototype
- Your application runs on a single server
- You have 1-3 developers and no dedicated ops capacity
- Uptime requirements are moderate (99% is acceptable)
- You plan to migrate to a more capable platform later

**Choose ECS Fargate when:**
- You are an AWS shop and want minimal operational overhead
- You have 5-20 services that need auto-scaling
- Your team is 3-10 engineers without a dedicated platform team
- You prioritize simplicity over portability
- Your workloads are bursty and benefit from per-second billing

**Choose managed Kubernetes (EKS, GKE, AKS) when:**
- You have 20+ microservices or expect to reach that scale
- You need multi-cloud or hybrid-cloud portability
- You have or can hire platform engineering expertise
- You need advanced features: custom operators, service mesh, policy engines
- Your organization is large enough to justify the operational investment

**Choose Nomad when:**
- You run mixed workloads (containers + VMs + batch jobs)
- You are already in the HashiCorp ecosystem (Consul, Vault, Terraform)
- You want Kubernetes-like capabilities with less complexity
- Multi-region federation is a core requirement
- Your team prefers a simpler operational model

## Common Mistakes

1. **Adopting Kubernetes because it is the industry standard.** Kubernetes solves problems that most startups do not have. If your application is a monolith with a small team, ECS Fargate or even a simple Docker Compose setup with a load balancer will serve you better at a fraction of the cost and complexity.

2. **Underestimating the operational cost of Kubernetes.** The cloud bill for EKS is the tip of the iceberg. The real cost is the engineering time spent on cluster upgrades, debugging networking issues, managing Helm charts, configuring monitoring, and responding to node failures. Budget 0.5-1 FTE of platform engineering time for a production Kubernetes cluster.

3. **Running self-managed Kubernetes in production.** Unless you are a cloud provider or have a very specific compliance reason, use managed Kubernetes. Self-managing etcd, the API server, and the control plane is a full-time job for multiple engineers.

4. **Not planning for cluster upgrades.** Kubernetes releases a new minor version every 4 months, and each version is supported for approximately 14 months. Managed providers typically support 3-4 versions. Falling behind on upgrades creates a compounding debt that becomes increasingly difficult and risky to resolve.

5. **Over-provisioning resources.** Container resource requests and limits are often set based on guesswork. Use tools like Vertical Pod Autoscaler (VPA) recommendations or Kubecost to right-size containers. Over-provisioning wastes money; under-provisioning causes OOM kills and throttling.

6. **Ignoring multi-tenancy and security.** Running all services in a single namespace with default network policies is a security risk. Implement RBAC, network policies, and pod security standards from the beginning. Retrofitting security is much harder than building it in.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Cluster resource utilization (CPU/memory) | 60-80% | Below 60% = waste; above 80% = risk of resource pressure |
| Pod restart count | <5/day per service | High restarts indicate OOM kills, health check failures, or crashes |
| Deployment success rate | >99% | Failed deployments indicate pipeline or configuration issues |
| Node count vs workload | Matches demand curve | Over-provisioned nodes waste money; under-provisioned causes scheduling failures |
| Time to scale (0 to N pods) | <2 minutes | Slow scaling causes request drops during traffic spikes |
| Cluster upgrade cadence | Every 3-4 months | Falling behind creates upgrade debt |
| Container image size | <200MB for app containers | Large images slow deployment and increase storage costs |
| Cost per request/transaction | Benchmarked and trending | Ensures infrastructure costs scale sub-linearly with growth |

## References

- Kubernetes documentation. "Production Best Practices" -- https://kubernetes.io/docs/setup/best-practices/
- AWS ECS documentation. "Amazon ECS Best Practices Guide" -- https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- HashiCorp Nomad documentation. "Nomad vs Kubernetes" -- https://www.nomadproject.io/docs/nomad-vs-kubernetes
- Shopify Engineering Blog. "Scaling Shopify's Infrastructure for Black Friday" -- https://shopify.engineering/
- 37signals. "Why We're Leaving the Cloud" -- https://world.hey.com/dhh/
- Kubecost documentation. "Kubernetes Cost Optimization" -- https://www.kubecost.com/
- Datadog. "Container Orchestration Report" (annual survey of container adoption trends) -- https://www.datadoghq.com/container-report/
- CNCF Annual Survey. Container orchestration adoption statistics -- https://www.cncf.io/reports/
- Google SRE Book. Chapter 25: "Data Processing Pipelines" (orchestration at scale) -- https://sre.google/sre-book/
