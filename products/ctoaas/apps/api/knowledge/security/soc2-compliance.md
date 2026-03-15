# SOC 2 Compliance: A CTO's Practical Guide

SOC 2 (System and Organization Controls 2) is an auditing framework developed by the American Institute of Certified Public Accountants (AICPA) that evaluates how a service organization manages data based on five Trust Service Criteria. For B2B SaaS companies, SOC 2 compliance is often the price of admission for enterprise sales -- procurement teams increasingly require SOC 2 reports before signing contracts. This guide covers the practical realities of achieving SOC 2 compliance: what it actually requires, how long it takes, what it costs, and how to avoid the most common pitfalls.

## When to Use / When NOT to Use

| Scenario | Approach | Notes |
|----------|----------|-------|
| B2B SaaS selling to enterprises | SOC 2 Type II is almost certainly required | Start preparation 6-9 months before you need the report |
| Startup pre-revenue or pre-Series A | Defer SOC 2; focus on good security fundamentals | Implement the controls informally so SOC 2 is easy when needed |
| Handling healthcare data | SOC 2 + HIPAA or HITRUST | SOC 2 alone is insufficient for healthcare |
| Processing payments | SOC 2 + PCI DSS | SOC 2 does not cover PCI requirements |
| Operating in the EU with EU customer data | SOC 2 + GDPR compliance | SOC 2 does not satisfy GDPR; they are complementary |
| Consumer B2C application | SOC 2 is rarely required | Enterprise customers drive SOC 2 demand, not consumers |
| Government contracts | FedRAMP or StateRAMP, not SOC 2 | Government has its own compliance frameworks |

## SOC 2 Type I vs Type II

| Aspect | Type I | Type II |
|--------|--------|---------|
| What it evaluates | Design of controls at a point in time | Design AND operating effectiveness over a period (3-12 months) |
| Timeline to achieve | 2-4 months of preparation | 3-6 months of preparation + 3-12 months observation period |
| Enterprise acceptance | Some accept it as a stepping stone | This is what enterprise procurement teams actually want |
| Cost | $20,000-$50,000 (audit only) | $50,000-$150,000 (audit), $30,000-$100,000 (tooling), $50,000-$150,000 (labor) |
| Renewal | One-time snapshot | Annual audit required |
| Strategic recommendation | Get Type I quickly to unblock early deals, then transition to Type II | Type II is the long-term requirement |

## Trust Service Criteria (TSC)

SOC 2 evaluates controls across five categories. Security is mandatory; the others are optional but commonly included.

### Security (Required -- "Common Criteria")

Controls protecting information and systems against unauthorized access, disclosure, and damage. This covers access controls, network security, encryption, vulnerability management, incident response, and change management.

**What auditors look for:**
- Documented access control policies with role-based access
- Multi-factor authentication for production systems and admin access
- Encryption in transit (TLS 1.2+) and at rest (AES-256)
- Vulnerability scanning and penetration testing on a regular schedule
- Incident response plan with documented runbooks and contact procedures
- Change management process with code review, testing, and approval
- Background checks for employees with system access
- Security awareness training

### Availability

Controls ensuring systems are operational and accessible as committed. This covers uptime SLAs, disaster recovery, capacity planning, and business continuity.

**Include if:** You offer an SLA to customers, or availability is a key selling point.

**What auditors look for:**
- Documented SLA with uptime targets
- Monitoring and alerting for system availability
- Disaster recovery plan with documented RTO and RPO
- Backup procedures with regular testing of restore processes
- Capacity planning and auto-scaling documentation

### Processing Integrity

Controls ensuring data processing is complete, valid, accurate, and authorized. This covers data validation, error handling, and output verification.

**Include if:** Your application performs data transformations, calculations, or processing that customers rely on for accuracy (financial calculations, compliance reporting).

### Confidentiality

Controls protecting information designated as confidential. This covers data classification, encryption, access restrictions, and data retention/disposal policies.

**Include if:** You handle customer trade secrets, proprietary data, or data with contractual confidentiality requirements.

### Privacy

Controls related to the collection, use, retention, disclosure, and disposal of personal information. Aligned with the AICPA's privacy criteria.

**Include if:** You process significant personal information. Note that SOC 2 Privacy is less comprehensive than GDPR or CCPA compliance -- it is a supplement, not a substitute.

## Compliance Roadmap for Startups

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Establish the policies, tools, and processes that controls will be built on.

1. **Select a compliance automation platform.** Vanta, Drata, Secureframe, Laika, or Tugboat Logic. These platforms automate evidence collection, policy generation, and readiness assessment. Budget: $10,000-$30,000/year.

2. **Draft security policies.** The compliance platform provides templates. Customize them to reflect your actual practices. Key policies:
   - Information Security Policy
   - Access Control Policy
   - Change Management Policy
   - Incident Response Plan
   - Risk Assessment Methodology
   - Data Classification and Handling Policy
   - Acceptable Use Policy
   - Business Continuity / Disaster Recovery Plan
   - Vendor Management Policy

