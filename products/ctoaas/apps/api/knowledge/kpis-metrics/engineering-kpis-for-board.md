# Engineering KPIs That Boards and Executives Actually Care About

Boards and executives do not care about your sprint velocity, story points, or CI/CD pipeline improvements. They care about whether engineering is delivering business value predictably and efficiently. The CTO's job during a board meeting is to translate engineering performance into the language of business outcomes: revenue impact, cost efficiency, risk mitigation, and competitive advantage. This guide provides the specific metrics, templates, and framing that make engineering legible to non-technical leadership.

## When to Use / When NOT to Use

| Use These KPIs When | Do NOT Use These KPIs When |
|---|---|
| Preparing a quarterly board report or investor update | Running an engineering retrospective — use DORA and SPACE internally |
| Justifying engineering headcount or infrastructure budget | Evaluating individual developer performance — these are org-level metrics |
| A new CEO or CFO asks "what does engineering actually do?" | Your company has fewer than 10 engineers — the overhead of tracking is not worth it yet |
| The board is questioning engineering ROI after missed deadlines | You want to diagnose the root cause of a problem — these metrics show symptoms, not causes |
| Fundraising and due diligence processes that scrutinize engineering | Engineering and product are deeply misaligned — fix the relationship first, metrics second |

## The Metrics

### 1. Delivery Predictability

**What the board hears:** "Can engineering deliver what it commits to, on time?"

**Formula:**

```
Predictability = (Features delivered on or before committed date / Total features committed) x 100
```

**Target:** 80%+ is strong. Below 60% signals systemic estimation or execution problems.

**How to present it:** Show a trailing 4-quarter trend line. The trend matters more than any single quarter's number. A team at 65% that has improved from 45% tells a better story than a team at 75% that has declined from 90%.

**What to measure:** Only count features that were committed at the start of the quarter with a specific delivery date. Do not include stretch goals, tech debt work, or items added mid-quarter. The denominator must be stable to avoid gaming.

**Executive framing:** "Last quarter we committed to delivering 12 features. We delivered 10 on time, 1 one week late, and 1 was deprioritized by product. Our predictability was 83%, up from 75% the prior quarter."

### 2. Engineering Investment Allocation

**What the board hears:** "Where is our engineering budget actually going?"

**Formula:** Categorize all engineering work into four buckets and report the percentage of total engineering capacity in each:

```
- New features / revenue-generating work: ____%
- Platform and infrastructure: ____%
- Technical debt and maintenance: ____%
- Unplanned work (incidents, urgent fixes): ____%
```

**Target allocation (growth-stage company):** 60-70% features, 15-20% platform, 10-15% tech debt, <5% unplanned. Mature companies may shift toward 50% features, 25% platform, 15% debt, 10% unplanned.

**Why boards care:** If engineering spends 40% of its time on unplanned work and tech debt, the board needs to know — and they need to understand that this is not engineering's failure but the result of years of underinvestment. This metric makes the invisible tax of technical debt visible.

**How to present it:** A simple stacked bar chart, one bar per quarter, showing the four categories. Annotate any significant shifts: "Platform investment increased to 25% this quarter due to the database migration project, which will reduce our infrastructure costs by $200K/year starting Q3."

### 3. Revenue per Engineer

**What the board hears:** "How efficient is our engineering organization?"

**Formula:**

```
Revenue per Engineer = Annual recurring revenue / Number of engineers (FTE)
```

**Benchmarks (SaaS):**

| Stage | Revenue per Engineer |
|---|---|
| Seed/Series A | $100K - $200K |
| Series B/C | $200K - $400K |
| Pre-IPO | $400K - $700K |
| Public (best-in-class) | $800K - $1.2M+ |

**Caution:** This metric trends upward naturally as revenue grows on a relatively fixed engineering base. It is useful for benchmarking against peers at similar stages but dangerous as a target — optimizing for revenue per engineer discourages necessary infrastructure investment and encourages understaffing.

**How to present it:** Show alongside total engineering headcount and ARR. "Our revenue per engineer increased from $280K to $340K year-over-year as ARR grew from $14M to $17M on a team that grew from 50 to 50 engineers."

### 4. Time to Market

**What the board hears:** "How quickly can we go from idea to customer value?"

**Formula:**

```
Time to Market = Date of GA release - Date feature was approved for development
```

**Target:** Depends heavily on feature scope, but tracking the median across all shipped features provides a useful trend. For SaaS companies, a median of 4-8 weeks for medium-complexity features is competitive.

