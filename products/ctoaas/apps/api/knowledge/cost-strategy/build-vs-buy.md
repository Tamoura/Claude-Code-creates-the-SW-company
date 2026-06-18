# Build vs Buy: A Decision Framework for CTOs

The build-vs-buy decision is one of the most frequently recurring and consequential choices a CTO makes. Build too much and you waste engineering cycles on undifferentiated work. Buy too much and you accumulate vendor dependencies, integration complexity, and costs that compound annually. This guide provides a structured framework for evaluating build vs buy across real dimensions: total cost of ownership, strategic differentiation, integration complexity, vendor risk, and team capability. The goal is to help CTOs make defensible decisions that optimize for long-term outcomes rather than short-term convenience.

## When to Use / When NOT to Use

| Scenario | Build | Buy |
|----------|-------|-----|
| The capability is your core differentiator | Almost always build | Only buy if you can customize deeply and maintain competitive advantage |
| Commodity functionality (auth, payments, email) | Rarely justified | Almost always buy -- mature vendors have solved these problems better than you will |
| Tight timeline with immediate revenue impact | Buy and plan to migrate later if needed | Risk: "temporary" vendor choices become permanent |
| Unique domain requirements that no vendor serves | Build is the only option | Evaluate whether the "uniqueness" is real or perceived |
| Small team (< 10 engineers) | Buy most things, build only core product | Every engineer building infrastructure is not building product |
| Compliance requirements (SOC2, HIPAA, PCI) | Buy tools that include compliance evidence | Building compliant infrastructure from scratch is extraordinarily expensive |
| High-volume, cost-sensitive operations | Build when vendor costs scale linearly with volume but your costs do not | Buy when vendor costs scale favorably with your growth |

## Total Cost of Ownership (TCO) Comparison

### Build Costs (Often Underestimated)

| Cost Category | Description | Typical Range |
|--------------|-------------|---------------|
| Initial development | Engineering time to build V1 | 2-6 months of 2-4 engineers |
| Testing and hardening | Edge cases, security, performance | 30-50% of initial development time |
| Documentation | Internal docs, runbooks, onboarding guides | 10-20% of development time |
| Ongoing maintenance | Bug fixes, dependency updates, security patches | 15-25% of initial build cost per year |
| On-call and incident response | Someone must be paged when it breaks at 3am | Distributed across engineering team |
| Feature requests | Internal users demand improvements | Continuous, competes with product work |
| Opportunity cost | What your team is NOT building while building this | The largest and most invisible cost |

**The 80/20 rule of building:** Getting to 80% feature parity with a commercial solution takes 20% of the effort. The remaining 20% (edge cases, scale, multi-tenant isolation, compliance features) takes 80% of the effort. Most build-vs-buy analyses underestimate the effort in the second 80%.

### Buy Costs (Often Underestimated)

| Cost Category | Description | Typical Range |
|--------------|-------------|---------------|
| License/subscription fees | Recurring vendor cost | Varies widely; often scales with usage or seats |
| Integration development | Building and maintaining the integration layer | 2-8 weeks initially; ongoing maintenance |
| Data migration | Moving existing data into/out of the vendor system | Can be weeks of effort for complex data models |
| Training | Team learns the vendor's platform, APIs, and quirks | 1-2 weeks per team member |
| Customization limitations | Working around what the vendor does not support | Ongoing frustration and workaround code |
| Vendor lock-in cost | The cost to migrate away if needed | Increases over time; can be enormous |
| Price increases | Vendors raise prices after you are dependent | Plan for 10-20% annual increases |
| Compliance and security review | Vetting the vendor for your compliance requirements | 1-4 weeks of security team time |

## Vendor Lock-In Risk Assessment

Vendor lock-in is the cost of switching away from a vendor after you have built dependencies on their platform.

### Lock-In Dimensions

| Dimension | Low Lock-In | High Lock-In |
|-----------|-------------|--------------|
| Data portability | Vendor provides full data export in standard formats | Data is stored in proprietary format with no export API |
| API standards | Vendor uses standard protocols (REST, GraphQL, S3-compatible) | Proprietary API with no industry standard equivalent |
| Integration depth | Thin integration layer; vendor is easily replaceable | Deep integration throughout your codebase |
| Contract terms | Month-to-month, no minimum commitment | Multi-year contract with early termination penalties |
| Alternative vendors | Multiple competitors offer equivalent functionality | Single vendor with no real alternatives |
| Switching cost (estimated) | 1-2 weeks to migrate | 3-6 months to migrate |

### Mitigation Strategies