3. **Implement foundational controls:**
   - MFA on all production systems, cloud accounts, and critical SaaS tools
   - SSO for employee access (Google Workspace or Okta)
   - Endpoint management (MDM for company devices)
   - Encryption in transit and at rest for all customer data

4. **Select an auditor.** Engage the audit firm early. They will scope the audit and identify gaps. Established firms: Schellman, A-LIGN, Coalfire, Prescient Assurance. For startups, smaller firms offer more guidance and lower cost.

### Phase 2: Control Implementation (Weeks 5-12)

**Goal:** Implement and document all required controls.

1. **Access control:**
   - Role-based access control (RBAC) for all production systems
   - Quarterly access reviews (who has access? do they still need it?)
   - Automated provisioning and deprovisioning (tie to HR onboarding/offboarding)
   - Separate accounts for development and production environments

2. **Change management:**
   - Code review required before merge (enforce via branch protection rules)
   - CI/CD pipeline with automated tests
   - Change approval process documented and followed
   - Deployment logging with rollback capability

3. **Monitoring and logging:**
   - Centralized logging (CloudWatch, Datadog, or ELK)
   - Alerting on security events (failed logins, privilege escalation, configuration changes)
   - Log retention for at least 1 year (auditors want 12 months of evidence)
   - Infrastructure monitoring with uptime tracking

4. **Vulnerability management:**
   - Automated dependency scanning (Snyk, Dependabot, or Trivy)
   - Regular vulnerability scans (at least quarterly)
   - Annual penetration test by a qualified third party
   - Remediation SLAs: Critical within 48 hours, High within 7 days, Medium within 30 days

5. **HR controls:**
   - Background checks for all employees (at minimum, before accessing production)
   - Security awareness training (annual, with phishing simulations)
   - Confidentiality agreements (NDA or employment agreement clause)
   - Documented onboarding and offboarding procedures

6. **Vendor management:**
   - Inventory of all third-party vendors that access or process customer data
   - Vendor risk assessment (at minimum, collect their SOC 2 report)
   - Data processing agreements with each vendor
   - Annual vendor review

### Phase 3: Evidence Collection and Observation (Weeks 13-24+)

**Goal:** Operate controls consistently and collect evidence for the auditor.

1. **Continuous compliance monitoring.** Your compliance platform should automatically collect evidence: screenshots of MFA enforcement, logs of access reviews, Git history showing code reviews, CI/CD pipeline records.

2. **Regular compliance activities:**
   - Monthly: review security alerts, update asset inventory
   - Quarterly: access reviews, vulnerability scans, policy reviews
   - Annually: penetration test, risk assessment, security training, vendor reviews

3. **Prepare for the audit:** Organize evidence by TSC control. Your compliance platform should map evidence to specific controls. The auditor will request additional documentation -- respond promptly.

### Phase 4: Audit (2-6 Weeks)

1. **Readiness assessment:** Some auditors offer a pre-audit readiness assessment. This identifies gaps before the formal audit begins. Highly recommended for first-time audits.

2. **Audit fieldwork:** The auditor reviews policies, tests controls, samples evidence, and interviews team members. For Type II, they examine evidence across the entire observation period.

3. **Management response:** For any findings (gaps or exceptions), you provide a management response describing remediation plans.

4. **Report issuance:** The auditor issues the SOC 2 report. It is not public -- you share it with customers under NDA.

## Cost Breakdown

| Cost Category | Range (Startup / Series A) | Notes |
|---------------|---------------------------|-------|
| Compliance automation platform | $10,000-$30,000/year | Vanta, Drata, Secureframe |
| Auditor fees (Type II) | $30,000-$80,000/year | Smaller firms on the lower end |
| Penetration testing | $10,000-$30,000/year | Third-party, annual |
| Security tooling (SIEM, vulnerability scanning) | $5,000-$20,000/year | Often included in existing tooling |
| Employee time (internal labor) | $50,000-$150,000 equivalent | Largest hidden cost -- security lead + engineering time |
| **Total first year** | **$105,000-$310,000** | Subsequent years ~60-70% of first year |

## Real-World Examples

### Vanta: Automating SOC 2 for Startups

Vanta built its business on making SOC 2 compliance accessible to startups. Their platform connects to AWS, GCP, GitHub, Google Workspace, Okta, and dozens of other tools to automatically collect evidence and monitor control effectiveness. They report that customers using their platform achieve SOC 2 Type II in an average of 3-4 months (preparation) plus the observation period. The key insight: automation reduces the labor cost by 50-70%, making SOC 2 achievable for teams as small as 5 engineers.

### Figma: Security as a Feature

Figma publishes their SOC 2 Type II report availability prominently on their security page, alongside their penetration test results and security architecture documentation. Their approach demonstrates that security compliance can be a competitive advantage, not just a checkbox. Enterprise customers evaluating Figma against competitors see transparent security posture as a signal of organizational maturity.