**Why boards care:** Speed to market is competitive advantage. If your competitor ships features in 4 weeks and you take 16, you are structurally disadvantaged regardless of how good your engineers are.

**How to present it:** Show the distribution, not just the median. "Our median time to market is 6 weeks. 80% of features ship within 10 weeks. We had one outlier at 18 weeks due to a regulatory compliance dependency."

### 5. Quality and Reliability

**What the board hears:** "Is our product stable? Are customers experiencing problems?"

**Metrics to present:**

| Metric | Formula | Target |
|---|---|---|
| Uptime | (Total minutes - Downtime minutes) / Total minutes x 100 | 99.9%+ for SaaS |
| Customer-facing incidents (SEV1/SEV2) | Count per quarter | Trending down |
| Mean time to recovery | Median time from incident detection to resolution | Under 1 hour |
| Escaped defects | Customer-reported bugs per release | Trending down |

**Executive framing:** "We maintained 99.95% uptime this quarter. We had 2 SEV1 incidents, down from 4 last quarter. Our mean time to recovery improved from 45 minutes to 22 minutes. Zero customer data was affected."

**What NOT to do:** Do not show the board a dashboard with 47 metrics. Pick 3-4 quality metrics, show the trend, and explain any notable incidents in plain language.

### 6. Cost Efficiency

**What the board hears:** "Are we spending our cloud and infrastructure budget wisely?"

**Metrics to present:**

| Metric | Formula |
|---|---|
| Infrastructure cost per customer | Total infrastructure spend / Number of active customers |
| Infrastructure cost as % of revenue | Total infrastructure spend / Revenue x 100 |
| Cost per transaction | Total infrastructure spend / Number of transactions processed |

**Benchmarks:** Infrastructure should be 10-20% of revenue for early-stage SaaS, declining to 5-10% at scale. If infrastructure costs are growing faster than revenue, the board needs to understand why and what the plan is.

**How to present it:** "Our infrastructure cost per customer decreased from $12.40 to $9.80 this quarter due to the caching layer we deployed in Q1. Total infrastructure spend increased 8% but customer count increased 35%."

### 7. Engineering Talent Health

**What the board hears:** "Can we retain the team that builds our product?"

**Metrics to present:**

| Metric | Target |
|---|---|
| Voluntary attrition (trailing 12 months) | Under 15% for tech companies |
| Average tenure | Growing or stable |
| Open positions and time-to-fill | Under 45 days for standard roles |
| Offer acceptance rate | Above 75% |

**Why boards care:** Replacing a senior engineer costs 1.5-2x their annual salary when you factor in recruiting, onboarding, lost productivity, and knowledge loss. High attrition is a material business risk.

## Building a Quarterly Engineering Board Report

### Template Structure

**Page 1: Executive Summary (1 slide)**
- 3-4 headline metrics with quarter-over-quarter trend arrows
- One sentence on the biggest win
- One sentence on the biggest risk or challenge

**Page 2: Delivery Performance (1 slide)**
- Predictability score with trend
- Key features shipped this quarter (3-5 bullets, each tied to a business outcome)
- Key features planned for next quarter

**Page 3: Engineering Investment (1 slide)**
- Investment allocation chart (stacked bar, 4 quarters)
- Narrative explaining any shifts
- ROI on major platform investments ("The migration to Kubernetes saved $X/month in infrastructure costs")

**Page 4: Quality and Reliability (1 slide)**
- Uptime and incident trend
- Customer impact summary
- Top improvement actions taken

**Page 5: Team and Budget (1 slide)**
- Headcount plan vs actual
- Attrition and hiring metrics
- Engineering cost as % of revenue

**Optional Page 6: Strategic Risks (1 slide)**
- Technical debt that poses business risk
- Scaling challenges on the horizon
- Dependency risks (third-party services, key person risk)

### What NOT to Show the Board

- **Sprint velocity or story points.** These are internal planning tools with no business meaning.
- **Lines of code.** This metric is meaningless at best and misleading at worst.
- **Number of PRs merged.** Activity is not value.
- **Test coverage percentages.** Unless coverage dropped and caused an incident, this is internal.
- **CI/CD pipeline metrics.** DORA metrics matter internally; the board cares about the outcome (delivery speed, quality) not the mechanism.
- **Jira burndown charts.** No board member wants to see a burndown chart.
- **Architecture diagrams.** Unless you are explaining a specific strategic investment (like a platform migration), architecture details do not belong in a board presentation.
- **Anything without a trend line.** A single number without context is not useful. Always show at least 4 quarters of data.

## Real-World Examples

