# ADR-002: Authentication — NAS-Backed QDB Login

**Status**: Accepted (CEO Direction)
**Date**: February 15, 2026
**Deciders**: CEO (directive), Architecture Practice
**Category**: Authentication

---

## Context

QDB currently operates three separate authentication methods across portals: CR-based login (Financing), email-based login (Advisory), and NAS login (Guarantees). Users must remember which method corresponds to which portal. This fragmentation is the primary source of support tickets and user confusion.

The CEO directed: consolidate to **one QDB Login** backed by NAS as the identity backbone. No more maintaining multiple authentication methods.

## Decision

Implement a **consolidated QDB Login** backed by the National Authentication System (NAS) using **Keycloak** as the gateway:

1. **Single login page** at `qdb.qa/auth/login` with two options:
   - "Sign in with QDB Login" (NAS delegation) for QID holders (~90-95% of users)
   - "Sign in as Foreign Shareholder" (QDB Foreign ID + email OTP) for non-QID holders (~3-8%)

2. **Keycloak configuration**: Single realm `qdb-one`, single identity provider (NAS via SAML 2.0 or OIDC), custom post-login mapper for QID-to-MPI lookup.

3. **Post-authentication enrichment**: After NAS returns QID, the system performs MPI lookup, MOCI CR lookup, persona loading, and JWT session token creation.

4. **QDB Foreign ID (QFI)**: Lightweight credential issued by QDB for foreign shareholders. RM-initiated onboarding with passport verification and video KYC. Email OTP login. Annual re-verification.

5. **Three-phase migration**: Wave 1 (pre-launch deterministic linking ~60-70%), Wave 2 (first-login linking ~30-40%), Wave 3 (manual linking ~10-20%). Legacy logins run in parallel for 9 months.

6. **MFA piggybacking**: NAS handles MFA. QDB One supports step-up authentication by requesting higher assurance levels from NAS via `acr_values`.

## Consequences

### Positive
- Users remember one login method instead of three
- QID provides 100% deterministic MPI matching (the strongest possible key)
- QDB offloads credential management and MFA to NAS (government infrastructure)
- QDB is not liable for password security — NAS is the credential authority
- Keycloak role simplifies from "broker for 3 IDPs" to "NAS gateway + session management"
- No custom Keycloak SPI needed (standard SAML/OIDC to NAS)

### Negative
- 3-6 month migration period with parallel login systems
- Foreign shareholders require a separate credential system (QFI)
- NAS becomes a single point of failure for authentication — no alternative login for QID holders if NAS is down
- Must handle edge cases: users without QID, system/API accounts, orphaned email-only accounts
- Legacy login endpoints must run in parallel for ~9 months

### Risks
- NAS availability issues block all authentication for QID holders. **Mitigation**: Display "NAS unavailable" message; escalate through government channels. This is the accepted cost of consolidation.
- User resistance to changing login method. **Mitigation**: 3-phase migration with 9-month parallel operation; "Switch to QDB Login" banner; RM support for high-value clients.

## Alternatives Considered

| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| **A. Federate all 3 logins** | No user disruption | Maintains complexity, 3 auth systems to maintain, identity linking still complex | CEO rejected — maintains the problem |
| **B. Consolidate to NAS** (selected) | One login, government-grade identity, deterministic matching | Migration effort for existing users | Best long-term solution |
| **C. Build custom QDB SSO** | Full control | Massive security liability, reinventing auth | Unacceptable risk for a financial institution |
