# Software Product Audit: Industry Best Practices Research

## Research Date: 2026-02-21

This document compiles authoritative industry standards, frameworks, and best practices
for software product audits across 10 critical domains. It serves as the "gold standard"
reference for building a world-class audit system.

---

## 1. OWASP Application Security Verification Standard (ASVS) 4.0

**Source**: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
**Standard**: OWASP ASVS 4.0.3 (286 verification requirements)

### Verification Levels

| Level | Name | Description | Use Case |
|-------|------|-------------|----------|
| L1 | Low Assurance | Penetration-testable, basic security | All software |
| L2 | Standard Assurance | Protection for sensitive data | Most applications (recommended) |
| L3 | High Assurance | Maximum trust, critical systems | Medical, financial, military, critical infra |

### 14 Verification Categories

| ID | Category | What It Covers |
|----|----------|----------------|
| V1 | Architecture, Design & Threat Modeling | Secure SDLC, auth architecture, access control design, input/output handling, cryptography strategy, logging architecture, data protection, communications, malware prevention, business logic, file handling, API design, configuration |
| V2 | Authentication | Password security, authenticator lifecycle, credential storage & recovery, multi-factor verification, service authentication |
| V3 | Session Management | Fundamental session management, session binding, logout/timeout, cookie-based sessions, token-based sessions, exploitation defenses |
| V4 | Access Control | General access control design, operation-level access controls, additional access control considerations |
| V5 | Validation, Sanitization & Encoding | Input validation, sanitization & sandboxing, output encoding & injection prevention, memory management, deserialization prevention |
| V6 | Stored Cryptography | Data classification, cryptographic algorithms, random value generation, secret management |
| V7 | Error Handling & Logging | Log content, log processing, log protection, error handling |
| V8 | Data Protection | General data protection, client-side data protection, sensitive private data |
| V9 | Communications | Communications security (TLS), server communications security |
| V10 | Malicious Code | Code integrity controls, malicious code search, deployed application integrity |
| V11 | Business Logic | Business logic security (anti-automation, abuse prevention) |
| V12 | Files & Resources | File upload, file integrity, file execution, file storage, file download, SSRF protection |
| V13 | API & Web Service | Generic web service security, RESTful, SOAP, GraphQL |
| V14 | Configuration | Build processes, dependency management, unintended security disclosure, HTTP security headers, HTTP request header validation |

### Mapping to Audit Quality

ASVS provides the most comprehensive security verification framework. Each category
maps to a distinct security audit dimension. Level 2 is the minimum for any serious
production application. Level 3 is required for financial/healthcare.

---

## 2. ISO/IEC 25010 Software Quality Model

