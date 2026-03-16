# Product-Engineering Metrics That Connect Code to Customers

Most engineering metrics measure internal processes — how fast you deploy, how clean your code is, how reliable your pipeline runs. Product-engineering metrics close the gap between what engineers build and what customers experience. They answer the question every CEO eventually asks: "We shipped 40 features last quarter. Did any of them matter?" This guide covers the metrics that connect engineering output to customer outcomes, including feature adoption, SRE error budgets, SLA/SLO/SLI frameworks, incident classification, and uptime calculations.

## When to Use / When NOT to Use

| Use These Metrics When | Do NOT Use These Metrics When |
|---|---|
| You want to measure whether shipped features create customer value | Your product is pre-launch with no users yet — focus on shipping speed first |
| Setting reliability targets for customer-facing services | As a way to avoid investing in reliability — "our SLO allows 0.1% errors" is not permission to ignore quality |
| Aligning engineering and product teams on shared outcomes | Your incident process is immature — classify incidents consistently before measuring them |
| Justifying infrastructure or reliability investments to leadership | You want to measure developer productivity — use DORA and SPACE for that |
| Building an SRE practice or formalizing on-call expectations | Your team conflates availability with customer satisfaction — uptime alone does not mean customers are happy |

## The Metrics

### 1. Feature Adoption Rate

**What it measures:** The percentage of your user base that actually uses a newly shipped feature.

**Formulas:**

```
Adoption Rate = (Users who used feature at least once in 30 days / Total active users) x 100

Depth of Adoption = (Users who used feature 3+ times in 30 days / Users who tried it once) x 100

Time to First Use = Median days from feature release to a user's first interaction
```

**Why it matters:** Shipping a feature that nobody uses is worse than not shipping it — you incurred the development cost, increased codebase complexity, and added maintenance burden with zero return. Adoption rate forces engineering and product teams to share accountability for outcomes, not just output.

**Benchmarks:**

| Adoption Level | Rate | Interpretation |
|---|---|---|
| Strong | >30% of target users within 30 days | Feature meets a real need and is discoverable |
| Moderate | 10-30% within 30 days | Feature may need better onboarding or positioning |
| Weak | <10% within 30 days | Feature may not solve a real problem, or users cannot find it |

**How to instrument it:** Use product analytics (Amplitude, Mixpanel, PostHog) to track feature-specific events. Define a clear "usage" event for each feature before you ship it. If you cannot define what "using" a feature means, you probably do not understand the feature well enough to build it.

### 2. Time to Value (TTV)

**What it measures:** How quickly a new user or customer reaches the moment where they first experience the core value of your product.

**Formula:**

```
TTV = Timestamp(value moment) - Timestamp(signup or purchase)
```

**Why it matters:** Every minute between signup and value delivery is a minute the customer might churn. Products with shorter TTV have higher activation rates, higher retention, and lower customer acquisition cost (because trial-to-paid conversion improves). For engineering, TTV highlights where technical friction (slow onboarding, complex configuration, poor defaults) undermines product value.

**Defining the "value moment":** This is product-specific and must be defined collaboratively between product and engineering. Examples: Slack — sending the first message in a channel. Datadog — seeing the first dashboard with live data. Stripe — processing the first payment. The value moment should be something the customer cares about, not something your internal funnel defines.

**Engineering levers to improve TTV:** Reduce setup steps with progressive profiling, provide production-ready defaults, pre-populate demo data, optimize API response times for onboarding flows (give these their own SLO), and build guided experiences that shortcut the learning curve.

### 3. Error Budgets (SRE Model)

**What it measures:** The maximum amount of unreliability your service can tolerate before you must stop shipping features and focus on reliability.

**Formula:**

```
Error Budget = 1 - SLO target

Example: If your SLO is 99.9% availability
Error Budget = 1 - 0.999 = 0.1% = 43.2 minutes of downtime per month
```

```
Error Budget Remaining = Error Budget - Actual errors consumed
```

**Why it matters:** Error budgets solve the eternal conflict between "ship faster" and "be more reliable." They create an objective, data-driven threshold: when the error budget is healthy, you ship aggressively. When it is nearly exhausted, you freeze features and invest in reliability. Neither side has to argue — the math decides.

**How to operate with error budgets:**

| Budget Remaining | Action |
|---|---|
| >50% | Ship freely, take calculated risks with new features |
| 25-50% | Ship cautiously, increase canary durations, tighten review |
| 10-25% | Feature freeze for non-critical work, focus on reliability improvements |
| <10% | Full freeze, all engineering effort on reliability until budget recovers |

**Error budget policies should be agreed upon by engineering, product, and leadership before they are needed.** Writing the policy during an incident is like writing insurance policy terms during a flood.

### 4. SLA, SLO, and SLI Explained

These three terms are frequently confused. They form a hierarchy from measurement to target to contract.

