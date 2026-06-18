# Deployment Patterns and Strategies

Deployment patterns determine how new code reaches production and how risk is managed during releases. The choice of deployment strategy directly impacts uptime, rollback speed, developer velocity, and user experience. For a CTO, selecting the right deployment pattern is a balance between operational complexity, infrastructure cost, and the blast radius of a bad release.

## When to Use / When NOT to Use

| Pattern | Use When | Avoid When |
|---------|----------|------------|
| Blue-Green | You need instant rollback; regulatory environments requiring validated environments | Budget is tight (requires 2x infrastructure); stateful workloads with shared databases |
| Canary | High-traffic services where gradual validation matters; you have observability in place | You lack metrics/alerting to detect issues; traffic volume is too low for statistical significance |
| Rolling | Running on orchestrators (K8s, ECS); stateless services; routine deployments | Database schema changes that are not backward-compatible; you need instant full rollback |
| Recreate | Dev/staging environments; batch processing systems with maintenance windows | Production services requiring zero downtime |
| A/B Testing | Product experiments tied to deployments; different feature sets for different segments | Pure infrastructure changes; when you need deterministic behavior for all users |
| Feature Flags | Decoupling deployment from release; gradual rollouts; kill switches | Simple applications with infrequent deploys; when flag debt is not managed |

## Deployment Patterns in Detail

### Blue-Green Deployment

Two identical production environments exist: Blue (current) and Green (new). Traffic is routed entirely to one environment. The new version is deployed to the idle environment, validated, and then traffic is switched.

**How it works:**
1. Blue environment serves all production traffic.
2. Deploy new version to Green environment.
3. Run smoke tests and validation against Green.
4. Switch the load balancer or DNS to point to Green.
5. Blue becomes the idle environment (and your instant rollback target).

**Rollback:** Switch traffic back to Blue. Takes seconds at the load balancer level, minutes at the DNS level.

**Challenges:** Database migrations must be forward-compatible because both environments share the same database. Running two full environments doubles infrastructure cost during the deployment window. Session state must be externalized (Redis, database) so users are not disrupted during the switch.

### Canary Deployment

A small percentage of traffic is routed to the new version while the majority continues hitting the old version. The percentage is gradually increased as confidence grows.

**Typical progression:**
1. Deploy new version to a small subset of instances (1-5% of capacity).
2. Route 1-5% of traffic to the new version.
3. Monitor error rates, latency, and business metrics for 15-30 minutes.
4. If metrics are healthy, increase to 10%, then 25%, then 50%, then 100%.
5. If metrics degrade at any stage, route all traffic back to the old version.

**Rollback:** Remove canary instances from the load balancer pool. Traffic immediately returns to old version.

**Challenges:** Requires sophisticated traffic routing (weighted routing in ALB, Istio, Envoy, or Nginx). Observability must be per-version so you can compare canary metrics against baseline. Not effective with low traffic volumes because statistical significance requires enough requests to detect regressions.

### Rolling Deployment

Instances are updated one at a time (or in small batches). At any point during the deployment, some instances run the old version and some run the new version. This is the default strategy in Kubernetes Deployments.

**How it works:**
1. Take one instance out of the load balancer pool.
2. Deploy the new version to that instance.
3. Health check passes, instance rejoins the pool.
4. Repeat for the next instance.
5. Continue until all instances run the new version.

**Kubernetes parameters:**
- `maxUnavailable`: How many pods can be down simultaneously (default: 25%).
- `maxSurge`: How many extra pods can exist during the update (default: 25%).

**Rollback:** In Kubernetes, `kubectl rollout undo deployment/app` reverts to the previous ReplicaSet. Without an orchestrator, rollback requires re-deploying the old version through the same rolling process, which takes time.

**Challenges:** During the rollout, both old and new versions serve traffic simultaneously. APIs must be backward-compatible. Long rollouts in large clusters can leave the system in a mixed state for extended periods.

### Recreate Deployment

All existing instances are terminated, then new instances are deployed. Simple but causes downtime.