1. **Abstraction layers.** Wrap vendor APIs behind your own interfaces. If you switch vendors, you change the implementation behind the interface without touching application code. Cost: additional development time upfront. Benefit: reduced switching cost later.

2. **Data ownership.** Ensure your contract gives you full ownership of your data with export capability. Test the export regularly. If you cannot export your data in a usable format, you do not own it.

3. **Multi-vendor strategy.** For critical capabilities, evaluate whether you can use two vendors simultaneously (e.g., multi-cloud storage). This is expensive and complex but eliminates single-vendor dependency.

4. **Exit plan.** Before signing, document what a vendor migration would look like. Identify data, integrations, and features that would need to be replaced. If the exit plan is "rewrite everything," that is a high lock-in risk.

## Integration Cost Analysis

Integration cost is frequently the most underestimated factor in buy decisions.

### Integration Complexity Levels

| Level | Description | Example | Typical Effort |
|-------|-------------|---------|----------------|
| Drop-in | No integration needed; standalone tool | Monitoring (Datadog), CI/CD (GitHub Actions) | Hours |
| API integration | Call vendor API from your code | Payment processing (Stripe), email (SendGrid) | 1-2 weeks |
| Data sync | Bi-directional data flow between your system and vendor | CRM (Salesforce), analytics (Segment) | 2-6 weeks |
| Workflow integration | Vendor is embedded in your business process | Auth provider (Auth0), feature flags (LaunchDarkly) | 2-4 weeks + ongoing |
| Platform dependency | Your application runs on the vendor's platform | Database (managed service), infrastructure (AWS) | Architecture-level decision |

### Hidden Integration Costs

- **Webhook reliability:** Vendor webhooks fail silently. You need retry logic, dead letter queues, and idempotency handling.
- **Rate limiting:** Vendor API rate limits affect your application's performance under load. You may need request queuing or caching.
- **Schema evolution:** Vendor API changes break your integration. You need versioning awareness and regression tests.
- **Authentication complexity:** OAuth flows, API key rotation, and token refresh add boilerplate code and failure modes.
- **Error handling:** Vendor error responses may not map cleanly to your error handling strategy. You need translation layers.

## Real-World Examples

### Shopify: Build Everything That Matters

Shopify is famous for building most of their infrastructure in-house, including their own edge delivery network, payment processing system, and data infrastructure. Their CTO, Jean-Michel Lemieux, articulated the philosophy: "We build what gives us a competitive advantage." Shopify's checkout flow, storefront rendering, and payment processing are core differentiators -- buying these from vendors would commoditize their product. However, they use third-party services for non-differentiating functions: Datadog for monitoring, PagerDuty for incident management, and GitHub for source control.

### Figma: Buy Auth, Build Collaboration

Figma built their real-time collaboration engine (the core of their product) from scratch because no existing solution could handle their requirements for sub-millisecond synchronization of complex design documents. However, they use Auth0 for authentication, Stripe for billing, and AWS for infrastructure. The decision framework is clear: if it directly creates the user experience that makes Figma unique, build it. If it is plumbing that every SaaS needs, buy it.

### Segment: Buy, Then Build, Then Sell

Segment initially used third-party analytics tools but found that integrating with dozens of different analytics vendors created maintenance overhead. They built an internal data routing layer to solve their own integration problem. That internal tool became their product -- a customer data platform. The lesson: sometimes building a capability reveals a market opportunity. But this is the exception, not the rule.

### Basecamp (37signals): Extreme Build

Basecamp built Hey.com (email service) on their own email infrastructure rather than using existing email delivery services. They also repatriated from the cloud to their own hardware. This approach works for Basecamp because (1) they have a deeply experienced ops team, (2) their products are mature with stable requirements, and (3) they prioritize long-term cost over short-term speed. For most companies, this approach is inadvisable.

## Decision Framework

### Build When...

- **The capability is your competitive moat.** If customers choose you because of this capability, you need to control it. Outsourcing your core differentiator to a vendor means your competitors can buy the same vendor.
- **No vendor fits your requirements.** You have genuinely unique requirements that no vendor serves. Verify this is true by evaluating at least 3 vendors before concluding.
- **Vendor costs will exceed build costs at your projected scale.** Some vendors charge per-event, per-user, or per-API-call. Model the cost at 10x your current scale. If vendor costs grow linearly but your build costs are fixed, building may be cheaper.
- **You have the team to maintain it.** Building requires not just initial development but ongoing maintenance, on-call, and evolution. If your team cannot sustain this, do not build.