**SLI (Service Level Indicator):** The metric you measure. A quantitative description of one aspect of service quality.

Examples:
- Request latency: p99 response time for the `/api/v1/orders` endpoint
- Availability: percentage of successful HTTP responses (status 2xx or 3xx / total requests)
- Throughput: requests per second processed without error
- Correctness: percentage of responses that return the expected result

**SLO (Service Level Objective):** The target you set internally for an SLI. SLOs are engineering team goals, not customer promises.

Examples:
- p99 latency for order API: <500ms over a 30-day rolling window
- Availability of checkout service: 99.95% over a 30-day rolling window
- Data processing pipeline freshness: data available within 5 minutes of ingestion, 99.9% of the time

**SLA (Service Level Agreement):** The contractual commitment you make to customers, with consequences (usually financial credits) if you miss it. SLAs should always be looser than SLOs — if your SLO is 99.95%, your SLA should be 99.9% or 99.5%. The gap gives you a buffer before contractual penalties kick in.

**Setting good SLOs:**

1. Start by measuring the current state (your SLIs) for 30-60 days before setting targets.
2. Set SLOs based on what users actually need, not what engineers want. A batch processing system does not need 99.99% availability. A payment processing system might.
3. Express SLOs over rolling windows (30 days), not calendar months. Calendar month resets create a perverse incentive to be reckless in the first week of the month when the budget is fresh.
4. Review and adjust SLOs quarterly. An SLO you never miss is too loose. An SLO you always miss is either too tight or your system has real problems.

### 5. Customer-Facing Quality Metrics

**Escaped Defects:**

```
Escaped Defect Rate = Customer-reported bugs / Total bugs found (testing + production)
```

Target: <10%. If more than 10% of your bugs are found by customers, your testing process has significant gaps.

**Customer-Reported Bug Resolution Time:**

```
Resolution Time = Timestamp(fix deployed to production) - Timestamp(customer reported bug)
```

Segment by severity. SEV1 bugs should be resolved in hours, not days. SEV3/4 bugs may wait for the next sprint.

**Error Rate by Customer Segment:**

Not all errors affect all customers equally. Track error rates segmented by customer tier (enterprise vs SMB), geography (latency-sensitive regions), and plan type (free vs paid). An error rate that is acceptable in aggregate might be unacceptable for your top 10 revenue-generating accounts.

### 6. Incident Severity Classification (SEV1-SEV4)

A consistent severity classification system is essential for meaningful incident metrics. Without one, every on-call engineer invents their own definition of "severe," and your incident data becomes useless for trend analysis.

**Standard classification:**

| Severity | Definition | Response Time | Resolution Target | Examples |
|---|---|---|---|---|
| SEV1 — Critical | Complete service outage or data loss affecting all users | Immediate (within 5 minutes) | 1 hour | Payment processing down, database corruption, security breach |
| SEV2 — Major | Significant degradation affecting many users or a critical feature | Within 15 minutes | 4 hours | Checkout latency >10x normal, search returning incorrect results, auth failures for 30% of users |
| SEV3 — Moderate | Partial degradation affecting some users or a non-critical feature | Within 1 hour | 24 hours | Dashboard loading slowly, email notifications delayed, minor UI rendering issue on specific browser |
| SEV4 — Minor | Cosmetic or low-impact issue with a known workaround | Next business day | Next sprint | Typo in error message, alignment issue in admin panel, non-critical log noise |

**Rules:** Severity is based on customer impact, not technical root cause. When in doubt, escalate — it is better to declare SEV1 and downgrade than to miss a real incident. The on-call engineer sets initial severity; only the incident commander can downgrade.

### 7. Uptime and the Nines of Availability

**The math:**

| Availability | Annual Downtime | Monthly Downtime | Daily Downtime |
|---|---|---|---|
| 99% (two nines) | 3.65 days | 7.3 hours | 14.4 minutes |
| 99.9% (three nines) | 8.76 hours | 43.8 minutes | 1.44 minutes |
| 99.95% | 4.38 hours | 21.9 minutes | 43.2 seconds |
| 99.99% (four nines) | 52.6 minutes | 4.38 minutes | 8.6 seconds |
| 99.999% (five nines) | 5.26 minutes | 26.3 seconds | 0.86 seconds |

**The cost of each nine:** Each additional nine roughly doubles or triples engineering investment. Moving from 99.9% to 99.99% requires redundant infrastructure, automated failover, and zero-downtime deployments. Five nines requires geographic redundancy.

**Availability = (Total time - Downtime) / Total time x 100.** Define downtime precisely in your SLO: error rate exceeding X%, p99 latency exceeding Y milliseconds, or critical user journey success rate below Z%. Modern SaaS should achieve zero-downtime deployments; if you still need maintenance windows, count them in your internal SLO but exclude them from your contractual SLA.

## Real-World Examples

