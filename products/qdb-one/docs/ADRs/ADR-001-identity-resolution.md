# ADR-001: Identity Resolution — Custom Master Person Index

**Status**: Accepted
**Date**: February 15, 2026
**Deciders**: CEO, Architecture Practice
**Category**: Identity

---

## Context

QDB operates three portals (Financing, Advisory, Guarantees) with independent databases and user models. The same physical person may exist as three separate records with no shared identifier. For example, "Fatima Al-Kuwari" appears as customer C-1234 in financing_core (CR-based), user U-5678 in advisory_main (email-based), and signatory S-9012 in guarantee_main (NAS-based).

QDB One requires a unified identity to present a single dashboard and enable cross-portal navigation. We must decide how to reconcile identity across systems that were never designed to share it.

The entity count is estimated at fewer than 100,000 unique persons and organizations.

## Decision

Build a **custom Master Person Index (MPI)** as a standalone PostgreSQL-backed service. The MPI maintains a "golden record" for every person and organization, using a multi-tier matching algorithm:

1. **Deterministic matching** on QID, NAS ID, and CR Number (100% confidence)
2. **Semi-deterministic matching** on Email + Last Name (90% confidence)
3. **Probabilistic matching** with Arabic name transliteration handling using Levenshtein distance and phonetic matching
4. **Manual review queue** for matches between 70-85% confidence, resolved by Data Stewards
5. **Auto-link** for matches above 95% confidence with audit trail

Golden record survivorship rules determine which field values win when records are merged (government-verified names take precedence, most recently OTP-verified email wins, MOCI is authoritative for CR data).

## Consequences

### Positive
- Full control over matching logic, particularly important for Arabic name handling (transliteration variants, definite article normalization, patronymic chains)
- Lower cost than enterprise MDM platforms ($500K+/year licensing avoided)
- Data model tailored to QDB's exact person-organization-role structure
- Golden record survivorship rules enforceable at the application level
- Merge history provides full audit trail for compliance

### Negative
- Higher development effort (estimated 8-12 person-months)
- Must invest in Arabic name matching capability (specialized library or custom transliteration normalization tables)
- Must build and staff a Data Steward review workflow (2-5 staff)
- Ongoing data stewardship is required — this is not a one-time migration activity
- If entity count grows significantly (unlikely for QDB), may need to migrate matching engine to enterprise MDM

### Risks
- Arabic name matching may produce high false positive rates. **Mitigation**: Benchmark against 1,000 real name pairs before production; set conservative auto-link threshold (95%+); route 70-95% to manual review.
- MPI could become a single point of failure. **Mitigation**: PostgreSQL HA with streaming replication; read replicas for query workloads.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Require Re-registration** | Clean data, no matching needed | Terrible UX, user resistance, data loss | Unacceptable user experience for a financial institution |
| **B. SSO Only (no identity linking)** | Simpler, faster | Does not solve the core problem | Users still see separate contexts per portal |
| **C. Custom MPI** (selected) | Full control, tailored to QDB | Development effort | Best fit for QDB's scale and requirements |
| **D. Informatica MDM** | Industry leader, proven in banking | $500K+/year, vendor lock-in, heavy | Scale does not justify cost |
| **E. IBM InfoSphere MDM** | QDB uses IBM (per case study) | Complex, expensive | Explore in Phase 2+ if matching complexity demands it |