**Datadog** publishes engineering efficiency metrics in their investor presentations, including infrastructure cost per customer and revenue per employee. Their narrative consistently ties engineering investment to product-led growth, showing how platform reliability directly drives customer expansion revenue.

**GitLab** (as a public company with a transparent culture) has shared how they report engineering metrics to their board. They focus on cycle time (time to market), deployment frequency, and escaped defect rate. Their board presentations connect each metric to a customer outcome.

**Stripe** is known internally for tracking "developer hours per feature" as a proxy for engineering efficiency. Their CTO presentations reportedly focus on how platform investments (internal tools, API design) reduce the marginal cost of each new feature, making the engineering organization more efficient as it scales.

**HashiCorp** tracked engineering investment allocation through their IPO process. Their S-1 filing disclosed that approximately 60% of engineering effort went to new products and features, a data point that helped investors understand the growth trajectory.

## Decision Framework

**Choose Delivery Predictability as your headline metric when:**
The board is concerned about missed deadlines or unpredictable roadmaps. This is often the case after a missed product launch or a major feature slip.

**Choose Engineering Investment Allocation when:**
The board questions why engineering is "slow" despite a large team. This metric usually reveals that 30-40% of capacity goes to unplanned work and debt, explaining the perceived slowness.

**Choose Revenue per Engineer when:**
You are in a fundraising process or the board is benchmarking your efficiency against peers. Present it alongside context about your stage and investment posture.

**Choose Quality and Reliability when:**
You have had recent customer-facing incidents or churn related to product stability. Leading with reliability data shows accountability and a plan.

**Choose Cost Efficiency when:**
Infrastructure costs are a growing line item and the CFO or board is asking questions. Show unit economics (cost per customer, cost per transaction) to demonstrate disciplined spending.

## Common Mistakes

**Showing too many metrics.** The board has 30 minutes for your section. Five metrics with clear trends beats twenty metrics that nobody absorbs. If a metric does not change the board's understanding or trigger a decision, cut it.

**Presenting metrics without narrative.** Numbers without story are noise. Every metric needs a one-sentence explanation: what it means, whether it is good or bad, and what you are doing about it if it is bad.

**Being defensive about bad numbers.** Boards respect CTOs who say "Our reliability dropped this quarter. Here is why and here is our plan to fix it." They lose confidence in CTOs who spin bad numbers or bury them in footnotes.

**Not connecting engineering work to revenue.** Every feature you shipped should be tied to a business outcome: revenue, retention, expansion, cost reduction, or risk mitigation. If you cannot articulate the business value of a shipped feature, the board will question whether it should have been built.

**Comparing yourself to FAANG.** Your Series B startup is not Google. Use stage-appropriate benchmarks. A board member who just came from a Google board meeting does not expect the same metrics — they expect awareness of where you are and a plan for where you are going.

**Forgetting to celebrate wins.** Board meetings often focus on problems. Start with 2-3 concrete wins: a feature that drove measurable revenue, an infrastructure improvement that reduced costs, a reliability milestone. Engineers need their CTO to advocate for their work.

## Key Metrics to Track (Meta-Metrics)

| Meta-Metric | Why It Matters | Target |
|---|---|---|
| Board question frequency | If the board asks fewer engineering questions, your reporting is effective | Fewer clarifying questions quarter-over-quarter |
| Metric consistency | Using the same metrics every quarter builds trend data | Same core 5 metrics for 4+ consecutive quarters |
| Data accuracy | Board-level metrics must be unimpeachable | Automated data collection, cross-verified quarterly |
| Action item follow-through | Board-identified concerns must be addressed in the next report | 100% of board action items addressed in next quarter's report |
| Preparation time | How long it takes to assemble the board report | Under 4 hours (implies good automation) |

## References

1. Skok, D. (2022). "SaaS Metrics 2.0." *For Entrepreneurs*. https://www.forentrepreneurs.com/saas-metrics-2/
2. Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate: The Science of Lean Software and DevOps*. IT Revolution Press.
3. Lenny's Newsletter. (2023). "What Should a CTO Present to the Board?" https://www.lennysnewsletter.com
4. Reilly, T. (2022). *The Staff Engineer's Path*. O'Reilly Media.
5. Larson, W. (2019). *An Elegant Puzzle: Systems of Engineering Management*. Stripe Press.
6. Skelton, M., & Pais, M. (2019). *Team Topologies*. IT Revolution Press.
7. OpenView Partners. (2023). "SaaS Benchmarks Report." https://openviewpartners.com/blog/saas-benchmarks/
8. KeyBanc Capital Markets. (2023). "Annual SaaS Survey." (private benchmarking data referenced in public presentations)