**When it is acceptable:**
- Development and staging environments where downtime does not matter.
- Batch processing systems that run during scheduled maintenance windows.
- Applications where running two versions simultaneously causes data corruption.
- Very early-stage products with no SLA commitments.

**Rollback:** Deploy the previous version using the same recreate process. Downtime doubles.

### A/B Testing Deployment

Distinct versions are deployed simultaneously, and traffic is split based on user attributes (geography, account type, cookie, header). Unlike canary, the split is intentional and tied to a product experiment rather than a progressive rollout.

**Relationship to feature flags:** A/B testing deployments and feature flags overlap significantly. Feature flags are generally preferred because they decouple the deployment from the experiment. However, A/B testing at the deployment level is sometimes necessary when the changes are too large to feature-flag (e.g., entirely different service architectures).

## Feature Flags for Deployment

Feature flags are the most powerful tool for separating deployment from release. Code ships to production but is hidden behind a flag that can be toggled without a deployment.

### Types of flags

| Type | Lifespan | Example |
|------|----------|---------|
| Release flag | Days to weeks | New checkout flow, toggled on after validation |
| Experiment flag | Weeks to months | A/B test for pricing page layout |
| Ops flag | Permanent | Circuit breaker for external dependency |
| Permission flag | Permanent | Premium feature available only to paid tiers |

### Flag management

Use a dedicated flag service (LaunchDarkly, Unleash, Flagsmith, or Statsig) rather than environment variables or config files. Dedicated services provide:
- Instant propagation without redeployment
- Audit logs of who changed what flag and when
- Percentage-based rollouts with consistent user bucketing
- Integration with analytics for experiment results

### Flag debt

Flags that outlive their purpose become technical debt. Every release flag should have an expiration date. Track the number of active flags as a health metric. Schedule monthly flag cleanup reviews. Stale flags increase code complexity and cognitive load, and can hide dead code paths that never get tested.

## Rollback Strategies

| Strategy | Speed | Risk | Best For |
|----------|-------|------|----------|
| Load balancer switch (blue-green) | Seconds | Low | Stateless services with parallel environments |
| Kubernetes rollout undo | 1-5 minutes | Low | Container-orchestrated services |
| Feature flag toggle | Seconds | Very low | Functionality behind flags |
| Revert commit + redeploy | 5-30 minutes | Medium | When rollback artifacts are not available |
| Database restore | 30-120 minutes | High | Last resort for data corruption |

**The rollback question every CTO should ask:** "If this deployment fails at 3 AM, how long does it take to restore service, and does the on-call engineer know how to do it?" If the answer is not documented and rehearsed, the deployment pattern is incomplete.

## Zero-Downtime Deployment

Zero-downtime deployment requires addressing four areas:

**1. Application readiness:** Health check endpoints (`/healthz`, `/readyz`) must accurately reflect when an instance can serve traffic. Kubernetes uses readiness probes to gate traffic; configure them with realistic thresholds.

**2. Graceful shutdown:** When an instance is terminated, it must stop accepting new connections, finish in-flight requests, and then exit. In Kubernetes, this means handling SIGTERM correctly and setting `terminationGracePeriodSeconds` appropriately.

**3. Database compatibility:** Schema migrations must be backward-compatible. Use the expand-contract pattern: first add the new column/table (expand), deploy code that writes to both old and new schemas, then remove the old schema (contract) in a later deployment. Tools like `gh-ost` (GitHub) or `pt-online-schema-change` (Percona) enable zero-downtime MySQL migrations. For PostgreSQL, use `pg_repack` or careful `ALTER TABLE` with `NOT VALID` constraints.

**4. Session management:** User sessions must not be tied to a specific instance. Use external session stores (Redis, database) or stateless tokens (JWTs). Sticky sessions at the load balancer level are a fallback but complicate scaling and deployment.

## Real-World Examples

**GitHub (2012-present):** GitHub pioneered the use of feature flags (via their `Scientist` library) to safely deploy changes to their monolithic Rails application. They deploy to production dozens of times per day using a combination of canary deployments and feature flags, with automated rollback triggered by error rate spikes. Their blog post "Move Fast and Fix Things" describes how they reduced deployment risk by 90% through progressive delivery.

