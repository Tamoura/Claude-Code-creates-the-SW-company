# Building a Metrics Infrastructure

A metrics program is only as good as the infrastructure that collects, stores, and surfaces the data. You can define the most thoughtful SLOs and adopt every framework in this knowledge base, but if your observability stack is unreliable, your dashboards are stale, or your alerts wake people up for non-issues, the whole program collapses. This guide covers the practical engineering of metrics infrastructure: what to build, what to buy, how to avoid alert fatigue, and how to keep costs from spiraling as you scale.

## When to Use / When NOT to Use

| Use This Guide When | Do NOT Use This Guide When |
|---|---|
| You are choosing or replacing your observability stack | You have fewer than 3 services and 1 engineer on call — start with basic application logging and uptime monitoring |
| Alert fatigue is a real problem and on-call engineers are burning out | You are looking for a specific monitoring tool recommendation without understanding your requirements first |
| Your monitoring costs are growing faster than your infrastructure | You want to measure developer productivity — this covers operational observability, not DORA or SPACE |
| You are adopting SLOs and need infrastructure to track them | Your team does not yet have a clear incident response process — define the process before building the tooling |
| You are evaluating build vs buy for your monitoring platform | You are a single-product company with one deployment target — SaaS monitoring tools will serve you well without custom infrastructure |

## The Observability Stack

### Logging vs Metrics vs Traces

These three pillars serve different purposes and are not interchangeable.

**Logs:** Discrete events with context. A log entry tells you what happened at a specific moment. Logs are high-cardinality (every request can produce a unique log line) and high-volume. They are essential for debugging but expensive to store and search at scale.

Use logs for debugging specific requests, incident reconstruction, and audit compliance. Do not aggregate logs for real-time metrics — that is expensive and fragile.

**Metrics:** Numeric measurements aggregated over time. Low-cardinality and efficient to store. Use for real-time visibility, alerting, SLO tracking, and capacity planning. Not useful for debugging a specific request.

**Traces:** The path of a single request through a distributed system. Use for diagnosing latency across microservices and finding bottlenecks. Skip if you run a monolith — traces add complexity without value in single-service architectures.

### The Four Golden Signals

Google's SRE book defines four signals that every service should monitor. If you instrument nothing else, instrument these.

| Signal | What to Track |
|---|---|
| **Latency** | p50, p90, p95, p99 response time. Track successful and failed requests separately. Segment by endpoint and customer tier. |
| **Traffic** | Requests/sec (HTTP), queries/sec (DB), messages/sec (queues), active connections. |
| **Errors** | 5xx rate, error rate by type (timeout, validation, dependency). Include business logic errors (failed payments returning 200). |
| **Saturation** | CPU (>70% warning), memory (>80% warning), disk I/O, DB connection pool utilization, queue depth. |

### Tool Landscape

#### Open Source Stack

**Prometheus + Grafana:**

The most widely adopted open-source metrics and dashboarding stack. Prometheus scrapes metrics from your services at regular intervals and stores them in a time-series database. Grafana provides visualization and alerting.

| Strength | Limitation |
|---|---|
| Free and widely understood | Operational burden — you run and scale the infrastructure |
| Pull-based model is simple and reliable | Single-node Prometheus does not scale beyond ~10M active time series |
| PromQL is powerful and well-documented | No built-in long-term storage (solved by Thanos or Cortex) |
| Massive ecosystem of exporters and integrations | Grafana dashboard sprawl requires governance |

**Cost at scale:** Free for the software. Infrastructure costs $500-2,000/month for a mid-size deployment (3-5 Prometheus servers, Thanos for long-term storage, Grafana with appropriate compute). Engineering time for maintenance is the hidden cost — budget 10-20% of one SRE's time.

**When to choose it:** You have SRE capacity to operate infrastructure, you want full control over data retention and access, or you are in a regulated industry where data residency matters.

**OpenTelemetry (OTel):**