### Buy When...

- **The capability is commodity infrastructure.** Authentication, payment processing, email delivery, monitoring, CI/CD, error tracking -- these are solved problems. Your implementation will be worse than a vendor who focuses on this full-time.
- **Speed to market matters more than long-term cost.** A SaaS tool that you can integrate in a week beats a custom solution that takes 3 months to build, even if the custom solution is cheaper over 5 years. You do not have 5 years if you do not ship.
- **The vendor's expertise exceeds yours.** Stripe employs hundreds of engineers working on payment compliance, fraud detection, and processor integrations. Unless payments are your core business, you cannot compete with this level of expertise.
- **Your team is small.** Every engineer building infrastructure is not building product. For teams under 20 engineers, buy almost everything except your core product.
- **Compliance is required.** Building SOC 2 compliant logging, HIPAA compliant data storage, or PCI compliant payment processing from scratch costs $100K+ in engineering time and audit fees. Buying from a compliant vendor transfers much of this burden.

### Hybrid: Buy Now, Build Later

A pragmatic strategy for growing companies: buy a vendor solution to ship quickly, then build a replacement when the vendor becomes a bottleneck. This works when:
- You wrap the vendor API behind an abstraction layer from day one
- You monitor vendor costs and usage to know when the economics shift
- You accept that migration will cost 2-3x what a greenfield build would cost (due to data migration and feature parity requirements)

## Common Mistakes

**1. Building because "it's not that hard."** Engineers systematically underestimate the effort to build production-quality software. A prototype in a weekend is not the same as a production system with monitoring, error handling, documentation, security, and on-call support. Multiply initial estimates by 3-5x.

**2. Buying without evaluating integration cost.** A vendor that costs $500/month but requires 3 months of integration work has a first-year TCO of $6,000 + $150,000 in engineering time. The "buy" option is not always cheaper.

**3. Not modeling vendor cost at scale.** A vendor that costs $100/month at 1,000 users may cost $10,000/month at 100,000 users. Model the vendor's pricing at your 2-year projected scale. Ask for volume discounts and committed-use pricing.

**4. Sunk cost fallacy on build decisions.** "We already built it, so we should keep using it." If a vendor solution would save engineering time going forward, the time already spent building is irrelevant. Evaluate ongoing cost, not sunk cost.

**5. Underestimating vendor switching cost.** "We can always switch vendors later." Data migration, API changes, feature gaps, and team retraining make vendor switches expensive. Choose vendors with the assumption that switching will cost 3x what you estimate.

**6. Building for control that you do not need.** "We need to own this for security/compliance/customization reasons." Verify this claim. Most compliance frameworks accept vendor SOC 2 reports. Most customization needs can be met with vendor configuration. Ownership has costs as well as benefits.

**7. Not revisiting buy decisions.** The vendor landscape changes. A vendor you evaluated 2 years ago may now offer features that eliminate the need for your custom solution. Revisit major build-vs-buy decisions annually.

## Key Metrics to Track

| Metric | Why It Matters | How to Measure |
|--------|---------------|----------------|
| TCO per capability (build) | True cost of internal solutions | Engineering hours + infrastructure + on-call + opportunity cost |
| TCO per capability (buy) | True cost of vendor solutions | License fees + integration maintenance + training + switching cost estimate |
| Engineering time on non-core work | How much of your team is building plumbing vs. product | Track ticket labels: "infrastructure" vs. "product" |
| Vendor dependency count | Number of critical path vendors | Count vendors where an outage blocks your product |
| Vendor cost as % of revenue | Sustainability of vendor spend | Should decrease as revenue grows faster than vendor costs |
| Time to integrate new vendor | Efficiency of your integration practices | Should improve as you build better abstraction patterns |
| Vendor incident impact hours | How often vendor outages affect your users | Track in incident log; review quarterly |

## References

- Martin Fowler, "Buy vs Build" -- martinfowler.com
- Shopify engineering blog: "Building Shopify's Infrastructure" series (2020-2023)
- Figma engineering blog: Architecture decisions and vendor usage
- Basecamp (37signals): "Why We're Leaving the Cloud" (DHH, 2022)
- Segment engineering blog: "Why We Built Segment" (2016) -- how an internal tool became a product
- Thoughtworks Technology Radar -- tracks build-vs-buy recommendations for common capabilities
- Gergely Orosz, "The Pragmatic Engineer" newsletter -- regular coverage of build-vs-buy at scale
- Joel Spolsky, "In Defense of Not-Invented-Here Syndrome" (2001) -- when building your core is essential