**Source**: [ISO 25010:2023](https://iso25000.com/en/iso-25000-standards/iso-25010) | [arc42 Quality Model](https://quality.arc42.org/standards/iso-25010)

### 2023 Update: Nine Product Quality Characteristics

The 2023 revision expanded from 8 to 9 characteristics. Key changes: added Safety,
renamed Usability to Interaction Capability, renamed Portability to Flexibility.

| # | Characteristic | Sub-Characteristics | Maps to Audit Dimension |
|---|---------------|---------------------|------------------------|
| 1 | **Functional Suitability** | Functional completeness, functional correctness, functional appropriateness | Feature completeness, correctness testing |
| 2 | **Performance Efficiency** | Time behaviour, resource utilization, capacity | Latency, throughput, resource usage |
| 3 | **Compatibility** | Co-existence, interoperability | Integration testing, API compatibility |
| 4 | **Interaction Capability** (was Usability) | Recognizability, learnability, operability, user error protection, user engagement (was aesthetics), inclusivity (new), self-descriptiveness (new), accessibility | UX audit, accessibility audit |
| 5 | **Reliability** | Faultlessness (was maturity), availability, fault tolerance, recoverability | Uptime, error rates, failover testing |
| 6 | **Security** | Confidentiality, integrity, non-repudiation, accountability, authenticity, resistance (new) | Security audit (OWASP, pen-testing) |
| 7 | **Maintainability** | Modularity, reusability, analyzability, modifiability, testability | Code quality, tech debt, test coverage |
| 8 | **Flexibility** (was Portability) | Adaptability, scalability (new), installability, replaceability | Deployment, containerization, scaling |
| 9 | **Safety** (new in 2023) | Operational constraint, risk identification, fail safe, hazard warning, safe integration | Safety-critical system analysis |

### Quality in Use Model (5 characteristics)

| Characteristic | Sub-Characteristics | Maps to |
|---------------|---------------------|---------|
| Effectiveness | -- | Task success rate |
| Efficiency | -- | Time-on-task |
| Satisfaction | Usefulness, trust, pleasure, comfort | User satisfaction surveys |
| Freedom from Risk | Economic risk, health/safety risk, environmental risk | Risk assessment |
| Context Coverage | Context completeness, flexibility | Cross-device/environment testing |

### Mapping to Audit Quality

ISO 25010 is THE holistic quality model. Every audit system should map its dimensions
to these 9 characteristics. The 2023 update adding Safety and Flexibility reflects
modern concerns (IoT, cloud-native, AI systems).

---

## 3. Google Software Engineering Practices

**Source**: [Google Engineering Practices](https://google.github.io/eng-practices/review/) | [Software Engineering at Google (Abseil)](https://abseil.io/resources/swe-book/html/ch09.html)

### Code Review Quality Dimensions

Google's code review focuses on these specific dimensions:

| Dimension | What Reviewers Check |
|-----------|---------------------|
| **Design** | Is the code well-designed? Does the overall architecture make sense? |
| **Functionality** | Does the code behave as intended? Is the behavior good for users? |
| **Complexity** | Could the code be simpler? Can another developer understand it easily? |
| **Tests** | Are tests correct, well-designed, and automated? |
| **Naming** | Are variable/class/method names clear and descriptive? |
| **Comments** | Are comments clear, useful, and explain "why" not "what"? |
| **Style** | Does code follow the style guide? |
| **Documentation** | Did the developer update relevant documentation? |

### Three Approval Types

| Approval | Who | What They Verify |
|----------|-----|-----------------|
| Correctness + Comprehension | Another engineer | Code is correct and understandable |
| Code Ownership | Code owner | Code is appropriate for that part of the codebase |
| Readability | Language readability reviewer | Conforms to language style and best practices |

### Core Philosophy

> "The primary purpose of code review is to make sure that the overall code health
> of Google's code base is improving over time."

Each CL (changelist) should leave the codebase in a better state than before.

### Mapping to Audit Quality

Google's dimensions map directly to code-level audit checks: static analysis (complexity,
naming, style), test coverage (tests), architectural fitness (design), and functional
correctness (functionality).

---

## 4. DORA Metrics

**Source**: [DORA at Google](https://dora.dev/guides/dora-metrics-four-keys/) | [Accelerate State of DevOps Report 2024](https://dora.dev)

### The Four Key Metrics (+ 2024 Addition)

| Metric | What It Measures | Elite | High | Medium | Low |
|--------|-----------------|-------|------|--------|-----|
| **Deployment Frequency** | How often code deploys to production | On-demand (multiple/day) | Weekly to monthly | Monthly to 6 months | Fewer than once per 6 months |
| **Lead Time for Changes** | Time from commit to production | Less than 1 day | 1 day to 1 week | 1 week to 1 month | More than 6 months |
| **Change Failure Rate** | % of deployments causing failure | 0-15% | 16-30% | 16-30% | 46-60% |
| **Time to Restore Service** | Time to recover from failure | Less than 1 hour | Less than 1 day | 1 day to 1 week | More than 6 months |

### 2024 Updates

- **Rework Rate** added as a new stability factor (replacing some aspects of change failure rate)
- **Change Lead Time** (5th metric): time from first commit to code running in production
- AI adoption finding: 25% increase in AI adoption correlated with 1.5% reduction in delivery performance and 7.2% decrease in delivery stability

### How DORA Maps to Audit Dimensions

| DORA Metric | Audit Dimension |
|------------|-----------------|
| Deployment Frequency | CI/CD maturity, release automation |
| Lead Time for Changes | Development process efficiency, pipeline health |
| Change Failure Rate | Test quality, review effectiveness, deployment safety |
| Time to Restore | Incident response, observability, rollback capability |
| Rework Rate | Code quality, defect escape rate |

### Mapping to Audit Quality

DORA metrics measure the health of the entire software delivery pipeline. An audit
system should track these to assess operational maturity, not just code quality.

---

## 5. CWE/SANS Top 25 Most Dangerous Software Weaknesses (2024)

**Source**: [MITRE CWE Top 25 (2024)](https://cwe.mitre.org/top25/archive/2024/2024_cwe_top25.html) | [CISA Alert](https://www.cisa.gov/news-events/alerts/2024/11/20/2024-cwe-top-25-most-dangerous-software-weaknesses)

### Complete 2024 Ranking

Based on 31,770 CVE records (June 2023 - June 2024). Scored by frequency x severity (CVSS).

| Rank | CWE ID | Name | Category |
|------|--------|------|----------|
| 1 | CWE-79 | Cross-site Scripting (XSS) | Injection |
| 2 | CWE-787 | Out-of-bounds Write | Memory |
| 3 | CWE-89 | SQL Injection | Injection |
| 4 | CWE-352 | Cross-Site Request Forgery (CSRF) | Authentication |
| 5 | CWE-22 | Path Traversal | File System |
| 6 | CWE-125 | Out-of-bounds Read | Memory |
| 7 | CWE-78 | OS Command Injection | Injection |
| 8 | CWE-416 | Use After Free | Memory |
| 9 | CWE-862 | Missing Authorization | Access Control |
| 10 | CWE-434 | Unrestricted Upload of File with Dangerous Type | File System |
| 11 | CWE-94 | Code Injection | Injection |
| 12 | CWE-20 | Improper Input Validation | Input |
| 13 | CWE-77 | Command Injection | Injection |
| 14 | CWE-287 | Improper Authentication | Authentication |
| 15 | CWE-269 | Improper Privilege Management | Access Control |
| 16 | CWE-502 | Deserialization of Untrusted Data | Input |
| 17 | CWE-200 | Exposure of Sensitive Information | Data Protection |
| 18 | CWE-863 | Incorrect Authorization | Access Control |
| 19 | CWE-918 | Server-Side Request Forgery (SSRF) | Network |
| 20 | CWE-119 | Improper Restriction of Operations within Memory Buffer | Memory |
| 21 | CWE-476 | NULL Pointer Dereference | Memory |
| 22 | CWE-798 | Use of Hard-coded Credentials | Authentication |
| 23 | CWE-190 | Integer Overflow or Wraparound | Memory |
| 24 | CWE-400 | Uncontrolled Resource Consumption | Availability |
| 25 | CWE-306 | Missing Authentication for Critical Function | Authentication |

### New in 2024

- **#17 CWE-200**: Exposure of Sensitive Information to an Unauthorized Actor
- **#24 CWE-400**: Uncontrolled Resource Consumption

### Weakness Categories Summary

| Category | Count | CWE IDs |
|----------|-------|---------|
| Injection (XSS, SQL, OS, Code, Command) | 5 | 79, 89, 78, 94, 77 |
| Memory Safety | 5 | 787, 125, 416, 119, 476, 190 |
| Authentication / Credentials | 4 | 352, 287, 798, 306 |
| Access Control / Authorization | 3 | 862, 269, 863 |
| Input Handling | 2 | 20, 502 |
| File System | 2 | 22, 434 |
| Data Protection | 1 | 200 |
| Network | 1 | 918 |
| Availability | 1 | 400 |

### Mapping to Audit Quality

CWE Top 25 is the definitive list of what automated security scanning should detect.
Every SAST/DAST tool should be evaluated against its coverage of these 25 weaknesses.
For web applications specifically: XSS (#1), SQLi (#3), CSRF (#4), and Path Traversal (#5)
are the highest priority.

---

## 6. WCAG 2.1 AA Accessibility Requirements

**Source**: [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/) | [Accessible.org Checklist](https://accessible.org/wcag/)

### Structure

- **4 Principles** (POUR): Perceivable, Operable, Understandable, Robust
- **13 Guidelines** under the 4 principles
- **50 Success Criteria** at Level A + AA (Level AA includes all Level A requirements)

### Principle 1: Perceivable

Information and UI components must be presentable in ways users can perceive.

| Guideline | Success Criteria (A + AA) |
|-----------|--------------------------|
| **1.1 Text Alternatives** | 1.1.1 Non-text Content (A) - All non-text content has text alternatives |
| **1.2 Time-based Media** | 1.2.1 Audio-only/Video-only (A), 1.2.2 Captions Prerecorded (A), 1.2.3 Audio Description or Media Alternative (A), 1.2.4 Captions Live (AA), 1.2.5 Audio Description Prerecorded (AA) |
| **1.3 Adaptable** | 1.3.1 Info and Relationships (A), 1.3.2 Meaningful Sequence (A), 1.3.3 Sensory Characteristics (A), 1.3.4 Orientation (AA), 1.3.5 Identify Input Purpose (AA) |
| **1.4 Distinguishable** | 1.4.1 Use of Color (A), 1.4.2 Audio Control (A), 1.4.3 Contrast Minimum 4.5:1 (AA), 1.4.4 Resize Text 200% (AA), 1.4.5 Images of Text (AA), 1.4.10 Reflow (AA), 1.4.11 Non-text Contrast 3:1 (AA), 1.4.12 Text Spacing (AA), 1.4.13 Content on Hover/Focus (AA) |

### Principle 2: Operable

UI components and navigation must be operable.

| Guideline | Success Criteria (A + AA) |
|-----------|--------------------------|
| **2.1 Keyboard Accessible** | 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A), 2.1.4 Character Key Shortcuts (A) |
| **2.2 Enough Time** | 2.2.1 Timing Adjustable (A), 2.2.2 Pause Stop Hide (A) |
| **2.3 Seizures** | 2.3.1 Three Flashes or Below Threshold (A) |
| **2.4 Navigable** | 2.4.1 Bypass Blocks (A), 2.4.2 Page Titled (A), 2.4.3 Focus Order (A), 2.4.4 Link Purpose in Context (A), 2.4.5 Multiple Ways (AA), 2.4.6 Headings and Labels (AA), 2.4.7 Focus Visible (AA) |
| **2.5 Input Modalities** | 2.5.1 Pointer Gestures (A), 2.5.2 Pointer Cancellation (A), 2.5.3 Label in Name (A) |

### Principle 3: Understandable

Information and UI operation must be understandable.

| Guideline | Success Criteria (A + AA) |
|-----------|--------------------------|
| **3.1 Readable** | 3.1.1 Language of Page (A), 3.1.2 Language of Parts (AA) |
| **3.2 Predictable** | 3.2.1 On Focus (A), 3.2.2 On Input (A), 3.2.3 Consistent Navigation (AA), 3.2.4 Consistent Identification (AA) |
| **3.3 Input Assistance** | 3.3.1 Error Identification (A), 3.3.2 Labels or Instructions (A), 3.3.3 Error Suggestion (AA), 3.3.4 Error Prevention for Legal/Financial/Data (AA) |

### Principle 4: Robust

Content must work with assistive technologies.

| Guideline | Success Criteria (A + AA) |
|-----------|--------------------------|
| **4.1 Compatible** | 4.1.2 Name, Role, Value (A), 4.1.3 Status Messages (AA) |

### Key Automated Checks

These can be tested programmatically (axe-core, pa11y, Lighthouse):
- Color contrast ratios (1.4.3, 1.4.11)
- Alt text presence (1.1.1)
- Heading hierarchy (1.3.1)
- Form labels (1.3.1, 3.3.2)
- Language attribute (3.1.1)
- Focus indicators (2.4.7)
- ARIA roles and properties (4.1.2)
- Keyboard accessibility (2.1.1)

### Mapping to Audit Quality

WCAG maps directly to the Interaction Capability > Accessibility sub-characteristic
in ISO 25010. Approximately 30% of WCAG criteria can be automated; the rest require
manual testing with assistive technologies. Lighthouse Accessibility score covers
the automatable subset.

---

## 7. Performance Audit Best Practices

**Source**: [Google Lighthouse](https://github.com/GoogleChrome/lighthouse) | [web.dev Core Web Vitals](https://web.dev/optimize-vitals-lighthouse/)

### Frontend: Core Web Vitals

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|-----------------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | Main content load time | <= 2.5s | 2.5-4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | Input responsiveness | <= 200ms | 200-500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | <= 0.1 | 0.1-0.25 | > 0.25 |

### Google Lighthouse Categories

| Category | Score Range | What It Audits |
|----------|-----------|----------------|
| **Performance** | 0-100 | FCP, LCP, TBT, CLS, Speed Index |
| **Accessibility** | 0-100 | WCAG automated checks (~30% coverage) |
| **Best Practices** | 0-100 | HTTPS, no console errors, image aspect ratios, deprecated APIs |
| **SEO** | 0-100 | Meta tags, crawlability, mobile-friendliness, structured data |
| **PWA** | Pass/Fail | Service worker, manifest, installability |

Score thresholds: 90-100 (Good/Green), 50-89 (Needs Improvement/Orange), 0-49 (Poor/Red)

### Backend: API Performance Metrics

| Metric | Description | Targets |
|--------|-------------|---------|
| **p50 Latency** | Median response time (typical experience) | < 100ms for simple reads, < 500ms for complex operations |
| **p95 Latency** | 95th percentile (SLA target) | <= 400ms for standard endpoints |
| **p99 Latency** | 99th percentile (near worst-case) | <= 1000ms; consistency indicator |
| **Throughput** | Requests per second (RPS) | Based on expected load + 3x headroom |
| **Error Rate** | Percentage of 5xx responses | < 1% (SLA), < 0.1% (target) |
| **Time to First Byte (TTFB)** | Server processing time | < 200ms |
| **Apdex Score** | Application Performance Index | > 0.9 (satisfied threshold typically 500ms) |

### Backend: Database Performance

| Metric | Target |
|--------|--------|
| Query execution time (p95) | < 100ms |
| Connection pool utilization | < 80% |
| Slow query count | 0 in production |
| N+1 query detection | 0 violations |
| Index usage ratio | > 95% of queries use indexes |

### Performance Budget

| Resource Type | Budget |
|--------------|--------|
| Total JavaScript | < 300KB gzipped |
| Total CSS | < 100KB gzipped |
| Total page weight | < 1.5MB |
| Number of requests | < 50 |
| Web font weight | < 100KB |
| Image optimization | WebP/AVIF, lazy loading |

### Mapping to Audit Quality

Performance maps to ISO 25010 Performance Efficiency (time behaviour, resource
utilization, capacity). Both frontend (Core Web Vitals, Lighthouse) and backend
(latency percentiles, throughput, error rates) must be audited. Long Tasks > 50ms
block the main thread and degrade INP.

---

## 8. Data Integrity and Privacy (GDPR)

**Source**: [GDPR.eu Checklist](https://gdpr.eu/checklist/) | [CookieYes GDPR Software Requirements](https://www.cookieyes.com/blog/gdpr-software-requirements/)

### GDPR Audit Requirements

#### Lawful Basis for Processing

| Requirement | Audit Check |
|-------------|------------|
| Legal basis documented for each processing activity | Verify data processing register |
| Consent obtained before processing (where consent is the basis) | Check consent capture mechanism |
| Consent is granular (per-purpose, not bundled) | Verify consent UI and storage |
| Consent records maintained with timestamp, scope, method | Query consent audit trail |
| Consent is freely given, specific, informed, unambiguous | Review consent UX flow |
| Consent can be withdrawn as easily as it was given | Test withdrawal mechanism |

#### Data Subject Rights

| Right | Audit Check |
|-------|------------|
| **Right of Access** (Art. 15) | Can users request all their data? Response within 30 days? |
| **Right to Rectification** (Art. 16) | Can users correct inaccurate data? |
| **Right to Erasure / Right to Be Forgotten** (Art. 17) | Can users request deletion? Does it cascade to backups? |
| **Right to Restrict Processing** (Art. 18) | Can users limit how their data is used? |
| **Right to Data Portability** (Art. 20) | Can users export their data in machine-readable format? |
| **Right to Object** (Art. 21) | Can users object to specific processing? |

#### Data Protection by Design and Default

| Requirement | Audit Check |
|-------------|------------|
| Data minimization | Only collecting data that's necessary? |
| Purpose limitation | Data used only for stated purposes? |
| Storage limitation | Defined retention periods per data type? |
| Data encryption at rest | Database encryption, file encryption? |
| Data encryption in transit | TLS 1.2+ for all connections? |
| Pseudonymization where possible | PII separation from business data? |
| Access controls on personal data | Role-based access, principle of least privilege? |
| Data breach notification | Process to notify authority within 72 hours? |
| Data Protection Impact Assessment (DPIA) | Conducted for high-risk processing? |
| Cross-border transfer safeguards | Standard Contractual Clauses, adequacy decisions? |

#### Data Retention

| Audit Check | Details |
|-------------|---------|
| Retention policy documented | Each data type has defined retention period |
| Automated deletion workflows | Data purged when retention period expires |
| Backup deletion | Deletion propagates to backup systems |
| Anonymization as alternative | Can data be anonymized instead of deleted? |
| Audit trail of deletions | Log when and what was deleted |

### Mapping to Audit Quality

Maps to ISO 25010 Security (confidentiality, accountability) and to OWASP ASVS V8
(Data Protection). Privacy is a legal obligation in EU/UK/California/Brazil and
increasingly worldwide. Software must have technical mechanisms to enforce every
GDPR right.

---

## 9. OWASP API Security Top 10 (2023)

**Source**: [OWASP API Security Project](https://owasp.org/API-Security/editions/2023/en/0xb0-next-devs/)

### Complete List with Audit Checks

| Rank | Risk | Description | Audit Checks |
|------|------|-------------|-------------|
| API1 | **Broken Object Level Authorization (BOLA)** | APIs expose endpoints that handle object identifiers, creating a wide attack surface | Verify authorization checks on every object access; test with different user tokens accessing others' objects |
| API2 | **Broken Authentication** | Authentication mechanisms implemented incorrectly | Test token validation, session management, credential stuffing protection, MFA support |
| API3 | **Broken Object Property Level Authorization** | Users can read/modify object properties they shouldn't have access to | Test field-level authorization; verify response filtering; check mass assignment protection |
| API4 | **Unrestricted Resource Consumption** | No limits on resources an API call can consume | Verify rate limiting, payload size limits, pagination limits, timeout enforcement, cost controls |
| API5 | **Broken Function Level Authorization (BFLA)** | Users access admin or privileged functions | Test role-based access to different endpoints; verify admin functions are protected |
| API6 | **Unrestricted Access to Sensitive Business Flows** | Business flows exposed without adequate protection against automation | Verify anti-bot protection, CAPTCHA, rate limiting on sensitive flows (purchases, account creation) |
| API7 | **Server Side Request Forgery (SSRF)** | API fetches remote resources without validating user-supplied URLs | Test URL validation, allowlisting, block access to internal services/metadata endpoints |
| API8 | **Security Misconfiguration** | Insecure default configs, incomplete setup, verbose errors | Check CORS, error messages, HTTP headers, TLS config, default credentials, debug mode off |
| API9 | **Improper Inventory Management** | Unmanaged API versions, undocumented endpoints | Verify API inventory, deprecation policy, documentation completeness, no shadow APIs |
| API10 | **Unsafe Consumption of APIs** | Blindly trusting third-party API responses | Verify input validation on upstream API responses, timeout handling, error handling for external calls |

### Key Changes from 2019 to 2023

- **Removed**: Injection (covered by OWASP Top 10 Web), Insufficient Logging & Monitoring
- **Added**: SSRF (#7), Unsafe Consumption of APIs (#10)
- **Restructured**: Mass Assignment and Excessive Data Exposure merged into Broken Object Property Level Authorization (#3)

### Mapping to Audit Quality

API Security Top 10 directly maps to OWASP ASVS categories V2 (Auth), V4 (Access
Control), V5 (Validation), V13 (API Security). These are the 10 most critical
API-specific risks and should be the priority for API penetration testing and
automated API security scanning.

---

## 10. Observability Best Practices

**Source**: [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) | [IBM Observability Pillars](https://www.ibm.com/think/insights/observability-pillars)

### Three Pillars of Observability

| Pillar | Purpose | Standards |
|--------|---------|-----------|
| **Logs** | Discrete events with context (errors, warnings, info) | Structured (JSON), correlation IDs, no sensitive data |
| **Metrics** | Numerical measurements over time | Prometheus format, RED/USE methods |
| **Traces** | End-to-end request flow across services | W3C Trace Context (traceparent header), OpenTelemetry |

### Google SRE Four Golden Signals

| Signal | What It Measures | How to Monitor | Alert Threshold |
|--------|-----------------|----------------|-----------------|
| **Latency** | Request duration (distinguish success vs error) | p50, p95, p99 histograms | p99 > 2x baseline for 5 min |
| **Traffic** | Demand (requests/second) | Counters, gauges | Anomaly detection on baseline |
| **Errors** | Failed requests (explicit 5xx + implicit slow responses) | Error rate percentage | > 1% for 5 min |
| **Saturation** | Resource utilization (CPU, memory, disk, connections) | Utilization percentages | > 80% for 15 min |

### Logging Standards

| Requirement | Details |
|-------------|---------|
| Structured format | JSON with consistent field names |
| Correlation ID | Every request gets a unique trace ID propagated across services |
| Log levels | ERROR, WARN, INFO, DEBUG (DEBUG off in production) |
| No sensitive data | Never log passwords, tokens, PII, credit cards |
| Timestamp format | ISO 8601 with timezone (UTC preferred) |
| Retention | 30 days hot, 90 days warm, 1 year cold (minimum) |
| Centralization | All logs aggregated to single platform (ELK, Datadog, etc.) |
| Rate limiting | Log sampling at high volume to prevent cost explosion |

### Distributed Tracing Requirements

| Requirement | Details |
|-------------|---------|
| W3C Trace Context | Standard traceparent header propagation |
| OpenTelemetry SDK | Vendor-neutral instrumentation |
| Span naming | Consistent naming convention (HTTP method + route) |
| Trace sampling | 100% for errors, 1-10% for success in high-traffic |
| Cross-service correlation | Trace ID in both logs and traces |
| Service map | Auto-generated dependency graph from traces |

### Alerting Best Practices

| Principle | Details |
|-----------|---------|
| Alert on SLOs, not raw metrics | "Error budget 50% consumed" > "CPU > 80%" |
| Alert on symptoms, not causes | "User-facing errors increasing" > "Pod restarting" |
| Actionable alerts only | Every alert must have a documented runbook |
| Severity levels | P1 (page immediately), P2 (page during hours), P3 (ticket), P4 (informational) |
| Alert fatigue prevention | Tune thresholds iteratively; group related alerts |
| Escalation policy | Auto-escalate if not acknowledged within SLA |

### Monitoring Checklist

| Category | Metrics to Track |
|----------|-----------------|
| **Application** | Request rate, error rate, latency (p50/p95/p99), active connections |
| **Infrastructure** | CPU, memory, disk I/O, network I/O, container restarts |
| **Database** | Query latency, connection pool, replication lag, deadlocks, slow queries |
| **External Dependencies** | Third-party API latency, error rates, circuit breaker state |
| **Business Metrics** | Signups, transactions, conversion rate, revenue |
| **Security** | Failed auth attempts, rate limit hits, suspicious patterns |

### Mapping to Audit Quality

Observability maps to ISO 25010 Reliability (availability, fault tolerance,
recoverability) and Maintainability (analyzability). Without proper observability,
you cannot measure any other audit dimension in production. It is the foundation
that enables all other audit capabilities.

---

## Comprehensive "Gold Standard" Audit Checklist

This synthesizes all 10 frameworks into a unified audit taxonomy.

### Level 1: Security (CRITICAL)

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| S-01 | No XSS vulnerabilities (CWE-79) | CWE #1, OWASP ASVS V5 | Yes (SAST/DAST) |
| S-02 | No SQL Injection (CWE-89) | CWE #3, OWASP ASVS V5 | Yes (SAST/DAST) |
| S-03 | CSRF protection on all state-changing endpoints | CWE #4, OWASP ASVS V4 | Yes |
| S-04 | No path traversal vulnerabilities (CWE-22) | CWE #5, OWASP ASVS V12 | Yes (SAST) |
| S-05 | No command injection (CWE-78, CWE-77) | CWE #7/#13, OWASP ASVS V5 | Yes (SAST) |
| S-06 | Proper authentication on all endpoints | CWE #14/#25, OWASP API2, ASVS V2 | Yes (integration tests) |
| S-07 | Object-level authorization (BOLA) | CWE #9, OWASP API1, ASVS V4 | Partial (manual + automated) |
| S-08 | Function-level authorization (BFLA) | CWE #15, OWASP API5, ASVS V4 | Partial |
| S-09 | No hardcoded credentials (CWE-798) | CWE #22, OWASP ASVS V6 | Yes (secret scanning) |
| S-10 | Input validation on all user inputs | CWE #12, OWASP ASVS V5 | Yes (SAST) |
| S-11 | Secure deserialization (CWE-502) | CWE #16, OWASP ASVS V5 | Yes (SAST) |
| S-12 | No sensitive data exposure (CWE-200) | CWE #17, OWASP ASVS V8 | Partial |
| S-13 | SSRF protection (CWE-918) | CWE #19, OWASP API7, ASVS V12 | Yes (DAST) |
| S-14 | Rate limiting on all endpoints | OWASP API4, ASVS V11 | Yes (integration tests) |
| S-15 | Secure HTTP headers (CSP, HSTS, X-Frame-Options) | OWASP ASVS V14, API8 | Yes (header scan) |
| S-16 | TLS 1.2+ on all communications | OWASP ASVS V9, GDPR | Yes (SSL scan) |
| S-17 | Proper error handling (no stack traces in responses) | OWASP ASVS V7, API8 | Yes (DAST) |
| S-18 | Dependency vulnerability scanning | OWASP ASVS V14 | Yes (npm audit, Snyk) |
| S-19 | File upload validation and restrictions | CWE #10, OWASP ASVS V12 | Yes |
| S-20 | Anti-automation on sensitive business flows | OWASP API6 | Manual + automated |

### Level 2: Reliability & Performance

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| R-01 | API p95 latency <= 400ms | ISO 25010 Performance, SRE Golden Signals | Yes (load testing) |
| R-02 | API p99 latency <= 1000ms | ISO 25010 Performance | Yes (load testing) |
| R-03 | Error rate < 1% under normal load | SRE Golden Signals, DORA | Yes (monitoring) |
| R-04 | Error rate < 5% under peak load (3x baseline) | ISO 25010 Reliability | Yes (load testing) |
| R-05 | LCP <= 2.5s | Core Web Vitals | Yes (Lighthouse) |
| R-06 | INP <= 200ms | Core Web Vitals | Yes (Lighthouse) |
| R-07 | CLS <= 0.1 | Core Web Vitals | Yes (Lighthouse) |
| R-08 | Lighthouse Performance >= 90 | Google Lighthouse | Yes |
| R-09 | No N+1 queries | Backend Performance | Yes (query analysis) |
| R-10 | Database query p95 < 100ms | Backend Performance | Yes (query monitoring) |
| R-11 | Resource saturation < 80% under normal load | SRE Golden Signals | Yes (monitoring) |
| R-12 | Graceful degradation under failure | ISO 25010 Fault Tolerance | Partial (chaos testing) |
| R-13 | Recovery time < 1 hour | DORA MTTR | Yes (runbook testing) |
| R-14 | Total page weight < 1.5MB | Performance Budget | Yes (Lighthouse) |
| R-15 | JavaScript bundle < 300KB gzipped | Performance Budget | Yes (build analysis) |

### Level 3: Code Quality & Maintainability

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| Q-01 | Test coverage >= 80% | ISO 25010 Maintainability, Google Eng Practices | Yes |
| Q-02 | No code complexity hotspots (cyclomatic > 10) | ISO 25010 Maintainability, Google "Complexity" | Yes (ESLint) |
| Q-03 | Consistent naming conventions | Google "Naming" | Yes (ESLint) |
| Q-04 | No dead code or unused exports | ISO 25010 Maintainability | Yes (SAST) |
| Q-05 | Type safety (strict TypeScript, no `any`) | ISO 25010 Functional Correctness | Yes (tsc --strict) |
| Q-06 | No linting errors or warnings | Google "Style" | Yes (ESLint) |
| Q-07 | Dependencies up to date (no known vulnerabilities) | OWASP ASVS V14 | Yes (Dependabot) |
| Q-08 | Modular architecture (low coupling, high cohesion) | ISO 25010 Modularity, Google "Design" | Partial (architecture tests) |
| Q-09 | Documentation coverage (public APIs documented) | Google "Documentation" | Partial (JSDoc coverage) |
| Q-10 | No TODO/FIXME/HACK in production code | Code hygiene | Yes (grep) |

### Level 4: Accessibility

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| A-01 | Lighthouse Accessibility score >= 90 | WCAG 2.1, Lighthouse | Yes |
| A-02 | Color contrast ratio >= 4.5:1 (text), >= 3:1 (large/non-text) | WCAG 1.4.3, 1.4.11 | Yes (axe-core) |
| A-03 | All images have alt text | WCAG 1.1.1 | Yes (axe-core) |
| A-04 | All forms have labels | WCAG 1.3.1, 3.3.2 | Yes (axe-core) |
| A-05 | Keyboard navigation works for all interactive elements | WCAG 2.1.1 | Partial (automated + manual) |
| A-06 | Focus indicators visible | WCAG 2.4.7 | Partial |
| A-07 | Heading hierarchy correct (no skipped levels) | WCAG 1.3.1 | Yes (axe-core) |
| A-08 | Language attribute set on HTML element | WCAG 3.1.1 | Yes |
| A-09 | ARIA roles and properties correct | WCAG 4.1.2 | Yes (axe-core) |
| A-10 | Content reflows at 320px width without horizontal scroll | WCAG 1.4.10 | Partial |
| A-11 | Error messages identify the error in text | WCAG 3.3.1 | Manual |
| A-12 | Captions for video content | WCAG 1.2.2 | Manual |

### Level 5: Privacy & Data Protection

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| P-01 | Consent captured before data processing | GDPR Art. 6-7 | Yes (integration test) |
| P-02 | Consent is granular (per-purpose) | GDPR Art. 7 | Manual + integration |
| P-03 | Consent withdrawal mechanism exists and works | GDPR Art. 7(3) | Yes (integration test) |
| P-04 | Data subject access request (DSAR) mechanism | GDPR Art. 15 | Yes (API test) |
| P-05 | Right to erasure / data deletion works | GDPR Art. 17 | Yes (integration test) |
| P-06 | Data export in machine-readable format | GDPR Art. 20 | Yes (API test) |
| P-07 | Data retention policies defined and enforced | GDPR Art. 5(1)(e) | Partial (audit) |
| P-08 | No PII in logs | GDPR, logging standards | Yes (log scanning) |
| P-09 | Encryption at rest for personal data | GDPR Art. 32 | Yes (config audit) |
| P-10 | Data processing register maintained | GDPR Art. 30 | Manual (documentation) |

### Level 6: Observability & Operations

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| O-01 | Structured logging (JSON) with correlation IDs | SRE, observability best practices | Yes (log analysis) |
| O-02 | All four golden signals monitored (latency, traffic, errors, saturation) | Google SRE | Yes (monitoring config audit) |
| O-03 | Distributed tracing implemented (W3C Trace Context / OpenTelemetry) | Observability best practices | Yes (trace presence test) |
| O-04 | Alerting on SLOs, not raw metrics | SRE, alerting best practices | Partial (config audit) |
| O-05 | Runbooks exist for all P1/P2 alerts | SRE | Manual (documentation) |
| O-06 | Log retention meets compliance requirements (30d/90d/1y) | GDPR, compliance | Yes (config audit) |
| O-07 | Health check endpoints exist and are monitored | ISO 25010 Availability | Yes (integration test) |
| O-08 | Error tracking with stack traces (but not exposed to users) | OWASP ASVS V7 | Yes |
| O-09 | Database monitoring (slow queries, connection pool, replication lag) | Backend operations | Yes (monitoring config) |
| O-10 | Dependency health monitoring (third-party APIs, circuit breakers) | OWASP API10, reliability | Yes (integration test) |

### Level 7: DevOps & Delivery

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| D-01 | CI pipeline exists and runs on every PR | DORA | Yes (CI config audit) |
| D-02 | All tests run in CI before merge | DORA, Google Eng Practices | Yes |
| D-03 | Deployment frequency >= weekly | DORA (High tier) | Yes (deploy log analysis) |
| D-04 | Lead time for changes < 1 week | DORA (High tier) | Yes (commit-to-deploy analysis) |
| D-05 | Change failure rate < 15% | DORA (Elite tier) | Yes (deploy log analysis) |
| D-06 | Rollback capability exists and tested | DORA MTTR, ISO 25010 Recoverability | Partial |
| D-07 | Infrastructure as code (reproducible environments) | DevOps best practices | Yes (IaC audit) |
| D-08 | Staging environment mirrors production | DevOps best practices | Partial |
| D-09 | Database migrations are reversible | ISO 25010 Recoverability | Manual |
| D-10 | Feature flags for progressive rollout | Release engineering | Yes (config audit) |

### Level 8: API Design & Documentation

| # | Check | Source Framework | Automatable |
|---|-------|-----------------|-------------|
| I-01 | API documentation is complete and accurate (OpenAPI/Swagger) | OWASP API9, Google "Documentation" | Yes (schema validation) |
| I-02 | API versioning strategy implemented | OWASP API9 | Yes (route analysis) |
| I-03 | Consistent error response format across all endpoints | ISO 25010 Interaction Capability | Yes (schema validation) |
| I-04 | Pagination on all list endpoints | OWASP API4, performance | Yes (API test) |
| I-05 | No overfetching (response fields match documentation) | OWASP API3 | Yes (schema validation) |
| I-06 | Deprecated endpoints clearly marked with sunset dates | OWASP API9 | Partial |
| I-07 | CORS properly configured (no wildcard in production) | OWASP API8, ASVS V14 | Yes (header scan) |
| I-08 | Request/response validation against schema | OWASP API3, ASVS V5 | Yes (middleware audit) |

---

## Framework Cross-Reference Matrix

This shows how the 10 source frameworks overlap and complement each other.

| Audit Dimension | OWASP ASVS | ISO 25010 | Google Eng | DORA | CWE/SANS | WCAG | Performance | GDPR | API Top 10 | Observability |
|----------------|------------|-----------|------------|------|----------|------|-------------|------|------------|---------------|
| Authentication | V2 | Security | -- | -- | #14,#22,#25 | -- | -- | -- | API2 | -- |
| Authorization | V4 | Security | -- | -- | #9,#15,#18 | -- | -- | -- | API1,3,5 | -- |
| Input Validation | V5 | Security | -- | -- | #1,#3,#7,#12 | -- | -- | -- | -- | -- |
| Cryptography | V6 | Security | -- | -- | -- | -- | -- | GDPR Art.32 | -- | -- |
| Error/Logging | V7 | Reliability | -- | -- | -- | -- | -- | -- | API8 | Golden Signals |
| Data Protection | V8 | Security | -- | -- | #17 | -- | -- | GDPR Art.5-32 | -- | Logging |
| Communications | V9 | Security | -- | -- | -- | -- | -- | GDPR Art.32 | -- | -- |
| Business Logic | V11 | Func. Suitability | Functionality | -- | -- | -- | -- | -- | API6 | -- |
| Files/Resources | V12 | Security | -- | -- | #5,#10 | -- | -- | -- | API7 | -- |
| API Security | V13 | Compatibility | -- | -- | -- | -- | -- | -- | API1-10 | -- |
| Configuration | V14 | Maintainability | Style | -- | -- | -- | -- | -- | API8,9 | -- |
| Performance | -- | Perf. Efficiency | -- | -- | #24 | -- | CWV, LH | -- | API4 | Golden Signals |
| Accessibility | -- | Interaction Cap. | -- | -- | -- | WCAG 2.1 | LH A11y | -- | -- | -- |
| Delivery | -- | -- | -- | DORA 4 | -- | -- | -- | -- | -- | -- |
| Code Quality | -- | Maintainability | Design, Complexity, Tests | DORA CFR | -- | -- | -- | -- | -- | -- |
| Privacy | V8 | Security | -- | -- | -- | -- | -- | GDPR full | -- | Logging |
| Observability | V7 | Reliability | -- | DORA MTTR | -- | -- | -- | -- | -- | 3 Pillars |

---

## Summary: What a World-Class Audit System Must Cover

A truly comprehensive audit system must span **8 dimensions** with **93 specific checks**:

1. **Security** (20 checks) - OWASP ASVS + CWE Top 25 + API Top 10
2. **Reliability & Performance** (15 checks) - Core Web Vitals + SRE Golden Signals + backend metrics
3. **Code Quality & Maintainability** (10 checks) - ISO 25010 + Google Eng Practices
4. **Accessibility** (12 checks) - WCAG 2.1 AA
5. **Privacy & Data Protection** (10 checks) - GDPR
6. **Observability & Operations** (10 checks) - SRE + OpenTelemetry
7. **DevOps & Delivery** (10 checks) - DORA metrics
8. **API Design & Documentation** (8 checks) - OWASP API9 + REST best practices

**Automation potential**: ~70% of checks are fully automatable, ~20% are partially automatable,
~10% require manual review.

**Scoring model**: Each dimension should produce a 0-100 score. The overall audit score
should be a weighted composite, with Security and Reliability weighted highest.