An open standard for instrumenting applications to emit logs, metrics, and traces. OTel provides vendor-neutral SDKs, a collector for processing telemetry data, and exporters that can send data to any compatible backend (Prometheus, Jaeger, Datadog, New Relic, etc.).

**Why OTel matters for CTOs:** Vendor lock-in in observability is expensive and painful. If you instrument your code with Datadog's proprietary SDK, switching to New Relic later means re-instrumenting every service. OTel lets you instrument once and switch backends by changing a configuration file.

```
Adoption strategy:
1. New services: instrument with OTel from day one
2. Existing services: migrate incrementally during regular maintenance
3. Use the OTel Collector as a central routing layer — it can fan out to
   multiple backends simultaneously during migration
```

#### Commercial SaaS Platforms

**Datadog:**

The most comprehensive commercial observability platform. Covers metrics, logs, traces, APM, synthetic monitoring, real user monitoring, security monitoring, and more.

| Strength | Limitation |
|---|---|
| Single pane of glass for all observability | Expensive — costs grow rapidly with scale |
| Excellent UX, fast time to value | Pricing is complex and per-host/per-GB/per-feature |
| Strong APM and distributed tracing | Vendor lock-in if you use their proprietary agents |
| Automatic service maps and dependency detection | Can be overwhelming — too many features for small teams |

**Cost at scale:** $15-25 per host per month for infrastructure monitoring. $31-40 per host per month for APM. Log management at $0.10-1.70 per ingested GB. A 50-engineer company with 200 hosts can expect $5,000-15,000/month depending on features enabled.

**When to choose it:** You want a managed platform, your team does not have SRE capacity to operate monitoring infrastructure, and you are willing to pay for breadth of features and ease of setup.

**New Relic:** Full-stack observability with a generous free tier (100GB/month). Per-GB pricing is simpler than Datadog's model. Cost: $49-99/user/month plus $0.30-0.50 per GB beyond free tier. Can be cheaper for organizations with many hosts but few dashboard users.

**Grafana Cloud:** Managed Grafana + Prometheus + Loki + Tempo. Open standards, no vendor lock-in, typically 30-50% cheaper than Datadog. Usage-based pricing starting at $0.15/1K metric series. Best when your team already uses Grafana OSS or you value portability.

### Build vs Buy Decision Framework

| Factor | Build (Open Source) | Buy (SaaS) |
|---|---|---|
| Time to value | Weeks to months | Hours to days |
| Ongoing operational cost | High (engineering time) | Low (vendor manages) |
| License cost | Free | $5K-50K+/month at scale |
| Customization | Unlimited | Constrained by vendor |
| Data control | Full ownership and residency | Vendor-hosted (check compliance) |
| Vendor lock-in risk | None | Moderate to high |
| Scaling complexity | You solve it | Vendor solves it |

**Recommendation for most startups (under 50 engineers):** Buy. Use Datadog, New Relic, or Grafana Cloud. Your engineers should build product, not monitoring infrastructure.

**Recommendation for scale-ups (50-200 engineers):** Hybrid. Use a SaaS platform for APM and traces. Run Prometheus for infrastructure metrics if cost is a concern. Use OpenTelemetry for instrumentation to maintain portability.

**Recommendation for large organizations (200+ engineers):** Evaluate total cost of ownership carefully. At scale, SaaS platform costs can exceed $500K/year. A dedicated observability team running open-source infrastructure may be more cost-effective — but only if you can attract and retain the SRE talent to operate it.

## Alert Fatigue and On-Call Health

### The Problem

Alert fatigue is the single biggest threat to a healthy on-call rotation. When engineers are paged for non-actionable alerts — alerts that resolve on their own, alerts for non-critical systems, alerts that are informational rather than urgent — they learn to ignore pages. And when they ignore pages, they miss the real ones.

### Symptoms of Alert Fatigue