**Google SRE** pioneered error budgets. Key insight: treating reliability as a feature with quantifiable cost lets teams make rational trade-offs. Internal SLOs are tighter than public SLAs, providing buffer before contractual commitments are at risk.

**Netflix** tracks "Starts Per Second" (SPS) as their top-level SLI — capturing both technical reliability and product quality. When SPS drops, it triggers an incident regardless of infrastructure metrics.

**Honeycomb** publishes their SLO dashboard publicly, demonstrating confidence and documenting the organizational challenges of enforcing error budget policies (particularly feature freezes).

**Slack** tracks "Customer Minutes Interrupted" (CMI) as their primary severity metric, capturing both breadth (how many customers) and depth (how long) in a single number.

## Decision Framework

**Choose Feature Adoption as your primary focus when:**
Product and engineering are shipping features that users are not adopting. This usually reveals a discovery problem (users cannot find the feature), a usability problem (the feature is too complex), or a need problem (nobody wanted this).

**Choose Time to Value when:**
Your trial-to-paid conversion is low or new customer onboarding is slow. TTV analysis reveals where technical friction undermines the product experience.

**Choose Error Budgets when:**
Engineering and product teams argue about reliability vs speed, and you need an objective framework to resolve the tension. Error budgets depoliticize the conversation.

**Choose SLOs/SLIs when:**
You are formalizing reliability standards for the first time. Start with your most critical customer-facing service, define 2-3 SLIs, set conservative SLOs, and expand from there.

**Choose Incident Classification when:**
Your incident response is inconsistent — sometimes a major outage gets a casual response, sometimes a minor blip triggers a war room. Consistent classification creates consistent response.

**Choose Uptime Targets when:**
Contractual requirements or customer expectations demand specific availability commitments. Calculate the cost of each nine before committing.

## Common Mistakes

**Setting SLOs without measuring SLIs first.** You cannot set a meaningful target for something you do not measure. Instrument your SLIs, observe them for 30-60 days, then set SLOs based on actual performance and customer needs.

**Making SLAs tighter than SLOs.** Your SLA is a contractual promise with financial consequences. Your SLO is an internal target. If your SLA is 99.9% and your SLO is also 99.9%, you have zero buffer. Always set SLOs tighter than SLAs.

**Tracking uptime but not user-impacting availability.** A service can be "up" (responding to health checks) while delivering a terrible user experience (all requests timing out at 30 seconds). Define availability in terms of customer experience, not server status.

**Ignoring feature adoption data.** Many engineering teams are proud of shipping speed but allergic to measuring whether anyone uses what they shipped. Adoption data can be humbling, but ignoring it means you keep investing in features that do not matter.

**Setting one SLO for all services.** Your payment processing service and your internal admin dashboard do not need the same reliability target. Cost-inappropriate SLOs waste engineering effort on low-impact services and under-protect critical ones.

**Classifying incidents by root cause instead of customer impact.** A "simple config change" that takes down production is SEV1, not SEV4. Severity must always be based on what customers experienced, not how trivial the fix was.

**Not tracking error budget burn rate.** Knowing you have consumed 60% of your error budget is less useful than knowing you consumed 60% in the first week of the month. Burn rate tells you whether you are on a sustainable trajectory or heading for a feature freeze.

## Key Metrics to Track (Meta-Metrics)

| Meta-Metric | Why It Matters | Target |
|---|---|---|
| SLO coverage | Percentage of customer-facing services with defined SLOs | 100% of critical services |
| SLO accuracy | How often SLOs correctly predict customer complaints | SLO breaches should correlate >80% with customer-reported issues |
| Incident classification accuracy | Whether incidents are consistently classified across teams | <10% reclassification rate during post-incident review |
| Feature instrumentation coverage | Percentage of shipped features with adoption tracking | 100% of features launched in the last quarter |
| Error budget policy adherence | Whether teams actually freeze features when the budget is exhausted | 100% compliance — policy without enforcement is decoration |
| Post-incident review completion | Percentage of SEV1/SEV2 incidents with completed reviews | 100% within 5 business days |

## References

1. Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (2016). *Site Reliability Engineering: How Google Runs Production Systems*. O'Reilly Media.
2. Beyer, B., Murphy, N. R., Rensin, D., Kawahara, K., & Thorne, S. (2018). *The Site Reliability Workbook*. O'Reilly Media.
3. Hidalgo, A. (2020). *Implementing Service Level Objectives*. O'Reilly Media.
4. Netflix Technology Blog. (2015). "SPS: The Metric That Matters Most." https://netflixtechblog.com
5. Honeycomb. (2023). "Our SLOs Are Public." https://www.honeycomb.io/slo
6. Slack Engineering. (2022). "Incident Response at Slack." https://slack.engineering
7. Amazon. (2023). "Building Dashboards for Operational Visibility." AWS re:Invent presentations.
8. Majors, C., Fong-Jones, L., & Miranda, G. (2022). *Observability Engineering*. O'Reilly Media.
