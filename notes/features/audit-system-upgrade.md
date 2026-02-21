# Feature: Audit System Upgrade

## Problem
The audit system was catching issues that development agents didn't prevent.
Root cause analysis revealed two problems:
1. The audit itself was only covering ~60% of industry best practices
2. Development agents had no audit-awareness during coding

## Research
Compared our audit against 10 industry frameworks:
- OWASP ASVS (286 requirements), OWASP API Top 10 (2023)
- ISO 25010 (9 quality characteristics), CWE/SANS Top 25
- WCAG 2.1 AA, GDPR, DORA Metrics, SRE Golden Signals
- Google Engineering Practices, Core Web Vitals

Full research: `notes/features/software-product-audit-research.md`

## Gaps Found in Audit

| Missing Dimension | Framework | Impact |
|-------------------|-----------|--------|
| Accessibility | WCAG 2.1 AA | Legal liability, excludes users |
| Privacy & Data Protection | GDPR | No systematic privacy checks |
| Observability | SRE Golden Signals | Can't measure anything in prod |
| API Design | OWASP API Top 10 | API-specific risks unchecked |
| OWASP ASVS coverage | ASVS L2 (14 categories) | Only checked Top 10, not full standard |
| CWE/SANS Top 25 | CWE 2024 | No weakness coverage tracking |
| DORA Metrics | DORA | No delivery health measurement |
| Performance thresholds | Core Web Vitals | Vague criteria, no pass/fail |

## Changes Made

### Audit Command (`.claude/commands/audit.md`)
- Expanded from 7 to 11 technical dimensions
- Added: Accessibility, Privacy, Observability, API Design
- Added OWASP ASVS L2 and CWE/SANS Top 25 to Security checks
- Added OWASP API Security Top 10 (2023) as explicit checklist
- Added concrete performance thresholds (p95, Core Web Vitals, bundle budgets)
- Added DORA metrics to DevOps dimension
- Added ISO 25010 mapping to Architecture
- Updated compliance section with WCAG, GDPR, DORA, API Top 10 tables
- Updated summary template with all 11 dimensions
- Added framework coverage summary requirement
- Added exploration agents for accessibility and privacy/observability
- Updated readiness score weights to include new dimensions

### Agent Briefs (shift-left)
- **Backend Engineer**: Added security patterns (timing-safe, fail-closed, BOLA/BFLA),
  privacy (no PII in logs, soft delete), observability (structured logging),
  API design (RFC 7807, bounded pagination)
- **Frontend Engineer**: Added WCAG 2.1 AA checklist (contrast, alt text, keyboard,
  focus, headings, ARIA), XSS prevention, performance, privacy
- **QA Engineer**: Added DB state verification, edge case coverage,
  accessibility testing, performance baseline
- **Security Engineer**: Added full OWASP API Top 10 checklist,
  CWE/SANS Top 25 applicable items, cryptographic safety patterns