| Symptom | How to Detect |
|---|---|
| High alert volume | >5 pages per on-call shift |
| Low signal-to-noise ratio | >30% of alerts require no human action |
| Alert acknowledgement delay increasing | Time from page to acknowledgement growing over time |
| On-call avoidance | Engineers trading shifts, volunteering for on-call less, or citing on-call as a reason for leaving |
| "Just snooze it" culture | Alerts being snoozed or silenced without investigation |

### Fixing It

**Audit every alert quarterly.** For each alert that fired, ask: "Did a human need to take action?" If the answer is no more than 70% of the time, delete or reclassify the alert. An alert that fires 10 times a month and requires action once is not an alert — it is noise.

**Classify alerts into tiers:**

| Tier | Response | Channel | Example |
|---|---|---|---|
| Page (wake someone up) | Immediate human action required | PagerDuty/OpsGenie | SEV1 — service down |
| Urgent notification | Action required within 1 hour, during business hours | Slack channel | Error budget burn rate above threshold |
| Warning | Investigate within 1 business day | Dashboard/Slack | Disk usage approaching 80% |
| Informational | No action, context for future debugging | Log or low-priority channel | Deployment completed, configuration changed |

**Only the first tier should page.** Everything else goes to asynchronous channels.

**Track on-call health metrics:**

| Metric | Target |
|---|---|
| Pages per on-call shift | <5 (ideally <2) |
| Pages outside business hours | <1 per week |
| Mean time to acknowledge | <5 minutes |
| Percentage of actionable alerts | >80% |
| On-call handoff quality | Documented context for every active issue |

### On-Call Compensation and Rotation

On-call should be compensated, rotated fairly, and bounded: 1-week maximum rotations, primary and secondary for critical services, follow-the-sun for global teams, compensated with time off or pay, and burden tracked per-engineer.

## Dashboarding Best Practices

Organize dashboards into three levels: **Executive** (SLO compliance, incident count, error budget — no jargon), **Service** (four golden signals, SLO burn rate, deployment markers — owned by the service team), and **Debug** (deep technical detail, created ad-hoc during incidents).

**Anti-patterns to avoid:** The wall of 40 graphs nobody reads (each dashboard should answer one specific question). Vanity dashboards that never trigger action. Orphan dashboards without team owners. Raw metrics without baselines or trend context.

### Cost of Monitoring at Scale

Monitoring costs tend to grow superlinearly with infrastructure complexity. Common cost drivers:

| Cost Driver | Why It Grows | How to Control It |
|---|---|---|
| Log volume | Every new service and feature adds logs | Set retention tiers: hot (7 days, full search), warm (30 days, sampled), cold (1 year, archived) |
| Metric cardinality | Every new label combination creates a new time series | Enforce label cardinality limits, drop unused metrics, aggregate where possible |
| Trace volume | Every request generates a trace | Sample traces — 1-10% is sufficient for most services, 100% sampling for error traces only |
| Custom metrics | Teams add metrics without removing old ones | Audit metric usage quarterly, delete metrics nobody queries |
| User seats (SaaS) | More engineers need dashboard access | Use SSO with read-only access for most engineers, paid seats for operators |

**Budget rule of thumb:** Monitoring infrastructure should cost 5-10% of your total infrastructure spend. If it exceeds 15%, you are either over-instrumenting, under-sampling, or paying for features you do not use.

**Cost optimization:** Sample high-volume logs, aggregate per-pod metrics into per-service for long-term storage, set trace sampling inversely to volume (100% errors, 10% slow, 1% success), negotiate annual vendor contracts (20-30% discounts), and use OTel Collector's processor pipeline to filter before ingestion.

## Real-World Examples

**Uber** built M3 when no existing solution handled their scale (billions of metrics/second). Most companies will never need custom infrastructure, but their documented journey shows where open-source tools break down.

**Shopify** uses Datadog for APM, Prometheus for infrastructure metrics, and custom tooling for business metrics. They enforce "metric budgets" where each team has a ceiling on custom metric count.