### HashiCorp: Infrastructure for Compliance

HashiCorp's Vault product is widely used for secrets management in SOC 2 compliant environments. Their own SOC 2 journey influenced product features: audit logging, access policies, dynamic secrets, and encryption-as-a-service. Their engineering blog describes how they "eat their own dog food" by using Vault internally for the same controls their customers need.

### Lob: Startup SOC 2 Journey

Lob (print and mail API) published a detailed blog post about their SOC 2 journey as a startup. Key takeaways: (1) Start by mapping existing practices to SOC 2 controls -- most engineering teams already do code review and access control informally. (2) The hardest part was not implementing controls but documenting them consistently. (3) Hiring a dedicated security/compliance person before starting the process saved months of engineering time.

## Decision Framework

### Start SOC 2 Now When...

- Enterprise prospects are asking for your SOC 2 report in the sales process
- You are closing deals >$50K ARR and procurement teams require compliance evidence
- You handle sensitive customer data (financial, health, PII)
- Competitors have SOC 2 and you are losing deals because of it

### Defer SOC 2 When...

- You are pre-product-market-fit and iterating rapidly
- Your customers are SMBs who do not require compliance reports
- Your annual revenue is under $500K and the compliance cost is disproportionate
- You are B2C with no enterprise sales pipeline

### Get Type I First When...

- You need to unblock a specific enterprise deal within 3 months
- You want a milestone to validate your control design before committing to Type II
- Your organization is not yet mature enough for a full observation period

### Go Directly to Type II When...

- You have strong existing security practices (code review, MFA, logging)
- You can commit to 6+ months of consistent control operation
- Your sales pipeline has multiple enterprise deals requiring Type II

## Common Mistakes

**1. Treating SOC 2 as a checkbox exercise.** Companies that implement controls solely to pass the audit create brittle compliance postures. When the auditor asks "walk me through your incident response process," they want to see evidence it was actually used, not just that a policy document exists.

**2. Underestimating the time commitment.** SOC 2 Type II requires sustained effort over months, not a sprint. The observation period cannot be accelerated. Plan accordingly and set expectations with leadership.

**3. Not involving engineering early.** Many controls (code review, CI/CD, access management, logging) are engineering-owned. If engineering learns about SOC 2 requirements after policies are written, implementation will be painful. Include a senior engineer in the compliance team from day one.

**4. Over-scoping the audit.** You choose which systems are in scope. If your SaaS product runs on AWS but your marketing website runs on Squarespace, Squarespace does not need to be in scope. Narrow the scope to customer-facing systems and their dependencies.

**5. Skipping the readiness assessment.** Going directly to a formal audit without a readiness assessment risks findings (failures) in the final report. Findings cannot be removed -- they remain in the report forever. A readiness assessment catches gaps when they can still be fixed without consequences.

**6. Not budgeting for ongoing compliance.** SOC 2 is annual. The second year is less work than the first, but it still requires access reviews, policy updates, penetration testing, and the audit itself. Budget for it as an ongoing operational expense.

**7. Choosing the cheapest auditor.** An inexperienced auditor may miss issues that a future, more thorough auditor will find -- creating a false sense of security. Conversely, an overly rigid auditor may impose controls inappropriate for a startup. Ask for references from companies of similar size and stage.

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Control effectiveness rate | Percentage of controls operating as designed | > 95% (auditors sample controls; failures become findings) |
| Days to close access review | Timeliness of quarterly reviews | < 5 business days |
| MFA adoption rate | Foundational security control | 100% for all employees and production access |
| Mean time to remediate vulnerabilities | Demonstrates operational security | Critical < 48h, High < 7d, Medium < 30d |
| Policy review completion | All policies reviewed annually | 100% within 30 days of scheduled review |
| Employee training completion | Security awareness requirement | 100% within 30 days of hire; annual refresher 100% |
| Vendor risk assessment coverage | All vendors processing customer data assessed | 100% |
| Audit findings count | Measures compliance gaps | Zero is ideal; all findings must have remediation plans |
| Time to achieve compliance (first time) | Project management metric | 4-9 months (preparation + observation) |

## References

- AICPA Trust Services Criteria (2017, updated 2022): aicpa.org
- AICPA SOC 2 Reporting Guide: aicpa.org/soc
- Vanta blog: "How Long Does SOC 2 Take?" and customer case studies
- Drata blog: "SOC 2 Compliance Guide for Startups" (2023)
- Lob engineering blog: "Our SOC 2 Journey" (2020)
- Schellman: "SOC 2 Readiness Guide" (2023)
- A-LIGN: "SOC 2 Cost Breakdown" (2023)
- NIST Cybersecurity Framework -- frequently mapped to SOC 2 controls
- ISO 27001 -- complementary standard often pursued alongside SOC 2
- Latacora: "SOC 2 Starting Seven" -- minimum controls for SOC 2 readiness
