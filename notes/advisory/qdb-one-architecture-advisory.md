# QDB One: Unified Portal Architecture Advisory

**Prepared for**: Qatar Development Bank (QDB)
**Prepared by**: ConnectSW Architecture Practice
**Date**: February 15, 2026
**Classification**: Confidential - Internal Use Only
**Version**: 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Layer 1: Identity & Master Person Index](#layer-1-identity--master-person-index)
4. [Layer 2: Authentication (AuthN)](#layer-2-authentication-authn)
5. [Layer 3: Authorization (AuthZ)](#layer-3-authorization-authz)
6. [Layer 4: Data Layer](#layer-4-data-layer)
7. [Layer 5: Integration Layer](#layer-5-integration-layer)
8. [Layer 6: API Layer](#layer-6-api-layer)
9. [Layer 7: Presentation / Channel Layer](#layer-7-presentation--channel-layer)
10. [Layer 8: Data Migration & Transition Strategy](#layer-8-data-migration--transition-strategy)
11. [Layer 9: Observability & Operations](#layer-9-observability--operations)
12. [Layer 10: Security & Compliance](#layer-10-security--compliance)
13. [Cross-Cutting Concerns](#cross-cutting-concerns)
14. [Architecture Decision Records](#architecture-decision-records)
15. [Phased Roadmap](#phased-roadmap)
16. [Appendix: Technology Reference](#appendix-technology-reference)

---

## Executive Summary

Qatar Development Bank currently operates multiple portals, each serving distinct user communities: lending clients, SME advisory clients, guarantee program participants, and external stakeholders. Each portal maintains its own database, authentication mechanism, and user model. The same physical person -- a business owner, for example -- may appear as a "customer" in the Direct Financing portal, a "stakeholder" in the Advisory Services portal, and an "authorized signatory" in the Guarantee portal, each with a separate login, separate profile, and no cross-portal awareness.

**QDB One** aims to unify these portals into a single coherent application where a user logs in once, sees all their relationships with QDB in a single dashboard, and can move fluidly between services without re-authenticating or maintaining separate identities.

This is not a simple SSO project. The core architectural challenge is **identity reconciliation across systems that were never designed to share identity**. The many-to-many relationship between people, organizations, and roles across portals requires a Master Person Index (MPI) strategy, a federated authentication layer, a relationship-based authorization model, and a data layer that can present a unified view without requiring immediate database consolidation.

### Recommended Approach Summary

| Concern | Recommendation |
|---------|---------------|
| Identity | Master Person Index with probabilistic + deterministic matching |
| Authentication | Consolidated QDB Login backed by NAS (one login, not three) |
| Authorization | Hybrid ReBAC + RBAC using OpenFGA |
| Data | Database federation with CQRS read models (no premature consolidation) |
| Integration | Event-driven mesh with Apache Kafka |
| API | GraphQL Federation with BFF per client type |
| Presentation | Module Federation micro-frontends |
| Migration | Strangler Fig pattern with parallel-run validation |
| Compliance | Qatar PDPPL-aligned with full audit trail |

### Estimated Total Effort

| Phase | Duration | Risk |
|-------|----------|------|
| Phase 0: Foundation (MPI + Auth) | 4-6 months | Medium |
| Phase 1: First Portal Integration | 3-4 months | Medium |
| Phase 2: Remaining Portal Integrations | 6-8 months | Medium-High |
| Phase 3: Legacy Decommission | 4-6 months | Low |
| **Total** | **17-24 months** | |

---

## Current State Analysis

### Portal Landscape (Inferred)

```
+-------------------+     +-------------------+     +-------------------+
|  Direct Financing |     | Advisory Services |     |  Guarantee Portal |
|      Portal       |     |      Portal       |     |                   |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
    +----v----+              +-----v-----+             +------v------+
    |  DB-1   |              |   DB-2    |             |    DB-3     |
    | (Loans, |              | (Advisory,|             | (Guarantees,|
    | Clients)|              |  SMEs)    |             |  Signatories|
    +---------+              +-----------+             +-------------+

    Auth: CR Login            Auth: Email              Auth: NAS Login
```

### Core Problems

1. **Identity Fragmentation**: "Ahmed Al-Thani" exists as 3 separate records across 3 databases, with no shared identifier
2. **Authentication Confusion**: Users must remember which login method maps to which portal
3. **No Cross-Portal Visibility**: A relationship manager cannot see that their lending client is also in the guarantee program
4. **Duplicate Data Entry**: The same company information is entered repeatedly across portals
5. **Inconsistent Data**: Address updated in one portal remains stale in others
6. **Integration Brittleness**: External integrations (QFC, MOCI) are implemented independently per portal

---

## Layer 1: Identity & Master Person Index

### The Problem

The fundamental challenge is that QDB's portals were built independently, each modeling "a person" or "an organization" differently:

- Portal A stores `customer_id`, `cr_number`, `company_name`, `contact_email`
- Portal B stores `user_id`, `email`, `full_name`, `organization`
- Portal C stores `signatory_id`, `national_id`, `nas_id`, `company_cr`

The same person -- Fatima Al-Kuwari, CR 12345, NAS ID QA-67890, email fatima@company.qa -- is three separate database rows with no link between them.

### Solution: Enterprise Master Person Index (EMPI)

Build a Master Person Index as a standalone service that maintains the "golden record" for every person and organization that interacts with QDB, regardless of which portal they came from.

#### Data Model

```
+------------------+       +----------------------+       +------------------+
|     PERSON       |       |   PERSON_IDENTITY    |       |   ORGANIZATION   |
+------------------+       +----------------------+       +------------------+
| person_id (UUID) |<---+  | identity_id (UUID)   |  +--->| org_id (UUID)    |
| golden_first_name|    |  | person_id (FK)       |  |    | golden_name      |
| golden_last_name |    +--| source_system        |  |    | cr_number        |
| golden_email     |       | source_id            |  |    | establishment_dt |
| golden_phone     |       | identifier_type      |  |    | status           |
| confidence_score |       | identifier_value     |  |    | industry_code    |
| created_at       |       | verified_at          |  |    +------------------+
| updated_at       |       | confidence           |  |
| merge_history    |       +----------------------+  |
+------------------+                                 |
        |                                            |
        |           +----------------------+         |
        +---------->|   PERSON_ORG_ROLE    |<--------+
                    +----------------------+
                    | role_id (UUID)        |
                    | person_id (FK)        |
                    | org_id (FK)           |
                    | role_type             |
                    |   (customer,          |
                    |    stakeholder,       |
                    |    signatory,         |
                    |    guarantor,         |
                    |    authorized_rep)    |
                    | source_portal        |
                    | effective_from       |
                    | effective_to         |
                    | status               |
                    +----------------------+
```

#### Correlation Keys

The MPI uses multiple correlation keys to match records across portals:

| Key | Type | Confidence | Notes |
|-----|------|-----------|-------|
| CR Number | Deterministic | 100% | Unique per company, best corporate match |
| NAS ID | Deterministic | 100% | National identity, best personal match |
| QID (Qatar ID) | Deterministic | 100% | Strongest personal identifier |
| Email | Semi-deterministic | 85% | May be shared/changed; confirm with second factor |
| Phone + Name | Probabilistic | 70% | Fuzzy matching required (Arabic name variants) |
| Company Name + CR | Deterministic | 95% | Combined match for organization dedup |

#### Matching Algorithm

```
MATCH PIPELINE:

1. EXACT MATCH (Deterministic)
   - CR Number match  --> immediate link, confidence 100%
   - NAS ID match     --> immediate link, confidence 100%
   - QID match        --> immediate link, confidence 100%

2. STRONG MATCH (Semi-deterministic)
   - Email + Last Name match  --> auto-link, confidence 90%
   - Phone + CR Number match  --> auto-link, confidence 95%

3. FUZZY MATCH (Probabilistic)
   - Levenshtein distance on Arabic/English name variants
   - Phonetic matching (Soundex adapted for Arabic)
   - Address normalization and matching
   - If composite score > 85% --> flag for manual review
   - If composite score > 95% --> auto-link with audit log

4. MANUAL REVIEW QUEUE
   - Matches between 70-85% confidence
   - Presented to data steward with side-by-side comparison
   - Decision logged with justification
```

#### Arabic Name Handling

Arabic names present unique deduplication challenges:

- **Transliteration variants**: Mohammed / Muhammad / Mohamed / Muhammed
- **Name ordering**: Family name first vs. given name first
- **Patronymic chains**: Ahmed bin Khalid bin Mohammed Al-Thani
- **Definite article**: Al-Thani vs. Thani vs. al-thani

**Recommendation**: Use a specialized Arabic name matching library (such as Rosette by Basis Technology or custom-built transliteration normalization tables) alongside standard Levenshtein matching. Maintain a **canonical Arabic form** as the golden record, with all transliterations stored as aliases.

#### Golden Record Survivorship Rules

When the same person is found across portals, which data wins?

| Field | Survivorship Rule |
|-------|------------------|
| Legal Name | Most recently verified by government ID (NAS/QID) |
| Email | Most recently confirmed via OTP/verification |
| Phone | Most recently confirmed via SMS OTP |
| Address | Most recently updated, prefer government-verified |
| CR Number | Authoritative from MOCI integration |
| Organization Name | Authoritative from CR registry |

#### Technology Options for MPI

| Option | Pros | Cons | Recommendation |
|--------|------|------|---------------|
| **Custom-built MPI** (PostgreSQL + matching service) | Full control, lower license cost, tailored to QDB | Higher development effort, must build matching | **Recommended for Phase 0** |
| **Informatica MDM** | Industry leader, proven in banking | Expensive licensing, vendor lock-in, heavy | Consider for Phase 2+ if scale demands |
| **IBM InfoSphere MDM** | QDB already uses IBM (per case study) | Complex, expensive | Explore if IBM relationship favorable |
| **Reltio MDM** | Cloud-native, AI matching | May not meet data residency requirements | Not recommended initially |

**Recommendation**: Start with a custom-built MPI service using PostgreSQL. The QDB scale (likely tens of thousands, not millions, of entities) does not require an enterprise MDM platform in Phase 0. If matching complexity grows, migrate the matching engine to Informatica or IBM in a later phase. The data model above remains the same regardless of engine.

---

## Layer 2: Authentication (AuthN)

### The Problem

Users currently face three separate login experiences (CR Login, NAS Login, Email Login) across different portals. This is confusing and fragmented.

### CEO Direction: Consolidate to One QDB Login

**Decision**: Kill the three-login problem entirely. Consolidate to **one QDB Login** backed by NAS (National Authentication System) as the identity backbone. No more CR-only login, no more email-only login. One login. One identity.

### Solution: QDB Login (NAS-Backed Unified Authentication)

```
                    +----------------------------+
                    |       QDB One Login         |
                    |     (Single Login Page)     |
                    +-------------+--------------+
                                  |
                    +-------------v--------------+
                    |      Keycloak / IAM         |
                    |                             |
                    |  Primary: NAS Delegation    |
                    |  (SAML 2.0 / OIDC to NAS)  |
                    |                             |
                    |  Identity Enrichment:       |
                    |  - QID from NAS             |
                    |  - CR from MOCI lookup      |
                    |  - Email from QDB profile   |
                    +-------------+--------------+
                                  |
                    +-------------v--------------+
                    |    Master Person Index      |
                    |  (maps QID to all portal    |
                    |   accounts automatically)   |
                    +----------------------------+
```

#### Why NAS as the Backbone

| Factor | NAS-Backed QDB Login | Keep Multiple Logins |
|--------|---------------------|---------------------|
| User experience | One login, zero confusion | "Which login do I use?" |
| Identity strength | QID-verified (government-grade) | Mixed confidence levels |
| MPI matching | 100% deterministic (QID is unique) | Probabilistic matching needed |
| Security | NAS handles MFA, biometrics | QDB must build/maintain MFA |
| Compliance | Government-standard authentication | QDB liable for password security |
| Maintenance | NAS team maintains auth infrastructure | QDB maintains 3 auth systems |

#### The Consolidated Login Flow

```
+-----------------------------------------------+
|           Welcome to QDB One                   |
|                                                |
|        [Sign in with QDB Login]                |
|                                                |
|  Powered by Qatar National Authentication      |
+-----------------------------------------------+
         |
         v
+-----------------------------------------------+
|           NAS Login Page                       |
|                                                |
|  QID / Civil ID Number: [_______________]      |
|  Password: [_______________]                   |
|                                                |
|  [Login]                                       |
|                                                |
|  [Biometric Login]  [Smart Card Login]         |
+-----------------------------------------------+
         |
         v  (NAS authenticates, returns QID + verified name)
         |
+-----------------------------------------------+
|        QDB One — Post-Auth Enrichment          |
|                                                |
|  1. Receive QID from NAS                       |
|  2. MPI lookup: QID → all linked portal IDs    |
|  3. MOCI lookup: QID → CR numbers (companies)  |
|  4. Build session with all personas             |
|  5. Redirect to QDB One dashboard              |
+-----------------------------------------------+
```

#### Migration: Moving Existing Users to QDB Login

Existing portal users have CR-only or email-only accounts. Migration plan:

```
MIGRATION WAVE 1: Deterministic Linking (before launch)
  - For every existing portal account that has a QID/NAS ID stored:
    → Pre-link to MPI person record
    → User logs in with NAS, instantly sees all their portal data
  - Expected coverage: ~40-60% of users

MIGRATION WAVE 2: First-Login Linking (at launch)
  - User logs in with NAS for the first time
  - System checks: "Do we have a portal account matching this QID?"
  - If yes: auto-link, show confirmation
  - If no match by QID, try CR number (from MOCI lookup):
    "We found a Financing Portal account under CR 12345.
     Is this your company?" → [Yes, link it] [No, not me]
  - Expected coverage: ~30-40% of remaining users

MIGRATION WAVE 3: Manual Claim (post-launch)
  - User logs in with NAS but has orphan portal accounts
    (e.g., email-only account with no QID stored)
  - User goes to Settings → "Link Existing Accounts"
  - Enters email or CR number from old portal
  - Receives OTP on that email → confirms ownership
  - Account linked to QDB Login identity
  - Expected coverage: remaining ~10-20%

SUNSET TIMELINE:
  Month 1-3:  QDB Login available alongside legacy logins
  Month 4-6:  Legacy logins show "Switch to QDB Login" banner
  Month 7-9:  Legacy logins disabled for new sessions
              (existing sessions grandfathered)
  Month 10:   All legacy login endpoints decommissioned
```

#### What About Users Without QID? (Foreign Shareholders)

The CEO confirmed this is a **small minority** — primarily foreign shareholders who hold equity in Qatari companies but don't have a Qatar ID. They still need access to the Guarantee portal and potentially Financing.

**Strategy: QDB-Issued Credential with Passport Verification**

```
FOREIGN SHAREHOLDER FLOW:

1. ONBOARDING (one-time, done by QDB relationship manager)
   - RM creates "Foreign Shareholder" record in MPI
   - Inputs: Passport number, nationality, full name, email, phone
   - Links to: Organization(s) they hold shares in (via CR number)
   - Verification: Passport copy uploaded + video KYC or in-person
   - Result: QDB issues a "QDB Foreign ID" (QFI-XXXXXX)

2. LOGIN (ongoing)
   +-----------------------------------------------+
   |           Welcome to QDB One                   |
   |                                                |
   |        [Sign in with QDB Login]                |
   |                                                |
   |  ─── Don't have a Qatar ID? ───                |
   |  [Sign in as Foreign Shareholder]              |
   +-----------------------------------------------+
            |
            v
   +-----------------------------------------------+
   |      Foreign Shareholder Login                 |
   |                                                |
   |  QDB Foreign ID: [QFI-___________]            |
   |  Email: [________________________]            |
   |                                                |
   |  [Send OTP]                                    |
   |                                                |
   |  OTP: [______]                                 |
   |  [Login]                                       |
   +-----------------------------------------------+

3. SESSION
   - Same experience as QID users once logged in
   - Same persona switcher, same navigation
   - Permissions may be restricted (view-only for some operations
     that require QID-level identity verification for signing)

4. UPGRADE PATH
   - If foreign shareholder later obtains Qatar residency/QID:
     Settings → "Link Qatar ID" → redirects to NAS
     → QDB Foreign ID merged into QID-based identity
     → QFI credential deactivated
```

**Security for Foreign Shareholders**

| Concern | Mitigation |
|---------|-----------|
| Lower identity assurance than QID | Restrict signing authority; require co-signer with QID for high-value operations |
| Passport expiry | Annual re-verification required; account suspended if passport expires |
| Email-based OTP is weaker | Rate-limit OTP attempts; lock after 5 failures; alert RM |
| Fraud risk | RM-initiated onboarding only (no self-registration); video KYC mandatory |

**Scale**: If this is <5% of users, the QDB Foreign ID system is a lightweight overlay — a single database table in the MPI with passport-based identity, not a full second auth system.

| User Type | Login Method | Estimated % |
|-----------|-------------|-------------|
| Qatari nationals + residents (have QID) | NAS / QDB Login | ~90-95% |
| Foreign shareholders (no QID) | QDB Foreign ID + email OTP | ~3-8% |
| System/API accounts | OAuth client_credentials | ~2% |
| Delegates acting on behalf | Own QDB Login, persona switch | (subset of above) |

#### Token Strategy

After NAS authentication, Keycloak issues a QDB One JWT:

```json
{
  "sub": "mpi-person-uuid-12345",
  "iss": "https://auth.qdb.qa/realms/qdb-one",
  "iat": 1708000000,
  "exp": 1708003600,
  "auth_method": "nas",
  "qid": "28400000000",
  "nas_verified": true,

  "person": {
    "full_name_ar": "فاطمة الكواري",
    "full_name_en": "Fatima Al-Kuwari",
    "email": "fatima@company.qa",
    "cr_numbers": ["12345", "67890"]
  },

  "personas": [
    {
      "portal": "direct_financing",
      "role": "customer",
      "org_cr": "12345",
      "org_name": "Al-Kuwari Trading LLC"
    },
    {
      "portal": "advisory",
      "role": "stakeholder",
      "org_cr": "12345",
      "org_name": "Al-Kuwari Trading LLC"
    },
    {
      "portal": "guarantee",
      "role": "authorized_signatory",
      "org_cr": "67890",
      "org_name": "Qatar Tech Ventures"
    }
  ],

  "active_persona": 0,
  "mfa_level": "nas_standard"
}
```

Note: For production, keep the JWT lean — just `sub`, `qid`, `auth_method`, `mfa_level`. Fetch the full personas list from the authorization API at session start, not embedded in the token.

#### MFA Strategy

NAS already handles MFA (SMS OTP, biometric, smart card). QDB One piggybacks on NAS MFA levels:

| NAS MFA Level | QDB One Grants |
|--------------|----------------|
| Standard (password) | View-only access, non-sensitive operations |
| Enhanced (password + SMS OTP) | Submit applications, upload documents |
| High (biometric / smart card) | Sign guarantees, authorize large transactions, admin operations |

QDB One can request **step-up authentication** by redirecting back to NAS with a higher assurance level request when a user attempts a sensitive operation.

#### Technology: Keycloak as the Gateway to NAS

Keycloak remains the right choice, but its role simplifies:

| Before (3-login federation) | After (QDB Login consolidation) |
|---------------------------|-------------------------------|
| Keycloak brokers 3 IDPs | Keycloak delegates to NAS only |
| Complex identity linking at login | Simple QID-based MPI lookup |
| QDB manages passwords for CR/email | NAS manages all credentials |
| QDB liable for password breaches | NAS is the credential authority |
| Custom SPI for CR Login needed | Standard SAML/OIDC to NAS |

**Keycloak configuration**:
- Single realm: `qdb-one`
- Single identity provider: NAS (SAML 2.0 or OIDC)
- Custom post-login mapper: QID → MPI lookup → persona injection
- Service accounts: separate client_credentials flow for system integrations

---

## Layer 3: Authorization (AuthZ)

### The Problem

Traditional RBAC falls apart when:
- The same person is a "customer" in Portal A AND a "signatory" in Portal C
- The same person may be authorized to act on behalf of multiple organizations
- Permissions depend on the *relationship* between the person, the organization, and the portal context
- Delegation chains exist (e.g., CEO authorizes CFO to sign guarantees)

### Solution: Hybrid ReBAC + RBAC Using OpenFGA

Relationship-Based Access Control (ReBAC), inspired by Google's Zanzibar system, models authorization as a graph of relationships rather than static role assignments. This is the natural model for QDB's use case.

#### Authorization Model

```
// OpenFGA Authorization Model for QDB One

type person
  relations
    define self: [person]

type organization
  relations
    define owner: [person]
    define authorized_signatory: [person]
    define employee: [person]
    define financial_controller: [person]
    define viewer: [person] or employee or owner

type loan_application
  relations
    define applicant_org: [organization]
    define submitter: [person]
    define can_view: submitter or owner from applicant_org
                     or employee from applicant_org
    define can_sign: authorized_signatory from applicant_org
    define can_edit: submitter or financial_controller from applicant_org

type guarantee
  relations
    define beneficiary_org: [organization]
    define guarantor_org: [organization]
    define can_view: owner from beneficiary_org
                     or owner from guarantor_org
                     or viewer from beneficiary_org
    define can_sign: authorized_signatory from beneficiary_org

type advisory_session
  relations
    define client_org: [organization]
    define can_book: employee from client_org or owner from client_org
    define can_view: employee from client_org or owner from client_org
    define can_cancel: owner from client_org
```

#### Context Switching

The UI must support context switching when a person has multiple personas:

```
+-------------------------------------------------------+
| QDB One                          [Fatima Al-Kuwari v]  |
|                                                        |
| Currently viewing as:                                  |
| [v] Customer - Al-Kuwari Trading LLC                   |
| [ ] Authorized Signatory - Qatar Tech Ventures         |
| [ ] Stakeholder - Al-Kuwari Trading LLC                |
+-------------------------------------------------------+
|                                                        |
| Dashboard shows context-appropriate content:           |
| - Loan applications (as Customer)                      |
| - Pending signatures (visible but greyed if wrong ctx) |
| - Advisory sessions (as Stakeholder)                   |
+-------------------------------------------------------+
```

When Fatima switches context to "Authorized Signatory - Qatar Tech Ventures", the dashboard refreshes to show guarantee documents awaiting her signature, and the navigation adjusts to show guarantee-related features.

#### Delegation Pattern

QDB frequently encounters delegation scenarios:

```
DELEGATION MODEL:

1. Direct Delegation
   CEO of Company A grants "sign guarantee" permission to CFO

   Tuple: organization:company-a#authorized_signatory@person:cfo-id
   Granted by: person:ceo-id
   Expires: 2026-12-31
   Audit: "CEO delegation via board resolution #BR-2025-042"

2. Temporary Delegation (Acting Authority)
   During vacation, Manager delegates to Deputy

   Tuple: organization:company-a#financial_controller@person:deputy-id
   Condition: time-bound (2026-03-01 to 2026-03-15)
   Requires: Manager's explicit grant + audit trail

3. Organizational Hierarchy
   Parent company authorized reps can act for subsidiaries

   Tuple: organization:subsidiary#viewer@organization:parent#employee
   (Any employee of parent org can view subsidiary data)
```

#### Technology: Why OpenFGA

| Option | Pros | Cons | Recommendation |
|--------|------|------|---------------|
| **OpenFGA** | Open-source Zanzibar implementation, CNCF project, designed for ReBAC | Newer project, smaller community | **Recommended** |
| **SpiceDB** | Mature Zanzibar implementation, excellent performance | Commercial licensing for enterprise features | Strong alternative |
| **OPA (Open Policy Agent)** | Flexible, widely adopted | ABAC-oriented, ReBAC requires custom modeling | Use alongside, not instead of |
| **Custom RBAC tables** | Simple, familiar | Cannot model QDB's relationship complexity | Not recommended |

**Recommendation**: Deploy OpenFGA as the primary authorization engine. Use OPA alongside it for cross-cutting policies (e.g., "no operations allowed outside business hours for certain role types"). The combination gives both fine-grained relationship checks and policy-based rules.

---

## Layer 4: Data Layer

### The Reality: 10+ Databases, Mixed Engines

QDB's actual data landscape is not 3 clean databases — it's **10+ databases** across **Oracle, PostgreSQL, and other engines**, with partial ETL/reporting already in place. All portal codebases are in-house (full source access).

```
THE ACTUAL LANDSCAPE:

PORTAL GROUP A (Financing)          PORTAL GROUP B (Advisory/SME)
+------------------+               +------------------+
| financing_core   | Oracle        | advisory_main    | PostgreSQL
| (loans, apps,    |               | (programs,       |
|  customers)      |               |  sessions, SMEs) |
+------------------+               +------------------+
| financing_docs   | Oracle        | advisory_assess  | PostgreSQL
| (documents,      |               | (assessments,    |
|  attachments)    |               |  scores, reports)|
+------------------+               +------------------+

PORTAL GROUP C (Guarantees)         SHARED / CORPORATE
+------------------+               +------------------+
| guarantee_main   | Oracle        | corporate_crm    | Oracle
| (guarantees,     |               | (contacts, orgs, |
|  signatories)    |               |  relationships)  |
+------------------+               +------------------+
| guarantee_claims | Oracle        | hr_payroll       | ???
| (claims,         |               | (employees,      |
|  collateral)     |               |  internal users) |
+------------------+               +------------------+

INTEGRATION / REFERENCE             REPORTING
+------------------+               +------------------+
| moci_cache       | PostgreSQL    | reporting_dw     | Oracle / ???
| (CR registry     |               | (existing ETL    |
|  mirror, QFC)    |               |  aggregations)   |
+------------------+               +------------------+
| notifications_db | PostgreSQL    | audit_logs       | ???
| (email logs,     |               | (compliance,     |
|  SMS history)    |               |  trail)          |
+------------------+               +------------------+
```

**Note**: The diagram above is illustrative. The first step is to build the actual inventory (see Step 1 below).

### Strategy: Tiered Database Integration

Not all 10+ databases need the same treatment. The mistake would be trying to integrate everything at once with the same approach. Instead, **tier the databases by their role in QDB One**:

```
TIER 1: CORE IDENTITY (must integrate first — QDB One can't work without these)
┌─────────────────────────────────────────────────────────────┐
│ Databases that contain PEOPLE, ORGANIZATIONS, RELATIONSHIPS │
│                                                             │
│ These feed the Master Person Index (MPI).                   │
│ Integration method: FULL — CDC + application events         │
│ Sync: near real-time (<5 seconds)                           │
│                                                             │
│ Examples:                                                   │
│   - corporate_crm (contacts, organizations)                 │
│   - financing_core.customers table                          │
│   - guarantee_main.signatories table                        │
│   - advisory_main.users / clients table                     │
└─────────────────────────────────────────────────────────────┘

TIER 2: OPERATIONAL DATA (integrate for the unified dashboard)
┌─────────────────────────────────────────────────────────────┐
│ Databases that contain TRANSACTIONS, APPLICATIONS, STATUS   │
│                                                             │
│ These feed the unified dashboard + cross-portal views.      │
│ Integration method: EVENTS — application publishes to Kafka │
│ Sync: near real-time (<30 seconds)                          │
│                                                             │
│ Examples:                                                   │
│   - financing_core (loans, applications, payments)          │
│   - guarantee_main (guarantees, pending signatures)         │
│   - advisory_main (programs, sessions, bookings)            │
│   - guarantee_claims (claims, collateral)                   │
└─────────────────────────────────────────────────────────────┘

TIER 3: SUPPORTING DATA (integrate later, lower priority)
┌─────────────────────────────────────────────────────────────┐
│ Databases with DOCUMENTS, ASSESSMENTS, REPORTS              │
│                                                             │
│ These enrich the experience but aren't critical for launch. │
│ Integration method: API — on-demand queries via subgraph    │
│ Sync: on-demand (user requests it, we fetch it)             │
│                                                             │
│ Examples:                                                   │
│   - financing_docs (documents, attachments)                 │
│   - advisory_assess (assessments, scores)                   │
│   - notifications_db (history)                              │
└─────────────────────────────────────────────────────────────┘

TIER 4: REFERENCE / EXTERNAL (read-only, cached)
┌─────────────────────────────────────────────────────────────┐
│ Databases with EXTERNAL DATA, CACHES, REFERENCE             │
│                                                             │
│ These don't change often. Cache and refresh periodically.   │
│ Integration method: BATCH — scheduled sync (daily/hourly)   │
│ Sync: hourly or daily                                       │
│                                                             │
│ Examples:                                                   │
│   - moci_cache (CR registry mirror)                         │
│   - reporting_dw (existing aggregations — reuse, don't redo)│
│   - audit_logs (read-only for compliance queries)           │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Database Inventory (Do This First)

Before writing any integration code, build a complete inventory. For each of the 10+ databases:

```
DATABASE INVENTORY TEMPLATE:

For each database, document:

┌──────────────────────────────────────────────────────────┐
│ Database Name:     ____________________________          │
│ Engine + Version:  Oracle 19c / PostgreSQL 15 / ...      │
│ Portal/System:     Which portal owns this DB?            │
│ Size:              Rows (approx), GB on disk             │
│ Tables of Interest:                                      │
│   - Table name     | Row count  | Contains people? (Y/N)│
│   - customers      | 15,000     | Y                     │
│   - loans          | 45,000     | N (references people) │
│   - ...            |            |                        │
│ Person Identifiers: Which columns identify a person?     │
│   - customer_id (internal), cr_number, email, phone      │
│ Organization IDs:  Which columns identify an org?        │
│   - org_id (internal), cr_number, trade_license_no       │
│ Stored Procedures: How many? Do they enforce biz logic?  │
│ Triggers:          Any triggers that auto-modify data?   │
│ Existing ETL:      Is this DB already feeding a DW?      │
│ Change Frequency:  How often does data change?           │
│   - High (hundreds/day), Medium (tens/day), Low (<daily) │
│ QDB One Tier:      1 (identity) / 2 (ops) / 3 / 4       │
│ CDC Feasibility:   Can we enable CDC on this engine?     │
│   - Oracle: LogMiner/XStream available?                  │
│   - PostgreSQL: logical replication / WAL available?     │
│   - Other: what change tracking options exist?           │
└──────────────────────────────────────────────────────────┘
```

**Deliverable**: A spreadsheet with one row per database. This becomes the integration roadmap.

### Step 2: The Person/Org Correlation Map

Across 10+ databases, the same person or organization is stored differently in each. Before building anything, map the correlation keys:

```
CORRELATION MAP (example):

Person "Fatima Al-Kuwari" appears in:

Database              | Table          | Person Column(s)        | Key Value
─────────────────────-┼────────────────┼─────────────────────────┼──────────────
financing_core        | customers      | customer_id, cr_number  | C-1234, CR-555
guarantee_main        | signatories    | signatory_id, qid       | S-5678, QID-999
advisory_main         | users          | user_id, email          | U-9012, fatima@co.qa
corporate_crm         | contacts       | contact_id, phone, name | CT-3456, +974-XXX
guarantee_claims      | claimants      | claimant_id → FK sig.   | (via signatory_id)
notifications_db      | recipients     | email                   | fatima@co.qa

Common keys available:
  - QID (strongest, but only in guarantee_main and corporate_crm)
  - CR number (in financing_core — but this is company-level, not person-level)
  - Email (in advisory_main, notifications_db — person-level but changeable)
  - Phone (in corporate_crm — person-level but changeable)

MPI linking strategy for this person:
  1. QID match: guarantee_main.qid → corporate_crm.qid         ✓ deterministic
  2. CR enrichment: financing_core.cr_number → MOCI → QID      ✓ deterministic
  3. Email match: advisory_main.email → notifications_db.email  ✓ semi-deterministic
  4. Result: 5 databases linked to one MPI person record
```

### Step 3: CDC Strategy Per Database Engine

Since code is all in-house, we have two integration approaches per database:

```
APPROACH A: APPLICATION-LEVEL EVENTS (preferred when feasible)
───────────────────────────────────────────────────────────────
  Modify the portal code to publish domain events to Kafka
  when business operations occur.

  Pros:
  + Events carry business meaning (LoanApproved, not "row updated")
  + Clean, intentional data — only what QDB One needs
  + No dependency on database internals

  Cons:
  - Requires code changes in every portal
  - Might miss changes made via direct DB access (scripts, admin tools)

  Best for: Tier 2 (operational data) — loan submissions, guarantee signing,
            advisory bookings. These are code-driven operations.


APPROACH B: CHANGE DATA CAPTURE (CDC)
───────────────────────────────────────────────────────────────
  Capture database-level changes without modifying portal code.
  Debezium reads the DB transaction log and publishes to Kafka.

  Pros:
  + Catches ALL changes (including direct SQL, batch jobs, stored procedures)
  + No portal code changes needed
  + Existing data can be snapshotted for initial load

  Cons:
  - Events are row-level (INSERT/UPDATE/DELETE), not business-level
  - Requires transformation layer to make them meaningful
  - Database-engine-specific configuration

  Best for: Tier 1 (identity tables) — we need to catch EVERY change to
            person/org records, even those made via admin scripts.


RECOMMENDED: USE BOTH (Dual-Write Safety)
───────────────────────────────────────────────────────────────
  Tier 1 databases: CDC (catch everything) + application events (business context)
  Tier 2 databases: Application events (preferred) + CDC (safety net)
  Tier 3 databases: API on-demand (no streaming needed)
  Tier 4 databases: Batch sync (scheduled)
```

#### CDC Per Database Engine

| Engine | CDC Method | Tool | Setup Complexity | Notes |
|--------|-----------|------|-----------------|-------|
| **Oracle** | LogMiner | Debezium Oracle Connector | Medium-High | Requires ARCHIVELOG mode enabled. May need DBA to configure supplemental logging. Works with Oracle 11g+. |
| **Oracle** | XStream (alternative) | Debezium Oracle Connector | High | Better performance than LogMiner for high-volume tables. Requires Oracle GoldenGate license. |
| **PostgreSQL** | Logical Replication (pgoutput) | Debezium PostgreSQL Connector | Low | Native support in PG 10+. Just set `wal_level=logical` and create a publication. Easiest CDC setup. |
| **PostgreSQL** | WAL (write-ahead log) | Debezium PostgreSQL Connector | Low | Alternative to logical replication. Slightly more raw data. |
| **SQL Server** | CT (Change Tracking) | Debezium SQL Server Connector | Medium | Requires enabling CDC at database and table level. Standard in Enterprise edition. |
| **MySQL** | Binlog | Debezium MySQL Connector | Low | Read binary log. Easy setup but ensure binlog_format=ROW. |

```
CDC ARCHITECTURE FOR 10+ DATABASES:

+----------+    +----------+    +----------+    +----------+
| Oracle   |    | Oracle   |    | PG       |    | Other    |
| DB 1     |    | DB 2     |    | DB 3     |    | DB N     |
+----+-----+    +----+-----+    +----+-----+    +----+-----+
     |               |               |               |
+----v-----+    +----v-----+    +----v-----+    +----v-----+
| Debezium |    | Debezium |    | Debezium |    | Debezium |
| Oracle   |    | Oracle   |    | PG       |    | Connector|
| Connector|    | Connector|    | Connector|    | for X    |
+----+-----+    +----+-----+    +----+-----+    +----+-----+
     |               |               |               |
     +-------+-------+-------+-------+-------+-------+
             |                                |
        +----v--------------------------------v----+
        |            Apache Kafka                   |
        |                                           |
        | Topics:                                   |
        |   cdc.financing_core.customers            |
        |   cdc.financing_core.loans                |
        |   cdc.guarantee_main.signatories          |
        |   cdc.guarantee_main.guarantees           |
        |   cdc.advisory_main.users                 |
        |   cdc.corporate_crm.contacts              |
        |   ...one topic per monitored table         |
        |                                           |
        |   app.financing.loan-submitted   (app events)
        |   app.guarantee.signed           (app events)
        |   app.advisory.session-booked    (app events)
        +----+----+----+----+----+----+----+--------+
             |    |    |    |    |    |    |
             v    v    v    v    v    v    v
        +-----------------------------------------+
        |       STREAM PROCESSORS                  |
        |                                          |
        | 1. MPI Enrichment Service                |
        |    - Consumes CDC from identity tables   |
        |    - Matches person/org records           |
        |    - Updates MPI golden record           |
        |                                          |
        | 2. Dashboard Projection Service          |
        |    - Consumes app events + CDC           |
        |    - Builds materialized dashboard views |
        |    - Writes to Unified Read Store        |
        |                                          |
        | 3. Search Indexer                        |
        |    - Consumes all relevant events        |
        |    - Updates Elasticsearch index         |
        |                                          |
        | 4. Notification Router                   |
        |    - Consumes app events                 |
        |    - Generates user notifications        |
        +---------+----------+----------+----------+
                  |          |          |
           +------v---+ +---v------+ +-v-----------+
           | Unified  | | Elastic  | | Notification|
           | Read     | | Search   | | Service     |
           | Store    | |          | |             |
           | (PG 16)  | | (Arabic  | | (WebSocket  |
           |          | |  support)| |  + FCM)     |
           +----------+ +----------+ +-------------+
```

### The Unified Read Store: What Goes In It

The Unified Read Store is NOT a copy of all 10+ databases. It contains **only the cross-portal views** that QDB One needs for its dashboard and search:

```
UNIFIED READ STORE SCHEMA (PostgreSQL):

── IDENTITY VIEWS ──────────────────────────────────
person_summary
  person_id (MPI UUID)
  qid
  full_name_ar, full_name_en
  email, phone
  linked_identities JSONB    -- { financing: "C-1234", guarantee: "S-5678", ... }
  last_activity_at
  updated_at

organization_summary
  org_id (MPI UUID)
  cr_number
  name_ar, name_en
  status
  industry
  linked_systems JSONB       -- { financing: "ORG-111", guarantee: "ORG-222", ... }
  updated_at

── DASHBOARD VIEWS ─────────────────────────────────
person_dashboard_items
  item_id
  person_id (FK)
  org_id (FK)
  source_portal              -- 'financing' | 'advisory' | 'guarantee'
  item_type                  -- 'loan_application' | 'active_loan' | 'guarantee' | ...
  source_record_id           -- the ID in the source system
  status                     -- normalized status across portals
  title                      -- human-readable description
  amount                     -- if applicable
  due_date                   -- if applicable
  requires_action BOOLEAN    -- pending signature, missing docs, etc.
  action_type                -- 'sign' | 'upload' | 'review' | null
  metadata JSONB             -- portal-specific extra data
  created_at
  updated_at

  INDEX on (person_id, requires_action)  -- fast "what needs my attention" queries
  INDEX on (org_id, source_portal)       -- fast "show me everything for this company"

── NOTIFICATION VIEWS ──────────────────────────────
notifications
  notification_id
  person_id (FK)
  source_portal
  title, body
  deep_link                  -- e.g., "/guarantees/GR-789/sign"
  read BOOLEAN
  created_at

── ACTIVITY TIMELINE ───────────────────────────────
activity_feed
  activity_id
  person_id (FK)
  org_id (FK)
  source_portal
  action                     -- 'submitted', 'approved', 'signed', 'booked', ...
  description
  source_record_id
  actor_name                 -- who performed the action
  created_at

  INDEX on (person_id, created_at DESC)  -- reverse chronological feed
```

**Key design principle**: The read store uses **JSONB for portal-specific metadata**. Each portal can add its own fields to `metadata` without requiring schema migrations in the read store. The core columns (`status`, `amount`, `due_date`, `requires_action`) are normalized across all portals so the dashboard can sort and filter uniformly.

### The Data Flow: From Portal DB to Dashboard

Here's what happens end-to-end when a guarantee is created:

```
EXAMPLE: New guarantee created in Portal C

1. Portal C code creates guarantee in guarantee_main DB
   INSERT INTO guarantees (id, beneficiary_id, amount, status, ...)
   VALUES ('GR-2025-100', 'S-5678', 1000000, 'pending_signature', ...)

2. SIMULTANEOUSLY two things happen:

   2a. Portal C application publishes event:
       Topic: app.guarantee.created
       {
         "eventType": "GuaranteeCreated",
         "guaranteeId": "GR-2025-100",
         "beneficiaryId": "S-5678",
         "amount": 1000000,
         "status": "pending_signature",
         "requiredSignatories": ["S-5678", "S-9012"],
         "timestamp": "2026-02-15T10:30:00Z"
       }

   2b. Debezium CDC captures the INSERT:
       Topic: cdc.guarantee_main.guarantees
       {
         "op": "c",
         "before": null,
         "after": { "id": "GR-2025-100", "beneficiary_id": "S-5678", ... },
         "source": { "table": "guarantees", "db": "guarantee_main" }
       }

3. Dashboard Projection Service consumes app event (preferred):
   - Looks up MPI: signatory S-5678 → person_id "mpi-uuid-12345"
   - Creates dashboard item:
     INSERT INTO person_dashboard_items (
       person_id, org_id, source_portal, item_type,
       source_record_id, status, title, amount,
       requires_action, action_type
     ) VALUES (
       'mpi-uuid-12345', 'org-uuid-789', 'guarantee',
       'guarantee', 'GR-2025-100', 'pending_signature',
       'Bank Guarantee — QAR 1,000,000', 1000000,
       true, 'sign'
     );

4. Notification Router consumes same event:
   - Generates notification for each required signatory
   - Pushes via WebSocket to connected sessions
   - Sends push notification if user not online

5. Search Indexer consumes same event:
   - Updates Elasticsearch with new guarantee record

6. RESULT: Within seconds, Fatima's QDB One dashboard shows:
   "🔔 New guarantee GR-2025-100 requires your signature"
   And the Guarantees section shows the pending item.
```

### Handling the Existing ETL

QDB already has partial ETL/reporting. Don't throw it away — **reuse it**:

```
EXISTING ETL STRATEGY:

┌─────────────────────────────────────────────────────────┐
│ IF the existing ETL/DW already aggregates data that     │
│ QDB One needs (e.g., loan summaries, guarantee totals): │
│                                                         │
│   → USE IT as a Tier 4 data source                      │
│   → The Unified Read Store can query the existing DW    │
│     for historical aggregations instead of recomputing  │
│   → Don't rebuild what already works                    │
│                                                         │
│ IF the existing ETL feeds a reporting/BI tool:           │
│                                                         │
│   → Keep it running independently                       │
│   → QDB One's event pipeline is for the LIVE dashboard  │
│   → The DW/ETL is for HISTORICAL reporting              │
│   → They serve different purposes and can coexist       │
│                                                         │
│ FUTURE: Once QDB One's event pipeline is mature,        │
│ the DW can be fed FROM Kafka instead of direct ETL,     │
│ giving it near-real-time data too.                       │
└─────────────────────────────────────────────────────────┘
```

### What NOT to Put in the Unified Read Store

```
KEEP OUT:
  ✗ Full document content (PDFs, images) → use object storage (S3/MinIO)
  ✗ Complete loan amortization schedules → query Portal A on demand
  ✗ Detailed assessment reports → query Portal B on demand
  ✗ Historical audit logs → query audit DB on demand
  ✗ Employee/HR data → not customer-facing

The read store is a THIN projection layer:
  - Just enough for the dashboard cards
  - Just enough for search results
  - Just enough for notification routing
  - For detail views, the GraphQL subgraph queries the portal DB directly
```

### Data Ownership Matrix (Updated for 10+ DBs)

| Data Domain | Owner DB(s) | QDB One Tier | Sync Method | Latency |
|-------------|-------------|-------------|-------------|---------|
| Person identity | corporate_crm + all portal user tables | Tier 1 | CDC + MPI reconciliation | <5s |
| Organization identity | corporate_crm + moci_cache | Tier 1 | CDC + MOCI batch sync | <5s / daily |
| Loan applications | financing_core | Tier 2 | App events | <30s |
| Active loans + payments | financing_core | Tier 2 | App events | <30s |
| Guarantees + signatures | guarantee_main | Tier 2 | App events | <30s |
| Claims + collateral | guarantee_claims | Tier 2 | App events | <30s |
| Advisory programs + sessions | advisory_main | Tier 2 | App events | <30s |
| Documents + attachments | financing_docs, portal uploads | Tier 3 | API on-demand | Real-time query |
| Assessments + scores | advisory_assess | Tier 3 | API on-demand | Real-time query |
| CR registry data | moci_cache | Tier 4 | Batch (MOCI API → cache) | Daily |
| Existing DW aggregations | reporting_dw | Tier 4 | Read from existing DW | As-is |
| Audit trail | audit_logs | Tier 4 | QDB One writes its own audit | N/A |
| Notifications | QDB One owned | New | QDB One writes directly | Real-time |
| User preferences | QDB One owned | New | QDB One writes directly | Real-time |

### Schema Evolution Strategy

Each portal continues to evolve its schema independently. Integration handles this via:

```
FOR APPLICATION EVENTS (Tier 2):
  - Event schemas versioned: { "schemaVersion": "2.1", ... }
  - Projection service handles multiple versions
  - New fields → add to JSONB metadata (no read store schema change)
  - Breaking changes → new event type + migration period

FOR CDC EVENTS (Tier 1):
  - Debezium captures column changes automatically
  - MPI Enrichment Service maps columns by config, not code:

    # mpi-column-mapping.yml
    financing_core.customers:
      person_identifiers:
        cr_number: "column:cr_no"
        email: "column:contact_email"
      org_identifiers:
        cr_number: "column:cr_no"

    guarantee_main.signatories:
      person_identifiers:
        qid: "column:national_id"
        phone: "column:mobile_no"
      org_identifiers:
        cr_number: "column:company_cr"

  - When a portal adds/renames a column → update the mapping YAML
  - No code change needed in the enrichment service

FOR API ON-DEMAND (Tier 3):
  - GraphQL subgraph queries the portal DB directly
  - Schema changes in the portal → update the subgraph resolver
  - This is normal API maintenance, not a special integration concern
```

### Sequencing: Which Databases First

```
PHASE 0 (Foundation — months 1-6):
  ┌─────────────────────────────────────────────┐
  │ Set up Kafka cluster                        │
  │ Deploy Debezium Connect cluster             │
  │ Build MPI Service + MPI database            │
  │ Build Unified Read Store (empty schema)     │
  │                                             │
  │ Integrate Tier 1 databases:                 │
  │   1. corporate_crm (contacts, orgs)         │
  │   2. financing_core (customers table only)  │
  │   3. guarantee_main (signatories table only)│
  │   4. advisory_main (users table only)       │
  │                                             │
  │ Goal: MPI can answer "who is this person    │
  │ across all systems?" for 95%+ of users      │
  └─────────────────────────────────────────────┘

PHASE 1 (First Portal — months 7-10):
  ┌─────────────────────────────────────────────┐
  │ Integrate Tier 2 for Financing:             │
  │   - financing_core (full: loans, apps)      │
  │   - financing_docs (Tier 3: API on-demand)  │
  │                                             │
  │ Build Finance subgraph + projections        │
  │ Dashboard shows financing data              │
  └─────────────────────────────────────────────┘

PHASE 2 (Remaining Portals — months 11-16):
  ┌─────────────────────────────────────────────┐
  │ Integrate Tier 2 for Guarantees:            │
  │   - guarantee_main (full)                   │
  │   - guarantee_claims (full)                 │
  │                                             │
  │ Integrate Tier 2 for Advisory:              │
  │   - advisory_main (full)                    │
  │   - advisory_assess (Tier 3: API on-demand) │
  │                                             │
  │ Connect existing DW as Tier 4 source        │
  │ Full cross-portal dashboard operational     │
  └─────────────────────────────────────────────┘
```

### Technology Recommendations (Updated)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Unified Read Store | PostgreSQL 16 | JSONB for flexible schemas, consistent with PG portals |
| Search Index | OpenSearch 2.x | Full-text search, Arabic analyzer, dashboards for ops |
| Event Bus | Apache Kafka (Confluent or self-managed) | Durable, ordered, replayable; handles 10+ CDC connectors |
| CDC Platform | Debezium on Kafka Connect | Connectors for Oracle, PostgreSQL, SQL Server, MySQL |
| Stream Processing | Kafka Streams or custom Node.js consumers | Transform CDC events → business events → projections |
| Schema Registry | Confluent Schema Registry (or Apicurio) | Event schema versioning, compatibility checks |
| MPI Database | PostgreSQL 16 | Separate DB for the Master Person Index golden records |
| Object Storage | MinIO (on-prem) or S3-compatible | Documents, attachments — not in relational DBs |
| Caching | Redis 7 | Hot data caching for dashboard, session data |

---

## Layer 5: Integration Layer

### External Integration Map

```
+-------------------+
|     QDB One       |
+--------+----------+
         |
    +----v----+
    |   API   |
    | Gateway |
    +----+----+
         |
    +----v--------------------------------------------+
    |           Integration Bus (Kafka)                |
    +--+--------+--------+--------+--------+----------+
       |        |        |        |        |
  +----v--+ +---v---+ +--v---+ +-v----+ +-v--------+
  |  QFC  | | MOCI  | | NAS  | | CBQ  | | Ministry |
  |       | |       | |      | |      | | of Labor |
  +-------+ +-------+ +------+ +------+ +----------+
```

### QFC (Qatar Financial Centre) Integration

| Aspect | Detail |
|--------|--------|
| **Data Flow** | Bidirectional |
| **Inbound** | Company registration status, licensing status, compliance flags |
| **Outbound** | QDB financing decisions (with consent), guarantee status |
| **Frequency** | Near real-time for status changes, batch for reconciliation |
| **Protocol** | REST API (QFC provides), webhook callbacks |
| **Authentication** | Mutual TLS + API key |
| **Error Handling** | Retry with exponential backoff, dead letter queue after 5 failures |

### MOCI (Ministry of Commerce and Industry) Integration

| Aspect | Detail |
|--------|--------|
| **Data Flow** | Primarily inbound |
| **Inbound** | CR verification, company status, ownership changes, trade license status |
| **Outbound** | None (read-only consumer) |
| **Frequency** | On-demand lookup + daily batch sync for monitored CRs |
| **Protocol** | SOAP/REST (depends on MOCI API version) |
| **Authentication** | Government API gateway credentials |
| **Data Use** | CR validation, golden record enrichment, KYC verification |

### NAS (National Authentication System) Integration

| Aspect | Detail |
|--------|--------|
| **Data Flow** | Authentication delegation |
| **Protocol** | SAML 2.0 or OIDC (NAS supports both) |
| **Integration Point** | Keycloak Identity Provider configuration |
| **Data Received** | QID, verified name, nationality |
| **Error Handling** | Fallback to CR/email login if NAS unavailable |

### Integration Patterns

#### Event-Driven Integration (Preferred)

```
External System --> Webhook --> API Gateway --> Kafka Topic
                                                    |
                                               +----v----+
                                               | Consumer |
                                               | Service  |
                                               +----+----+
                                                    |
                                               +----v----+
                                               | Internal |
                                               | Event    |
                                               +---------+
```

#### Request-Response (When Needed)

For real-time lookups (e.g., "verify this CR number now"):

```
QDB One --> API Gateway --> Circuit Breaker --> External API
                                |
                           +----v----+
                           | Cache   |  (Redis, TTL based on data type)
                           | Layer   |
                           +---------+
```

#### Circuit Breaker Configuration

| External System | Failure Threshold | Recovery Timeout | Fallback |
|----------------|-------------------|-----------------|----------|
| QFC | 5 failures in 60s | 30s half-open | Return cached data + stale flag |
| MOCI | 3 failures in 60s | 60s half-open | Return cached data + manual verification flag |
| NAS | 3 failures in 30s | 15s half-open | Offer CR/email login as alternative |

#### Webhook Management

For external systems that push data to QDB:

```
+---------------------------------------------------+
|              Webhook Gateway Service               |
+---------------------------------------------------+
| - Signature verification (HMAC-SHA256)             |
| - Idempotency check (dedup by webhook ID)          |
| - Schema validation (JSON Schema per source)       |
| - Rate limiting per source                         |
| - Audit logging (every webhook logged)             |
| - Dead letter queue for processing failures        |
| - Replay capability (reprocess from DLQ)           |
+---------------------------------------------------+
```

---

## Layer 6: API Layer

### Architecture: GraphQL Federation + BFF

```
+-------------+    +-------------+    +--------------+
|  Web App    |    | Mobile App  |    | Admin Panel  |
+------+------+    +------+------+    +------+-------+
       |                  |                  |
+------v------+    +------v------+    +------v-------+
|  Web BFF    |    | Mobile BFF  |    | Admin BFF    |
| (Next.js    |    | (Optimized  |    | (Full data   |
|  API routes)|    |  payloads)  |    |  access)     |
+------+------+    +------+------+    +------+-------+
       |                  |                  |
       +------------------+------------------+
                          |
                 +--------v--------+
                 | GraphQL Gateway |
                 | (Apollo Router  |
                 |  or Cosmo)      |
                 +--------+--------+
                          |
         +-------+--------+--------+-------+
         |       |        |        |       |
    +----v--+ +--v---+ +--v---+ +--v---+ +-v----+
    |Finance| |Advise| |Guara.| | MPI  | | Auth |
    |Subgraph |Subgr.| |Subgr.| |Subgr.| |Subgr.|
    +-------+ +------+ +------+ +------+ +------+
```

#### Why GraphQL Federation

1. **Each portal team maintains their own subgraph**: Portal A team defines `LoanApplication`, Portal B team defines `AdvisorySession`, etc.
2. **Unified schema without unified database**: The gateway composes subgraphs into one schema that clients query as if it were a single API
3. **Cross-portal queries become natural**:

```graphql
query MyDashboard {
  me {
    person {
      fullName
      organizations {
        name
        crNumber
        # From Finance subgraph
        loanApplications {
          id
          status
          amount
          submittedAt
        }
        # From Guarantee subgraph
        guarantees {
          id
          status
          amount
          pendingSignatures {
            signatoryName
            dueDate
          }
        }
      }
    }
    # From Advisory subgraph
    advisorySessions {
      program
      nextSession
      advisor
    }
    # From Notification subgraph
    notifications(unreadOnly: true) {
      id
      message
      source
      createdAt
    }
  }
}
```

#### BFF Responsibilities

| BFF | Clients | Responsibilities |
|-----|---------|-----------------|
| **Web BFF** | Browser (Next.js SSR) | Session management, CSRF protection, response caching, aggregation |
| **Mobile BFF** | iOS/Android app | Payload optimization, push notification tokens, offline sync support |
| **Admin BFF** | Internal staff portal | Audit log access, cross-portal admin operations, user management |

#### API Versioning Strategy

GraphQL inherently supports evolution without versioning (add fields, deprecate old ones). For the REST APIs that portal backends expose to their subgraphs:

```
/api/v1/loans          -- Current stable
/api/v2/loans          -- Next version (parallel run)

Deprecation policy:
- v(N-1) supported for 6 months after v(N) release
- Deprecation headers in responses
- Usage monitoring to track migration progress
```

#### Rate Limiting

| Client Type | Rate Limit | Burst | Notes |
|-------------|-----------|-------|-------|
| Web App (authenticated) | 100 req/min | 20 | Per user session |
| Mobile App (authenticated) | 60 req/min | 15 | Lower due to mobile patterns |
| Admin Panel | 200 req/min | 50 | Higher for bulk operations |
| External API consumers | 30 req/min | 10 | Per API key |
| Internal service-to-service | 1000 req/min | 100 | Per service identity |

#### Unified Error Handling

All API responses follow a consistent error format:

```json
{
  "errors": [
    {
      "code": "QDB-FIN-4001",
      "message": "Loan application not found",
      "source": "financing-service",
      "details": {
        "applicationId": "app-123",
        "suggestion": "Verify the application ID or check if you have access"
      },
      "traceId": "trace-uuid-456",
      "timestamp": "2026-02-15T10:30:00Z"
    }
  ]
}
```

Error code format: `QDB-{SERVICE}-{HTTP_STATUS}{SEQUENCE}`

---

## Layer 7: Presentation / Channel Layer — Seamless Navigation

### CEO Direction: It Must Feel Like ONE App

The user should never feel they are "leaving" one portal and "entering" another. No page reloads, no re-authentication, no context loss. Moving from a loan application to signing a guarantee should feel like moving between tabs in Gmail — instant, seamless, state-preserved.

### What "Seamless" Actually Means (Technical Requirements)

```
SEAMLESS NAVIGATION CHECKLIST:

✓ Zero re-authentication when moving between portal features
✓ Zero full page reloads (SPA-style transitions)
✓ URL changes reflect location (deep-linkable)
✓ Back button works naturally across portal boundaries
✓ Breadcrumbs span portals (Home > Financing > Loan LA-456 > Documents)
✓ Search returns results from ALL portals in one list
✓ Notifications from any portal can deep-link into that portal's feature
✓ Copy-paste a URL from Guarantees, send to colleague — it works
✓ Persona context preserved during navigation (no "which hat am I wearing?" confusion)
✓ Loading states for lazy-loaded modules feel natural (skeleton screens, not spinners)
```

### Architecture: Module Federation Micro-Frontends

```
+------------------------------------------------------------------+
|                         QDB One Shell                             |
| +--------------------------------------------------------------+ |
| | Header: Logo | Unified Search | Notifications | Persona [v]  | |
| +--------------------------------------------------------------+ |
| |        |                                                      | |
| | Side   |              Content Area                            | |
| | Nav    |  +------------------------------------------------+  | |
| |        |  |                                                |  | |
| | [Home] |  |  Remote Module (loaded at runtime)             |  | |
| | [Fin.] |  |                                                |  | |
| | [Adv.] |  |  Transitions between modules are:             |  | |
| | [Guar.]|  |  - Client-side route changes (no reload)       |  | |
| | [Docs] |  |  - Lazy-loaded on first visit (skeleton shown) |  | |
| | [Sett.]|  |  - Cached after first load (instant revisit)   |  | |
| |        |  |                                                |  | |
| |        |  +------------------------------------------------+  | |
| +--------+------------------------------------------------------+ |
| +--------------------------------------------------------------+ |
| | Action Bar: context-sensitive quick actions                  | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

#### Why Module Federation Over Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Monolithic SPA** | Simplest, fastest initial dev | All teams coupled, deploy together | Not scalable for QDB |
| **iframes** | Full isolation | Poor UX, no shared state, accessibility issues | Not recommended |
| **Module Federation** | Independent deploy, shared deps, runtime composition | Webpack-specific, complexity | **Recommended** |
| **Single-SPA** | Framework-agnostic | More boilerplate, less mature tooling | Alternative if portals use different frameworks |

#### Module Breakdown

```
Shell Application (Host)
├── @qdb/shell            -- App shell, routing, persona switcher
├── @qdb/design-system    -- Shared UI components (bilingual AR/EN)
├── @qdb/auth-context     -- Authentication state, Keycloak integration
├── @qdb/shared-state     -- Cross-module state (selected persona, notifications)
└── @qdb/navigation       -- Unified routing, breadcrumbs, deep-link resolution

Remote Modules
├── @qdb/dashboard-module -- Unified dashboard with cross-portal cards
├── @qdb/finance-module   -- Loan applications, payments, documents
├── @qdb/advisory-module  -- Programs, sessions, assessments
├── @qdb/guarantee-module -- Guarantees, signatures, claims
├── @qdb/documents-module -- Unified document center (all portals)
├── @qdb/profile-module   -- Unified profile, preferences, identity linking
└── @qdb/admin-module     -- Internal staff tools (separate deploy)
```

### Seamless Navigation: How It Works Under the Hood

#### 1. Unified Routing (Single URL Space)

All portals share one URL structure. The user sees one address bar, one history:

```
URL STRUCTURE:

qdb.qa/                              -- Dashboard (home)
qdb.qa/financing/                     -- Financing overview
qdb.qa/financing/applications         -- My loan applications
qdb.qa/financing/applications/LA-456  -- Specific application
qdb.qa/financing/loans/LN-123        -- Active loan detail
qdb.qa/advisory/                      -- Advisory overview
qdb.qa/advisory/programs              -- My programs
qdb.qa/advisory/sessions/S-789       -- Session detail
qdb.qa/guarantees/                    -- Guarantees overview
qdb.qa/guarantees/GR-012             -- Guarantee detail
qdb.qa/guarantees/GR-012/sign        -- Sign a guarantee
qdb.qa/documents/                     -- All documents (cross-portal)
qdb.qa/profile/                       -- My profile & settings
qdb.qa/notifications/                 -- All notifications
```

**Key**: Navigation from `/financing/applications/LA-456` to `/guarantees/GR-012` is a **client-side route change** — the shell stays mounted, only the content area swaps the loaded module. No page reload. No re-auth.

#### 2. Cross-Portal Linking (The Secret Sauce)

The magic that makes it seamless: any entity can link to related entities in other portals.

```
EXAMPLE: Fatima views her loan application LA-456

+------------------------------------------------------------------+
| Loan Application LA-2025-456                                      |
+------------------------------------------------------------------+
| Status: Approved | Amount: QAR 2,000,000 | Date: 2025-11-15     |
|                                                                   |
| Company: Al-Kuwari Trading LLC (CR: 12345)                       |
|                                                                   |
| Related Items:                                                    |
| ┌──────────────────────────────────────────────────────────────┐ |
| │ 🔗 Guarantee GR-2024-789 (linked to this loan)              │ |
| │    Status: Pending your signature                            │ |
| │    [View Guarantee →]  [Sign Now →]                          │ |
| ├──────────────────────────────────────────────────────────────┤ |
| │ 🔗 Advisory Session S-2025-101                               │ |
| │    "Financial Planning for Expansion" — Mar 1, 2026          │ |
| │    [View Session →]                                          │ |
| ├──────────────────────────────────────────────────────────────┤ |
| │ 📄 3 Documents shared across services                       │ |
| │    [View All Documents →]                                    │ |
| └──────────────────────────────────────────────────────────────┘ |
+------------------------------------------------------------------+
```

Clicking "[View Guarantee →]" navigates to `/guarantees/GR-2024-789` — **same page, no reload, breadcrumb updates**, the guarantee module loads (or is already cached):

```
BREADCRUMB: Home > Financing > Application LA-456 > Related: Guarantee GR-789

The breadcrumb shows WHERE you came from, even across portal boundaries.
Back button takes you back to LA-456 instantly.
```

#### 3. Shared Context Bus (How Modules Talk to Each Other)

Modules don't call each other directly. They communicate through a shared event/state bus:

```
SHARED STATE (@qdb/shared-state):

{
  "activePersona": {
    "portal": "direct_financing",
    "role": "customer",
    "org_cr": "12345",
    "org_name": "Al-Kuwari Trading LLC"
  },
  "navigationContext": {
    "previousModule": "finance",
    "currentModule": "guarantee",
    "breadcrumb": [
      { "label": "Home", "path": "/" },
      { "label": "Financing", "path": "/financing" },
      { "label": "LA-456", "path": "/financing/applications/LA-456" },
      { "label": "GR-789", "path": "/guarantees/GR-789" }
    ],
    "returnTo": "/financing/applications/LA-456"
  },
  "pendingActions": {
    "financing": 0,
    "advisory": 1,
    "guarantees": 2
  },
  "unreadNotifications": 5
}

EVENT BUS (module-to-module communication):

Shell emits:
  - "persona:changed"   → all modules refresh data for new context
  - "language:changed"   → all modules re-render in new language
  - "session:expiring"   → all modules save draft state

Module emits:
  - "navigate:request"   → shell handles route change
  - "action:completed"   → shell updates pending action badges
  - "document:uploaded"  → documents module refreshes
```

#### 4. Unified Search (One Search, All Portals)

```
+------------------------------------------------------------------+
| 🔍 Search: "Al-Kuwari"                                     [x]  |
+------------------------------------------------------------------+
| RESULTS (12 found across all services)                           |
|                                                                   |
| COMPANIES                                                         |
| ┌────────────────────────────────────────────────────────────┐   |
| │ Al-Kuwari Trading LLC (CR: 12345)                          │   |
| │   Financing: 2 active loans, 1 application                │   |
| │   Guarantees: 1 active, 1 pending signature                │   |
| │   Advisory: Enrolled in SME Growth Program                 │   |
| └────────────────────────────────────────────────────────────┘   |
|                                                                   |
| APPLICATIONS                                                      |
| • LA-2025-456 — Expansion Loan (QAR 2M) — Approved             |
| • LA-2025-789 — Working Capital (QAR 500K) — Under Review       |
|                                                                   |
| GUARANTEES                                                        |
| • GR-2024-789 — Bank Guarantee (QAR 1M) — Pending Signature    |
|                                                                   |
| DOCUMENTS                                                         |
| • Trade License - Al-Kuwari Trading LLC (uploaded 2025-09-01)   |
| • Financial Statements 2024 (uploaded 2025-06-15)               |
+------------------------------------------------------------------+
```

Implementation: Unified search queries the **Elasticsearch index** (from Layer 4 — CQRS read store). Results link directly to the entity in its module — clicking a guarantee result navigates to `/guarantees/GR-2024-789` seamlessly.

#### 5. Module Loading Strategy (How to Keep It Fast)

```
MODULE LOADING PRIORITIES:

                    EAGER (loaded at login)
                    ┌─────────────────────┐
                    │ @qdb/shell          │
                    │ @qdb/design-system  │
                    │ @qdb/auth-context   │
                    │ @qdb/shared-state   │
                    └─────────────────────┘

                    PREFETCH (loaded after initial render)
                    ┌─────────────────────┐
                    │ @qdb/dashboard      │  ← user always sees this first
                    │ @qdb/finance-module │  ← prefetch if user has finance persona
                    └─────────────────────┘

                    LAZY (loaded on first navigation)
                    ┌─────────────────────┐
                    │ @qdb/advisory-module│  ← loaded when user clicks "Advisory"
                    │ @qdb/guarantee-mod. │  ← loaded when user clicks "Guarantees"
                    │ @qdb/documents-mod. │  ← loaded when user clicks "Documents"
                    │ @qdb/profile-module │  ← loaded when user clicks "Profile"
                    └─────────────────────┘

LOADING UX:
  - First visit to a module: skeleton screen (200-500ms), then content
  - Revisit: instant (module cached in memory)
  - If module fails to load: graceful error with retry button
    "This section is temporarily unavailable. [Retry] [Report Issue]"
    Other modules remain fully functional
```

#### 6. Persona Switcher (Context Without Confusion)

```
+------------------------------------------------------------------+
| QDB One                                    Fatima Al-Kuwari [v]  |
+------------------------------------------------------------------+
                                             |
                              +--------------v--------------+
                              | ACTIVE CONTEXT:              |
                              | Al-Kuwari Trading LLC        |
                              | CR: 12345                    |
                              |                              |
                              | YOUR ROLES:                  |
                              | ✓ Customer (Financing)       |
                              | ✓ Stakeholder (Advisory)     |
                              |                              |
                              | ─── Switch Company ───       |
                              |                              |
                              | Qatar Tech Ventures          |
                              | CR: 67890                    |
                              | Role: Authorized Signatory   |
                              | [Switch →]                   |
                              |                              |
                              | ─── Actions ───              |
                              | [Link Another Account]       |
                              | [Profile & Settings]         |
                              | [Sign Out]                   |
                              +------------------------------+

BEHAVIOR:
- All roles for the SAME company are visible simultaneously
  (no need to switch between "customer" and "stakeholder" for
   the same company — show everything for that company at once)
- Only switch when changing COMPANY context
  (e.g., from Al-Kuwari Trading to Qatar Tech Ventures)
- When switching company: nav badges update, dashboard refreshes,
  but URL stays on current page if the page makes sense for new context
  (otherwise redirects to dashboard)
```

**Key insight**: Don't make users switch between "customer" and "stakeholder" for the same company. That's artificial. Show all their roles for the active company at once. Only switch when changing which company they're viewing as.

#### Notification Unification

A single notification inbox aggregates across all portals:

```
+------------------------------------------+
| Notifications (5 unread)           [Mark all read]
+------------------------------------------+
| [!] Guarantee GR-2024-789 requires     |
|     your signature (2 hours ago)        |
|     [Sign Now →]                        |
+------------------------------------------+
| [i] Loan application LA-2025-456       |
|     approved! (1 day ago)              |
|     [View Application →]              |
+------------------------------------------+
| [i] Advisory session with Dr. Hassan   |
|     confirmed for March 1 (2 days ago) |
|     [View Session →]                   |
+------------------------------------------+
```

Every notification deep-links into the relevant module. Clicking "[Sign Now →]" navigates to `/guarantees/GR-2024-789/sign` — no page reload, no re-auth.

Implementation:
- Each portal publishes notification events to Kafka
- Notification service consumes, deduplicates, and stores
- WebSocket connection delivers real-time notifications to the shell
- Push notifications for mobile via Firebase Cloud Messaging (FCM)

#### Bilingual Support (Arabic/English)

QDB serves both Arabic and English users. The design system must support:

- **RTL layout**: Full right-to-left support in CSS (logical properties: `margin-inline-start` instead of `margin-left`)
- **Bilingual data**: Arabic and English versions of portal content
- **User preference**: Language toggle persisted in user preferences
- **Dynamic switching**: No page reload required for language change (all modules respond to `language:changed` event)
- **Date/number formatting**: Arabic-Indic numerals option, Hijri calendar support
- **Bidirectional text**: Proper handling of mixed AR/EN content in the same view

#### Mobile Considerations

QDB already has a mobile app (QDB Digital). The recommendation is:

1. **Phase 0**: Keep existing QDB Digital app for financing-only use
2. **Phase 1**: Build QDB One as a responsive web application (mobile-first design) — this IS the mobile experience initially
3. **Phase 2**: Evaluate whether a dedicated QDB One native app is needed (responsive web may be sufficient)
4. **Phase 3**: If native app needed, use React Native with shared business logic

The seamless navigation patterns above work equally on desktop and mobile — the sidebar becomes a bottom tab bar or hamburger menu, but the routing, context bus, and cross-portal linking remain identical.

---

## Layer 8: Data Migration & Transition Strategy

### Recommended Approach: Strangler Fig with Parallel-Run Validation

**Do NOT attempt a big-bang migration.** The risk of data corruption, identity mismatches, and service disruption is too high for a financial institution.

```
STRANGLER FIG APPROACH:

Phase 0: Build the new system alongside existing portals
         Existing portals remain fully operational
         New system reads from portal DBs (via events/CDC)
         No user-facing changes yet

Phase 1: Route first portal through QDB One
         Users of Portal X can now access via QDB One OR legacy
         Parallel-run: both paths active, results compared
         Legacy portal becomes "read-only" for migrated functions

Phase 2: Route remaining portals through QDB One
         One portal at a time
         Same parallel-run validation per portal

Phase 3: Decommission legacy portals
         Only after 3+ months of stable QDB One operation
         Legacy databases become archive-only
```

#### Identity Linking During Migration

```
MIGRATION IDENTITY LINKING PROCESS:

Step 1: Bulk Deterministic Matching
        - Match all records across portals by CR Number
        - Match all records by NAS ID
        - Match all records by QID
        - Result: ~60-70% of records linked automatically

Step 2: Semi-Deterministic Matching
        - Match remaining records by email + name combination
        - Match by phone + organization
        - Result: ~15-20% additional records linked

Step 3: Probabilistic Matching
        - Fuzzy name matching (Arabic transliteration aware)
        - Address matching
        - Result: ~5-10% additional records flagged for review

Step 4: Manual Review
        - Data stewards review flagged matches
        - ~5-10% of records require human judgment
        - Decision logged with audit trail

Step 5: Orphan Resolution
        - Remaining unmatched records (~2-5%)
        - Prompt users to link during first QDB One login
        - "We found these accounts. Are any of these yours?"
```

#### Conflict Resolution

When the same person has different data across portals:

| Scenario | Resolution |
|----------|-----------|
| Different email addresses | Keep both, mark most recently verified as primary |
| Different phone numbers | Keep both, prompt user to confirm primary |
| Different company names | Use MOCI/CR registry as authoritative source |
| Different addresses | Use most recently updated, flag for user confirmation |
| Different names (transliteration) | Use NAS/QID verified name as golden record |
| Contradictory status | Investigate: person may legitimately have different statuses per portal |

#### Rollback Strategy

```
ROLLBACK PLAN:

Level 1: Feature Rollback
  - Toggle: per-portal feature flags
  - Effect: Specific portal features revert to legacy
  - Time: Instant (feature flag change)

Level 2: Portal Rollback
  - Toggle: Route portal traffic back to legacy
  - Effect: Entire portal reverts to legacy
  - Time: DNS/proxy change, 5-15 minutes
  - Data: No data loss (writes went to portal DB directly)

Level 3: Full Rollback
  - Toggle: Deactivate QDB One entirely
  - Effect: All portals revert to legacy
  - Time: 30-60 minutes
  - Data: MPI data preserved for future attempt
  - Note: This should never be needed if Phase approach followed
```

#### Phased Rollout Plan

| Phase | Portal | Duration | Users | Success Criteria |
|-------|--------|----------|-------|-----------------|
| 0 | Infrastructure only (MPI, Auth, Gateway) | 4-6 months | Internal only | MPI matches >95% of test records |
| 1a | Direct Financing (pilot group) | 2 months | 50 users | Zero auth failures, <2s response time |
| 1b | Direct Financing (all users) | 2 months | All financing users | <0.1% error rate, user satisfaction >80% |
| 2a | Advisory Services | 3 months | All advisory users | Same criteria as 1b |
| 2b | Guarantee Portal | 3 months | All guarantee users | Same criteria as 1b |
| 3 | Legacy decommission | 4-6 months | N/A | All traffic on QDB One for 3 months |

---

## Layer 9: Observability & Operations

### Unified Logging

```
+-------------------+     +-------------------+     +-------------------+
| Portal A Logs     |     | Portal B Logs     |     | Portal C Logs     |
+--------+----------+     +--------+----------+     +--------+----------+
         |                         |                          |
         +------------+------------+------------+-------------+
                      |                         |
              +-------v-------+         +-------v-------+
              |  Fluent Bit   |         |  Fluent Bit   |
              | (Log Shipper) |         | (Log Shipper) |
              +-------+-------+         +-------+-------+
                      |                         |
              +-------v-------------------------v-------+
              |          OpenSearch / ELK Stack          |
              |                                         |
              |  Index per service:                     |
              |  - qdb-one-gateway-*                    |
              |  - qdb-one-mpi-*                        |
              |  - portal-financing-*                   |
              |  - portal-advisory-*                    |
              |  - portal-guarantee-*                   |
              +-----------------------------------------+
                              |
              +---------------v---------------+
              |         Grafana               |
              |  Dashboards + Alerting        |
              +-------------------------------+
```

#### Log Format Standard

All services must log in structured JSON:

```json
{
  "timestamp": "2026-02-15T10:30:00.123Z",
  "level": "info",
  "service": "financing-subgraph",
  "traceId": "abc-123-def-456",
  "spanId": "span-789",
  "personId": "mpi-uuid-12345",
  "action": "loan_application_submitted",
  "portal": "direct_financing",
  "duration_ms": 245,
  "metadata": {
    "applicationId": "LA-2025-456",
    "amount": 500000
  }
}
```

### Distributed Tracing

Use **OpenTelemetry** for end-to-end tracing across portals:

```
User Click --> Web BFF --> GraphQL Gateway --> Finance Subgraph --> Portal A DB
                                          --> Advisory Subgraph --> Portal B DB
                                          --> MPI Service --> MPI DB

Each hop gets a span within the same trace.
TraceID propagated via HTTP header: traceparent
```

Technology: **Jaeger** or **Tempo** (Grafana) for trace storage and visualization.

### Health Monitoring

```
+---------------------------------+
|        Health Dashboard         |
+---------------------------------+
| Service          | Status | Lat.|
|------------------|--------|-----|
| QDB One Gateway  |   OK   | 12ms|
| MPI Service      |   OK   | 8ms |
| Keycloak         |   OK   | 15ms|
| Finance Subgraph |   OK   | 45ms|
| Advisory Subgraph|  WARN  |220ms|
| Guarantee Subgr. |   OK   | 38ms|
| Kafka            |   OK   | 5ms |
| Portal A DB      |   OK   | 3ms |
| Portal B DB      |  WARN  | 85ms|
| Portal C DB      |   OK   | 4ms |
| QFC Integration  |   OK   | --  |
| MOCI Integration |  DOWN  | --  |
+---------------------------------+
```

Health checks should be **deep** (verify database connectivity, not just HTTP 200) and run every 30 seconds.

### Alerting Strategy

| Alert | Severity | Channel | Condition |
|-------|----------|---------|-----------|
| Service down | P1 - Critical | PagerDuty + SMS | Health check fails 3 consecutive times |
| Response time > 2s | P2 - High | Slack + Email | 95th percentile > 2000ms for 5 minutes |
| Error rate > 1% | P2 - High | Slack + Email | Error rate exceeds 1% for 5 minutes |
| Auth failure spike | P1 - Critical | PagerDuty + SMS | >10 auth failures/minute (possible attack) |
| MPI match conflict | P3 - Medium | Email | Probabilistic match requires review |
| Kafka consumer lag | P2 - High | Slack | Consumer lag > 1000 events for 10 minutes |
| Certificate expiry | P3 - Medium | Email | Certificate expires within 30 days |
| Disk usage > 80% | P3 - Medium | Slack | Any service disk usage exceeds 80% |

---

## Layer 10: Security & Compliance

### Qatar PDPPL Compliance

Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016) applies directly to QDB One. Key requirements and how QDB One addresses them:

| PDPPL Requirement | QDB One Implementation |
|-------------------|----------------------|
| **Lawful basis for processing** | QDB has statutory basis; document in privacy policy |
| **Purpose limitation** | MPI stores only identity correlation data; portal data stays in portal DBs |
| **Data minimization** | Unified read store contains only what's needed for dashboard views |
| **Accuracy** | Golden record survivorship rules ensure most accurate data wins |
| **Storage limitation** | Retention policies per data type; automated archival |
| **Security** | Encryption at rest + transit; access controls via OpenFGA |
| **Data subject rights** | "My Data" section in QDB One for export/deletion requests |
| **Breach notification** | 72-hour notification capability via automated incident workflow |
| **DPIA** | Required before QDB One launch; MPI processing is high-risk |
| **Cross-border transfer** | All data remains in Qatar; no cross-border transfer planned |
| **Processor contracts** | If any cloud services used, PDPPL-compliant DPA required |

**Penalties**: Up to QAR 5 million for non-compliance. Given QDB's government affiliation, reputational risk exceeds financial penalties.

### Data Sovereignty

- **All data must remain in Qatar.** QDB One infrastructure must be deployed in Qatar (QDB data center or Qatar-based cloud)
- **No foreign cloud dependencies for data storage.** Managed services (if used) must guarantee Qatar data residency
- **Encryption keys must be managed by QDB**, not by a cloud provider

### Audit Trail Architecture

Every action across QDB One must be auditable:

```
AUDIT EVENT STRUCTURE:

{
  "auditId": "audit-uuid",
  "timestamp": "2026-02-15T10:30:00Z",
  "actor": {
    "personId": "mpi-uuid-12345",
    "activePersona": "customer@al-kuwari-trading",
    "authMethod": "cr_login",
    "ipAddress": "10.0.1.50",
    "userAgent": "QDB-One-Web/1.0"
  },
  "action": {
    "type": "loan_application_submitted",
    "portal": "direct_financing",
    "resourceType": "loan_application",
    "resourceId": "LA-2025-456"
  },
  "context": {
    "delegatedBy": null,
    "delegationChain": [],
    "mfaUsed": true,
    "sessionId": "session-uuid"
  },
  "outcome": "success",
  "changes": {
    "before": null,
    "after": { "status": "submitted", "amount": 500000 }
  }
}
```

Audit logs must be:
- **Immutable**: Write-once storage (append-only table or object storage)
- **Tamper-evident**: Hash chain linking each audit entry to the previous one
- **Retained**: Minimum 7 years for financial transactions (QCB regulations)
- **Searchable**: Indexed by person, action type, time range, portal

### Encryption Strategy

| Layer | Encryption | Standard |
|-------|-----------|----------|
| Data in transit | TLS 1.3 | All internal and external communication |
| Data at rest (databases) | AES-256 | Transparent Data Encryption (TDE) |
| Data at rest (documents) | AES-256 | Server-side encryption with QDB-managed keys |
| Data at rest (backups) | AES-256 | Encrypted before storage |
| Sensitive fields (PII) | Application-level encryption | QID, NAS ID encrypted at field level in MPI |
| API keys/secrets | HashiCorp Vault | Centralized secrets management |
| Key management | HSM-backed | QDB-controlled Hardware Security Module |

### Consent Management

For identity linking (combining data across portals), explicit consent may be required:

```
CONSENT FLOW:

1. User logs into QDB One for the first time
2. System identifies linked accounts across portals
3. User presented with consent screen:

   "QDB One will combine your information from:
    - Direct Financing Portal (Account: CUST-12345)
    - Advisory Services (Account: ADV-67890)

    This allows you to:
    - See all your QDB services in one dashboard
    - Use a single login for all services
    - Receive unified notifications

    [I Agree]  [Learn More]  [Manage Individually]"

4. Consent decision recorded with:
   - Timestamp
   - Consent version
   - Specific scopes agreed to
   - Method of consent (click-through, signature)

5. User can revoke consent at any time via Settings
   - Revocation unlinking the accounts
   - Data remains in individual portal DBs (no deletion)
```

---

## Cross-Cutting Concerns

### Architectural Pattern: Hub-and-Spoke with Event Mesh

```
                    +------------------+
                    |   QDB One Hub    |
                    |                  |
                    | - MPI Service    |
                    | - Auth (Keycloak)|
                    | - AuthZ (OpenFGA)|
                    | - API Gateway    |
                    | - Notification   |
                    | - Audit Service  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+   +-----v------+  +----v-------+
     |  Financing  |   |  Advisory  |  | Guarantee  |
     |   Spoke     |   |   Spoke    |  |   Spoke    |
     |             |   |            |  |            |
     | - Subgraph  |   | - Subgraph |  | - Subgraph |
     | - Portal DB |   | - Portal DB|  | - Portal DB|
     | - UI Module |   | - UI Module|  | - UI Module|
     +------+------+   +------+-----+  +------+-----+
            |                 |                |
            +---------+-------+--------+-------+
                      |                |
              +-------v-------+ +-----v--------+
              |   Kafka Event | | External     |
              |   Mesh        | | Integrations |
              +---------------+ +--------------+
```

**Why Hub-and-Spoke over alternatives:**

| Pattern | Fit for QDB | Rationale |
|---------|-------------|-----------|
| **Hub-and-Spoke** | **Best** | Clear ownership, QDB One hub provides shared services, spokes remain independent |
| **Full Mesh** | Poor | Too complex, portals don't need to talk directly to each other |
| **Event Bus Only** | Partial | Events needed but not sufficient; synchronous queries also required |
| **Service Mesh (Istio)** | Overkill | Useful if QDB had 50+ microservices; 3 portals + hub doesn't justify overhead |

### Buy vs Build Decisions

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Identity Provider** | Buy: Keycloak (open source) | Proven, extensible, avoids reinventing auth |
| **Authorization Engine** | Buy: OpenFGA (open source) | Zanzibar model fits perfectly; building custom ReBAC is 6+ months |
| **MDM/MPI** | Build (Phase 0), Evaluate Buy (Phase 2+) | QDB scale doesn't justify enterprise MDM license initially |
| **API Gateway** | Buy: Kong or AWS API Gateway | Commodity; building wastes time |
| **Event Bus** | Buy: Apache Kafka (Confluent or self-managed) | Industry standard, QDB already likely has Kafka experience |
| **GraphQL Federation** | Buy: Apollo Router or Cosmo | Federation routing is complex; solved problem |
| **Observability** | Buy: Grafana Stack (open source) | Grafana + Loki + Tempo + Prometheus covers all observability |
| **Search** | Buy: OpenSearch | Full-text search with Arabic support; don't build |
| **Module Federation** | Build: Webpack Module Federation | Framework choice, minimal "buy" involved |
| **UI Component Library** | Build: Custom design system | QDB branding + Arabic/RTL requirements are custom |
| **Notification Service** | Build | Simple enough, QDB-specific requirements |
| **Audit Service** | Build | Regulatory-specific, must be under QDB control |

### Estimated Effort and Risk

| Layer | Effort (Person-Months) | Risk | Key Risk Factor |
|-------|----------------------|------|-----------------|
| Layer 1: MPI | 8-12 | Medium | Arabic name matching accuracy |
| Layer 2: AuthN | 4-6 | Low | Keycloak is proven; NAS integration is known |
| Layer 3: AuthZ | 6-8 | Medium | Modeling all permission scenarios correctly |
| Layer 4: Data | 10-14 | High | Event synchronization, eventual consistency |
| Layer 5: Integration | 6-8 | Medium | External system reliability (QFC, MOCI) |
| Layer 6: API | 6-8 | Low | GraphQL federation is well-understood |
| Layer 7: Presentation | 12-16 | Medium | Module federation complexity, bilingual UX |
| Layer 8: Migration | 8-12 | High | Identity linking accuracy, rollback scenarios |
| Layer 9: Observability | 3-4 | Low | Standard tooling |
| Layer 10: Security | 4-6 | Medium | PDPPL compliance validation |
| **Total** | **67-94** | | |

With a team of 8-12 engineers, this translates to approximately **8-12 months** for core delivery, plus 4-6 months for migration and stabilization, aligning with the 17-24 month total estimate.

---

## Architecture Decision Records

### ADR-001: Identity Resolution Strategy

**Status**: Proposed

**Context**: QDB has multiple portals with overlapping users stored in separate databases with no shared identifier. We need to unify identity across portals.

**Options Considered**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. Require Re-registration | Force all users to create new QDB One accounts | Clean data, no matching needed | Terrible UX, user resistance, data loss |
| B. SSO Only (no identity linking) | Single sign-on but no unified profile | Simpler, faster to implement | Doesn't solve the core problem; user still has separate contexts |
| C. Master Person Index (MPI) | Build golden record from existing data with probabilistic matching | Solves the core problem, preserves existing data | Complex matching, potential false positives |
| D. Enterprise MDM Platform | Purchase Informatica/IBM MDM | Proven at scale, vendor support | Expensive ($500K+/year), long implementation, overkill for QDB scale |

**Decision**: **Option C -- Custom Master Person Index**

**Rationale**: The MPI approach solves the fundamental problem (identity fragmentation) without forcing user disruption (Option A) or leaving the problem unsolved (Option B). QDB's entity count (likely <100,000 unique persons/organizations) doesn't justify the cost of enterprise MDM (Option D). A custom MPI gives full control over matching logic, particularly important for Arabic name handling.

**Consequences**:
- Must invest in Arabic name matching capability
- Must build a manual review workflow for ambiguous matches
- Must plan for ongoing data stewardship (not a one-time activity)

---

### ADR-002: Authentication Strategy — Consolidate to QDB Login (NAS-Backed)

**Status**: Approved (CEO direction)

**Context**: QDB has three separate login methods (CR Login, NAS Login, Email Login) spread across portals. The CEO directed: consolidate to one QDB Login backed by NAS. No more maintaining multiple authentication methods.

**Options Considered**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. Federate all 3 logins | Keep CR, NAS, email; broker via Keycloak | No user disruption | Maintains complexity, 3 systems to maintain, identity linking still needed |
| B. **Consolidate to NAS-backed QDB Login** | Single login delegating to NAS; sunset CR and email logins | One login, government-grade identity, 100% deterministic MPI matching via QID | Migration effort for existing CR/email-only users |
| C. Build custom QDB SSO | Custom auth system independent of NAS | Full control | Massive security liability, reinventing the wheel |

**Decision**: **Option B — Consolidate to NAS-backed QDB Login**

**Rationale**: NAS provides government-grade identity verification with QID as a universally unique identifier. This eliminates the many-to-many identity problem entirely — QID is the single deterministic key across all portals. QDB offloads credential management and MFA to NAS. The migration cost (3-6 months of parallel operation) is far less than the ongoing cost of maintaining 3 auth systems indefinitely.

**Consequences**:
- Must plan 3-phase migration to move CR-only and email-only users to NAS login
- Must handle edge cases (foreign nationals without QID, system/API accounts)
- Legacy login endpoints run in parallel for ~9 months, then decommission
- Keycloak role simplifies from "identity broker for 3 IDPs" to "NAS gateway + session management"
- No custom Keycloak SPI needed (NAS is standard SAML/OIDC)

---

### ADR-003: Cross-Portal Data Access Pattern

**Status**: Proposed

**Context**: Users need a unified dashboard showing data from all portals. We must decide how to query across portal databases.

**Options Considered**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. Database consolidation | Merge all portal DBs into one | Single query model, simplest app code | Extremely high risk, breaks existing apps, years of effort |
| B. Direct cross-DB queries | Application queries each portal DB directly | Simple initially | Tight coupling, N+1 query problems, inconsistent response times |
| C. CQRS with event-driven materialized views | Portals publish events; read store materializes unified views | Decoupled, scalable, resilient | Eventually consistent, event pipeline complexity |
| D. GraphQL Federation (query time) | Gateway distributes queries to subgraphs at request time | Real-time data, no separate read store | Slower for dashboard aggregations, all portals must be online |

**Decision**: **Option C + D (Hybrid)**

**Rationale**: Use CQRS materialized views for dashboard and search (pre-computed, fast, resilient to individual portal outages). Use GraphQL Federation for detail views and write operations (real-time, authoritative). This hybrid gives the best of both worlds: fast dashboards from materialized views and real-time detail from direct queries.

**Consequences**:
- Must build and maintain event pipeline (Kafka + projection service)
- Must accept eventual consistency for dashboard data (typically <5 second delay)
- Must handle projection failures gracefully (dashboard shows stale data flag)
- Must version event schemas as portal databases evolve

---

### ADR-004: Authorization Model

**Status**: Proposed

**Context**: The same person holds multiple roles across portals (customer, stakeholder, signatory) and may act on behalf of multiple organizations. Traditional RBAC cannot model this.

**Options Considered**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. RBAC per portal | Each portal maintains its own roles table | Simple, familiar | Cannot model cross-portal identity; user manages multiple role sets |
| B. Unified RBAC | Central role table with all portal roles | Single source of truth | Doesn't capture relationships (why does this person have this role?) |
| C. ABAC | Attribute-based policies | Flexible, context-aware | Complex policy authoring, hard to debug, no relationship graph |
| D. ReBAC (Zanzibar-style) | Relationship graph between persons, orgs, and resources | Natural fit for person-org-role model, handles delegation | Newer paradigm, learning curve |
| E. Hybrid ReBAC + RBAC | ReBAC for relationships, RBAC for simple portal-level roles | Best of both worlds | Two systems to maintain |

**Decision**: **Option E -- Hybrid ReBAC + RBAC via OpenFGA**

**Rationale**: The person-organization-role relationships at QDB are fundamentally graph-structured (a person *relates to* an organization as a *signatory*). ReBAC models this naturally. Simple permissions (e.g., "can access Advisory portal") use RBAC within the same system. OpenFGA supports both paradigms in a single engine. The delegation/acting-on-behalf requirements are only practical with a relationship graph.

**Consequences**:
- Must model all cross-portal relationships in OpenFGA schema
- Must train development team on ReBAC concepts
- Must integrate OpenFGA checks into all API endpoints
- OpenFGA becomes a critical dependency (must be highly available)

---

### ADR-005: Frontend Architecture

**Status**: Proposed

**Context**: QDB One must present a unified UI that incorporates functionality from multiple portal teams. We need to decide on the frontend composition strategy.

**Options Considered**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A. Monolithic SPA | Single Next.js application | Simplest, fastest initially, consistent UX | All teams must coordinate releases, no independent deployment |
| B. Module Federation | Webpack Module Federation with shell + remotes | Independent deployment, shared dependencies | Webpack-specific, inter-module communication complexity |
| C. iframes | Each portal rendered in an iframe within shell | Complete isolation | Poor UX, no shared state, accessibility nightmare, performance issues |
| D. Single-SPA | Framework-agnostic micro-frontend orchestrator | Works with any framework | More boilerplate, less tooling support than Module Federation |

**Decision**: **Option B -- Module Federation**

**Rationale**: Portal teams need to deploy independently (a financing UI change shouldn't require guarantee team coordination). Module Federation provides this with minimal overhead. Shared dependencies (React, design system) are loaded once by the shell. Single-SPA (Option D) would only be necessary if portals used different frameworks, which is not the case. A monolithic SPA (Option A) would become a bottleneck as the team grows.

**Consequences**:
- Must establish shared design system before portal modules are built
- Must define clear module API contracts (events, shared state shape)
- Webpack version must be synchronized across all modules
- Must implement fallback UI for module load failures

---

## Phased Roadmap

```
MONTH  1  2  3  4  5  6  7  8  9  10  11  12  13  14  15  16  17  18
       |--Phase 0 (Foundation)--|
       |====MPI Core Build======|
       |===Keycloak Setup===|
       |====OpenFGA Model====|
       |=Event Pipeline Setup=|
       |==Design System==|
                              |--Phase 1 (First Portal)--|
                              |==Finance Subgraph==|
                              |==Finance Module==|
                              |===Parallel Run===|
                                                    |-Phase 2 (Expand)--|
                                                    |==Advisory==|
                                                    |===Guarantee===|
                                                    |==Dashboard===|
                                                                      |P3|
                                                                      |Decom|
```

### Phase 0: Foundation (Months 1-6)

**Deliverables**:
- MPI service with deterministic matching (CR, NAS, QID)
- Keycloak configured with CR Login, NAS Login, Email Login
- OpenFGA authorization model for all portal relationships
- Kafka event pipeline with Debezium CDC from Portal A DB
- QDB One design system (Arabic/English, RTL support)
- Shell application with persona switcher
- Observability stack (Grafana, Loki, Tempo)

**Success Criteria**:
- MPI matches >95% of test records deterministically
- Login works with all 3 methods and links identities
- Authorization model correctly resolves 100% of test scenarios

### Phase 1: First Portal Integration (Months 7-10)

**Deliverables**:
- Direct Financing subgraph + UI module in QDB One
- Parallel-run with legacy portal
- Unified dashboard (Finance data only initially)
- Pilot group of 50 users

**Success Criteria**:
- Zero authentication failures in pilot
- Response time <2s for 95th percentile
- User satisfaction >80% in pilot survey

### Phase 2: Remaining Portals (Months 11-16)

**Deliverables**:
- Advisory Services subgraph + UI module
- Guarantee Portal subgraph + UI module
- Full unified dashboard with all portal data
- Unified notification inbox
- Cross-portal search
- Mobile-responsive QDB One

**Success Criteria**:
- All portal users migrated to QDB One
- Error rate <0.1%
- Cross-portal dashboard loads in <3s

### Phase 3: Legacy Decommission (Months 17-18+)

**Deliverables**:
- Legacy portals set to read-only
- Data archival from legacy databases
- Legacy infrastructure decommissioned
- Post-migration audit report

**Success Criteria**:
- All traffic on QDB One for 3+ months with no critical incidents
- All audit requirements met
- Legacy infrastructure costs eliminated

---

## Appendix: Technology Reference

### Recommended Technology Stack

| Layer | Technology | Version | License |
|-------|-----------|---------|---------|
| Identity Provider | Keycloak | 24+ | Apache 2.0 |
| Authorization | OpenFGA | 1.5+ | Apache 2.0 |
| API Gateway | Kong Gateway | 3.x | Apache 2.0 / Enterprise |
| GraphQL Federation | Apollo Router or Cosmo | Latest | Elastic / Apache 2.0 |
| Event Bus | Apache Kafka | 3.7+ | Apache 2.0 |
| CDC | Debezium | 2.5+ | Apache 2.0 |
| Primary Database (MPI, Read Store) | PostgreSQL | 16+ | PostgreSQL License |
| Search Engine | OpenSearch | 2.x | Apache 2.0 |
| Cache | Redis | 7+ | BSD-3 / SSPL |
| Secrets Management | HashiCorp Vault | 1.15+ | BSL / Enterprise |
| Frontend Framework | Next.js (React) | 14+ | MIT |
| Module Federation | Webpack | 5+ | MIT |
| UI Components | Custom Design System | -- | Internal |
| Logging | Grafana Loki | 3.x | AGPL |
| Metrics | Prometheus + Grafana | Latest | Apache 2.0 |
| Tracing | Grafana Tempo | Latest | AGPL |
| Container Orchestration | Kubernetes | 1.29+ | Apache 2.0 |
| CI/CD | GitHub Actions or Jenkins | Latest | -- |

### Key References

- Google Zanzibar Paper (2019): Foundation for ReBAC model
- Martin Fowler, Strangler Fig Application: Migration strategy foundation
- Qatar PDPPL (Law No. 13 of 2016): Data protection compliance baseline
- QCB Regulations: Financial data retention requirements
- NIST SP 800-63-3: Digital Identity Guidelines (authentication levels)

---

*This document is a living advisory and should be updated as QDB One progresses through implementation phases. Each ADR should be formally reviewed and approved before the relevant phase begins.*

*Prepared by ConnectSW Architecture Practice. For questions or clarifications, contact the advisory team.*