**Netflix:** Netflix uses canary deployments extensively through their Spinnaker deployment platform. Every production change goes through an automated canary analysis (Kayenta) that compares metrics between canary and baseline groups. Deployments that degrade key metrics are automatically rolled back without human intervention. This system handles thousands of deployments per day across hundreds of microservices.

**Etsy:** Etsy was an early advocate of continuous deployment, shipping code 50+ times per day. They used feature flags (via their `Feature` library) to decouple deployment from release, allowing engineers to merge code to main and have it in production within minutes while keeping new features hidden until ready. Their approach demonstrated that frequent small deployments are safer than infrequent large ones.

**Amazon:** Amazon reported deploying every 11.7 seconds on average across their infrastructure. They achieve this through automated pipelines with progressive rollouts, where each deployment starts in a single availability zone and expands only after automated validation passes.

## Decision Framework

**Choose Blue-Green when:**
- You need the fastest possible rollback (seconds)
- Your organization has compliance requirements for pre-validated production environments
- You can afford the infrastructure cost of running two environments
- Your deployment frequency is moderate (daily or weekly)

**Choose Canary when:**
- You have high traffic volume (enough for statistical significance)
- You have mature observability (per-version metrics, automated analysis)
- You want to limit blast radius to a small percentage of users
- You deploy frequently and want automated progressive rollouts

**Choose Rolling when:**
- You use Kubernetes or ECS (it is the default and well-supported)
- Your services are stateless and backward-compatible
- You want simplicity without extra infrastructure cost
- Your team is small and cannot manage complex deployment tooling

**Choose Feature Flags when:**
- You want to decouple deployment from release
- You need instant kill switches for new features
- You want to run product experiments in production
- Your deployment pipeline is already established and you want finer control over releases

## Common Mistakes

1. **Choosing canary without observability.** A canary deployment without per-version metrics, alerting, and automated rollback is just a slow rolling deployment. Invest in observability before investing in canary infrastructure.

2. **Ignoring database migration compatibility.** The most common cause of failed zero-downtime deployments is a schema change that breaks the old version of the code. Always use expand-contract migration patterns.

3. **Not testing rollbacks.** If you have never rolled back in production, your rollback process is untested and probably broken. Conduct regular rollback drills.

4. **Accumulating feature flag debt.** Every flag adds a code path. Ten flags means 1,024 possible combinations. Set expiration dates and enforce cleanup.

5. **Conflating deployment frequency with deployment safety.** Deploying 50 times a day is safe only if each deployment is small, reversible, and monitored. Deploying 50 large, unmonitored changes per day is reckless.

6. **Not having a deployment runbook.** Even with automation, engineers need to know what to do when automation fails. Document the manual steps for every deployment pattern you use.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Deployment frequency | Multiple per day (high-performers) | DORA metric; correlates with organizational performance |
| Lead time for changes | Less than 1 day (high-performers) | Time from commit to production |
| Change failure rate | <5% (high-performers) | Percentage of deployments causing incidents |
| Mean time to restore (MTTR) | Less than 1 hour | How quickly you recover from a failed deployment |
| Rollback duration | <5 minutes | Time to fully revert a bad deployment |
| Canary error rate delta | <0.1% above baseline | Detects regressions before full rollout |
| Active feature flags | <20 per service | Prevents flag debt accumulation |

## References

- Humble, J. and Farley, D. "Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation." Addison-Wesley, 2010.
- Forsgren, N., Humble, J., and Kim, G. "Accelerate: The Science of Lean Software and DevOps." IT Revolution Press, 2018.
- Netflix Technology Blog. "Automated Canary Analysis at Netflix with Kayenta" -- https://netflixtechblog.com/
- GitHub Engineering Blog. "Move Fast and Fix Things" and "Deploying at GitHub" -- https://github.blog/engineering/
- Spinnaker documentation. "Deployment Strategies" -- https://spinnaker.io/docs/
- Google SRE Book. Chapter 8: "Release Engineering" -- https://sre.google/sre-book/release-engineering/
- Martin Fowler. "Feature Toggles (Feature Flags)" -- https://martinfowler.com/articles/feature-toggles.html