**LinkedIn** reduced monitoring costs 40% through aggressive sampling, cardinality controls, and tiered log retention. Key insight: 80% of monitoring value comes from 20% of data collected.

## Decision Framework

**Choose Prometheus + Grafana when:**
You have SRE capacity, want full control, and are cost-sensitive at scale. Best for teams already familiar with the ecosystem.

**Choose Datadog when:**
You want the broadest feature set with the least operational overhead. Best for teams that want to focus on product, not monitoring infrastructure.

**Choose Grafana Cloud when:**
You want open-source compatibility with managed infrastructure. Best for teams that use Prometheus today and want to reduce operational burden without vendor lock-in.

**Choose OpenTelemetry as your instrumentation layer regardless of backend choice.** The portability it provides is worth the marginal complexity of running the OTel Collector.

**Choose a hybrid approach when:**
Your scale makes single-vendor pricing prohibitive, or different teams have different needs. Use a SaaS platform for APM (where the value-add of vendor ML and UX is highest) and open-source for infrastructure metrics (where Prometheus is proven and cost-effective).

## Common Mistakes

**Instrumenting everything from day one.** Start with the four golden signals for your most critical services. Add depth where incidents reveal gaps. Over-instrumentation is expensive and creates noise.

**Setting up monitoring but not alerting.** A dashboard nobody watches is not monitoring. Every SLO needs an alert. Every alert needs a runbook. Every runbook needs an owner.

**Alerting on symptoms instead of causes.** Alerting on "CPU > 80%" is alerting on a symptom. Alert on the customer impact: "error rate > 1%" or "p99 latency > 2 seconds." CPU might spike to 90% during a legitimate traffic surge and that is fine.

**Not testing your alerts.** If you have never seen an alert fire, you do not know if it works. Regularly verify that alerts fire correctly, reach the right people, and contain enough context to diagnose the issue.

**Ignoring monitoring cost until the invoice arrives.** Track monitoring spend monthly. Set up cost alerts with your SaaS vendor. Audit metric cardinality and log volume quarterly.

**Building a custom platform prematurely.** Unless you are operating at the scale of Uber or Netflix, you do not need a custom metrics platform. The engineering cost of building and maintaining one exceeds SaaS platform fees for most organizations.

## Key Metrics to Track (Meta-Metrics)

| Meta-Metric | Why It Matters | Target |
|---|---|---|
| Alert-to-incident ratio | How often alerts correspond to real problems | >60% of pages result in meaningful action |
| Mean time to detect (MTTD) | How quickly your monitoring catches issues | <5 minutes for SEV1-capable failures |
| Dashboard load time | Slow dashboards do not get used | <3 seconds for any dashboard |
| Monitoring cost as % of infrastructure | Whether monitoring spend is proportional | 5-10% |
| Instrumentation coverage | Percentage of services with full golden signals monitoring | 100% for customer-facing services |
| Stale dashboard count | Dashboards not viewed in 90 days | Audited and archived quarterly |

## References

1. Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (2016). *Site Reliability Engineering*. O'Reilly Media. (Chapter 6: Monitoring Distributed Systems)
2. Majors, C., Fong-Jones, L., & Miranda, G. (2022). *Observability Engineering*. O'Reilly Media.
3. Sridharan, C. (2018). *Distributed Systems Observability*. O'Reilly Media.
4. OpenTelemetry Documentation. (2024). https://opentelemetry.io/docs/
5. Prometheus Documentation. (2024). https://prometheus.io/docs/
6. Wilkie, G. (2023). "Taming Observability Costs." *InfoQ*. https://www.infoq.com
7. Shopify Engineering. (2023). "Monitoring at Scale." https://shopify.engineering
8. Uber Engineering. (2018). "M3: Uber's Open Source, Large-Scale Metrics Platform." https://eng.uber.com
