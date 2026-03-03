# QDB SME Relief Portal — Architecture

**Product**: QDB SME Relief Portal
**Version**: 1.0
**Date**: March 3, 2026
**Status**: Prototype complete — Production architecture planned
**Classification**: Confidential — QDB Internal Use Only

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [C4 Level 1 — Context Diagram](#2-c4-level-1--context-diagram)
3. [C4 Level 2 — Container Diagram](#3-c4-level-2--container-diagram)
4. [C4 Level 3 — Component Diagram](#4-c4-level-3--component-diagram)
5. [Integration Sequence Diagrams](#5-integration-sequence-diagrams)
6. [End-to-End Data Flow](#6-end-to-end-data-flow)
7. [Data Model — ER Diagram](#7-data-model--er-diagram)
8. [Application State Machine](#8-application-state-machine)
9. [Security Architecture](#9-security-architecture)

---

## 1. Architecture Overview

The QDB SME Relief Portal is a time-bounded emergency program portal with a hard delivery
requirement of 6-8 weeks from brief to live. The architecture is optimised for:

- **Speed of delivery**: Next.js full-stack with server-side rendering; a Fastify API service
  added in the production phase when real external API integrations are required
- **Government integration**: NAS (OIDC), MOCI (REST), WPS (REST), Dynamics CRM (OData REST)
  are all existing government/QDB APIs — the portal is an orchestration layer over them
- **Auditability**: Every material decision is captured in an append-only audit table; this is
  a compliance requirement for a government-administered financial relief program
- **Program sunset**: The architecture supports a defined program window with lifecycle states
  (Open / Paused / Closed) and automatic enforcement of the program end date

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 + React 18 + Tailwind CSS | SSR for bilingual RTL rendering; ConnectSW standard |
| Backend API | Fastify 4 (Node.js 20, TypeScript) | High-throughput JSON API; ConnectSW standard |
| Database | PostgreSQL 15 | ACID compliance for audit trail; Prisma ORM |
| Document storage | S3-compatible object storage | AES-256 at rest; signed URLs; 7-year retention |
| Auth | NAS/Tawtheeq OIDC + PKCE | Qatar national identity; no passwords stored in portal |
| CRM | Microsoft Dynamics 365 (OData REST) | QDB's existing case management platform |
| Ports | Web: 3120, API: 5010 | Per ConnectSW PORT-REGISTRY |

---

## 2. C4 Level 1 — Context Diagram

This diagram shows the system in its environment: the people who use it and the external systems
it depends on.

```mermaid
graph TD
    subgraph Applicants["Applicants"]
        SME["SME Owner<br/>Applies for NRGP relief<br/>Uses portal in Arabic or English"]
    end

    subgraph QDBStaff["QDB Staff"]
        RM["Relationship Manager<br/>Reviews manual cases<br/>Works in Dynamics CRM"]
        ADMIN["Program Administrator<br/>Manages eligibility rules,<br/>NRGP list, program lifecycle"]
        COMPLIANCE["Compliance Officer<br/>Exports audit records<br/>Reviews program reports"]
    end

    PORTAL["QDB SME Relief Portal<br/>[Software System]<br/>Emergency financing portal for<br/>NRGP program delivery"]

    subgraph GovernmentSystems["Qatar Government Systems"]
        NAS["NAS / Tawtheeq<br/>[External System]<br/>National Authentication Service<br/>OIDC identity provider"]
        MOCI["MOCI<br/>[External System]<br/>Ministry of Commerce<br/>Company registration data"]
        WPS["WPS<br/>[External System]<br/>Wage Protection System<br/>Ministry of Labor payroll data"]
    end

    subgraph QDBSystems["QDB Internal Systems"]
        CRM["Microsoft Dynamics 365<br/>[External System]<br/>Case management and<br/>disbursement routing"]
        NOTIF["Email + SMS Gateway<br/>[External System]<br/>Applicant status notifications"]
    end

    SME -->|"Applies for relief<br/>Tracks application status<br/>Uploads documents"| PORTAL
    ADMIN -->|"Configures eligibility rules<br/>Uploads NRGP list<br/>Manages program lifecycle"| PORTAL
    COMPLIANCE -->|"Exports audit records<br/>Views program KPIs"| PORTAL

    PORTAL -->|"Redirects for OIDC auth<br/>Receives QID identity claim"| NAS
    PORTAL -->|"Looks up CR number<br/>Retrieves company data<br/>and signatory list"| MOCI
    PORTAL -->|"Validates WPS payroll data<br/>Cross-checks salary obligations"| WPS
    PORTAL -->|"Creates and updates<br/>case records via OData REST"| CRM
    PORTAL -->|"Sends email and SMS<br/>on status changes"| NOTIF

    RM -->|"Reviews portal-created<br/>case records<br/>Makes disbursement decisions"| CRM

    style PORTAL fill:#4c9aff,color:#fff
    style NAS fill:#ff991f,color:#fff
    style MOCI fill:#ff991f,color:#fff
    style WPS fill:#ff991f,color:#fff
    style CRM fill:#6554c0,color:#fff
    style NOTIF fill:#6554c0,color:#fff
```

---

## 3. C4 Level 2 — Container Diagram

This diagram shows the high-level technical building blocks: applications, databases, and
storage systems that make up the QDB SME Relief Portal.

```mermaid
graph TD
    subgraph Users["Users (Browser)"]
        SME["SME Owner"]
        ADMIN["QDB Admin"]
    end

    subgraph Portal["QDB SME Relief Portal — Software System"]
        WEB["Next.js Web App<br/>[Container: TypeScript / Next.js 14]<br/>Applicant application flow<br/>Admin dashboard<br/>Bilingual Arabic/English + RTL<br/>Port 3120"]

        API["Fastify API Service<br/>[Container: TypeScript / Fastify 4]<br/>Business logic + eligibility engine<br/>Audit trail service<br/>CRM routing + document management<br/>Port 5010"]

        DB[("PostgreSQL 15<br/>[Container: Database]<br/>Applications, eligibility snapshots,<br/>NRGP list, audit events,<br/>eligibility rule config")]

        STORE["Object Storage<br/>[Container: S3-compatible]<br/>Uploaded documents<br/>AES-256 encrypted at rest<br/>Signed time-limited access URLs<br/>7-year retention policy"]
    end

    subgraph External["External Systems"]
        NAS["NAS / Tawtheeq<br/>OIDC Provider"]
        MOCI["MOCI API<br/>Company Registry"]
        WPS["WPS API<br/>Payroll Validation"]
        CRM["Dynamics 365 CRM<br/>Case Management"]
        NOTIF["Email + SMS<br/>Gateway"]
    end

    SME -->|"HTTPS — applicant flows"| WEB
    ADMIN -->|"HTTPS + MFA — admin flows"| WEB

    WEB -->|"JSON REST — server-side API calls"| API

    API -->|"Read/write via Prisma ORM<br/>PostgreSQL protocol"| DB
    API -->|"Upload / download via S3 API"| STORE

    API -->|"OIDC PKCE token exchange over HTTPS"| NAS
    API -->|"REST + API key — CR lookup and signatory check"| MOCI
    API -->|"REST + API key — payroll record query"| WPS
    API -->|"OData REST + Azure AD OAuth 2.0 service principal"| CRM
    API -->|"SMTP / SMS API"| NOTIF

    style WEB fill:#4c9aff,color:#fff
    style API fill:#0052cc,color:#fff
    style DB fill:#36b37e,color:#fff
    style STORE fill:#36b37e,color:#fff
    style NAS fill:#ff991f,color:#fff
    style MOCI fill:#ff991f,color:#fff
    style WPS fill:#ff991f,color:#fff
    style CRM fill:#6554c0,color:#fff
    style NOTIF fill:#6554c0,color:#fff
```

> **Current State**: The prototype consists of the Next.js Web App only (port 3120). All external
> API calls and the Fastify API Service, PostgreSQL, and object storage are planned for the
> production build. The prototype mocks all external integrations.

---

## 4. C4 Level 3 — Component Diagram

This diagram shows the internal structure of the two primary containers: the Next.js Web App and
the Fastify API Service.

### 4.1 Next.js Web App — Components

```mermaid
graph TD
    subgraph Browser["Browser"]
        USER["Applicant or Admin Browser"]
    end

    subgraph NextJS["Next.js Web App [Container]"]
        PAGES["Page Router<br/>[Component]<br/>Route definitions for applicant and admin flows<br/>Server-side rendering + middleware auth guard"]

        AUTH_MOD["Auth Module<br/>[Component]<br/>NAS OIDC redirect initiation<br/>PKCE code_verifier + state generation<br/>Callback handler + session cookie setting"]

        APP_FLOW["Application Flow UI<br/>[Component]<br/>Multi-step wizard: language, CR entry,<br/>eligibility result, NRGP routing,<br/>document upload, WPS result, submission"]

        DOC_UP["Document Upload Component<br/>[Component]<br/>File type + size validation (client-side)<br/>Upload progress indicators<br/>Per-document status display"]

        STATUS_UI["Status Tracker UI<br/>[Component]<br/>Application timeline display<br/>CRM status polling integration<br/>Bilingual status labels"]

        ADMIN_UI["Admin Dashboard<br/>[Component]<br/>Application overview table with filters<br/>NRGP list upload + activation<br/>Eligibility rule configuration<br/>Program lifecycle controls<br/>KPI summary panel"]

        I18N["i18n and RTL Module<br/>[Component]<br/>Arabic + English string management<br/>RTL layout switching<br/>Locale-aware date + number formatting"]

        API_CLIENT["API Client Layer<br/>[Component]<br/>Typed fetch wrappers for Fastify API<br/>Error boundary + retry logic<br/>Session token injection"]
    end

    USER -->|"HTTP requests"| PAGES
    PAGES --> AUTH_MOD
    PAGES --> APP_FLOW
    PAGES --> ADMIN_UI
    PAGES --> STATUS_UI

    APP_FLOW --> DOC_UP
    APP_FLOW --> I18N
    ADMIN_UI --> I18N

    AUTH_MOD --> API_CLIENT
    APP_FLOW --> API_CLIENT
    DOC_UP --> API_CLIENT
    STATUS_UI --> API_CLIENT
    ADMIN_UI --> API_CLIENT

    style PAGES fill:#4c9aff,color:#fff
    style AUTH_MOD fill:#0052cc,color:#fff
    style APP_FLOW fill:#0052cc,color:#fff
    style DOC_UP fill:#0052cc,color:#fff
    style STATUS_UI fill:#0052cc,color:#fff
    style ADMIN_UI fill:#0052cc,color:#fff
    style I18N fill:#0052cc,color:#fff
    style API_CLIENT fill:#0052cc,color:#fff
```

### 4.2 Fastify API Service — Components

```mermaid
graph TD
    subgraph FastifyAPI["Fastify API Service [Container]"]
        ROUTER["Route Handler Layer<br/>[Component]<br/>REST endpoints: auth, application,<br/>documents, admin, status<br/>Request validation with JSON Schema"]

        AUTH_SVC["Auth Service<br/>[Component]<br/>NAS token exchange (PKCE)<br/>ID token verification + QID extraction<br/>Portal JWT issuance (access + refresh)<br/>Session management + inactivity timeout"]

        ELIG_ENGINE["Eligibility Engine<br/>[Component]<br/>EC-001 to EC-007 rule evaluation<br/>Rule config loaded from DB<br/>Criteria snapshot for audit<br/>Duplicate application detection"]

        NRGP_SVC["NRGP List Service<br/>[Component]<br/>CSV upload + format validation<br/>CR number lookup (exact + fuzzy)<br/>List versioning + activation<br/>Admin list management"]

        DOC_SVC["Document Service<br/>[Component]<br/>File validation (format + size)<br/>Virus scan integration<br/>S3 upload with AES-256<br/>Signed URL generation<br/>Access control by role"]

        WPS_SVC["WPS Validation Service<br/>[Component]<br/>WPS API query by CR number<br/>CSV file parser (MoL standard format)<br/>Discrepancy calculation<br/>CRM flag generation"]

        CRM_SVC["CRM Integration Service<br/>[Component]<br/>Dynamics 365 OData REST client<br/>auto_nrgp and manual_review case creation<br/>Exponential back-off retry (3 attempts)<br/>Status polling for sync back to portal DB"]

        AUDIT_SVC["Audit Trail Service<br/>[Component]<br/>Append-only event writer<br/>16 event types (auth to lifecycle)<br/>Transactional write guard<br/>Export API for compliance"]

        NOTIF_SVC["Notification Service<br/>[Component]<br/>Email template engine (Arabic + English)<br/>SMS gateway adapter<br/>Retry with 10-min intervals<br/>3-failure escalation to QDB Ops"]

        ADMIN_SVC["Admin Service<br/>[Component]<br/>Eligibility rule CRUD + audit<br/>NRGP list management delegation<br/>Program lifecycle state machine<br/>Application overview + KPI queries"]
    end

    subgraph Data["Data Layer"]
        DB[("PostgreSQL via Prisma ORM")]
        STORE["Object Storage S3-compatible"]
    end

    subgraph Ext["External APIs"]
        NAS_API["NAS OIDC"]
        MOCI_API["MOCI REST"]
        WPS_API["WPS REST"]
        CRM_API["Dynamics 365 OData"]
        GW["Email + SMS Gateway"]
    end

    ROUTER --> AUTH_SVC
    ROUTER --> ELIG_ENGINE
    ROUTER --> NRGP_SVC
    ROUTER --> DOC_SVC
    ROUTER --> WPS_SVC
    ROUTER --> CRM_SVC
    ROUTER --> ADMIN_SVC
    ROUTER --> AUDIT_SVC

    AUTH_SVC --> AUDIT_SVC
    ELIG_ENGINE --> AUDIT_SVC
    ELIG_ENGINE --> DB
    NRGP_SVC --> DB
    DOC_SVC --> STORE
    DOC_SVC --> AUDIT_SVC
    WPS_SVC --> AUDIT_SVC
    CRM_SVC --> DB
    CRM_SVC --> AUDIT_SVC
    NOTIF_SVC --> AUDIT_SVC
    ADMIN_SVC --> DB
    ADMIN_SVC --> AUDIT_SVC
    AUDIT_SVC --> DB

    AUTH_SVC -->|"Token exchange"| NAS_API
    ELIG_ENGINE -->|"Company data"| MOCI_API
    WPS_SVC -->|"Payroll query"| WPS_API
    CRM_SVC -->|"Case creation + polling"| CRM_API
    NOTIF_SVC -->|"Send messages"| GW

    style ROUTER fill:#4c9aff,color:#fff
    style AUTH_SVC fill:#0052cc,color:#fff
    style ELIG_ENGINE fill:#0052cc,color:#fff
    style NRGP_SVC fill:#0052cc,color:#fff
    style DOC_SVC fill:#0052cc,color:#fff
    style WPS_SVC fill:#0052cc,color:#fff
    style CRM_SVC fill:#0052cc,color:#fff
    style AUDIT_SVC fill:#0052cc,color:#fff
    style NOTIF_SVC fill:#0052cc,color:#fff
    style ADMIN_SVC fill:#0052cc,color:#fff
```

---

## 5. Integration Sequence Diagrams

### 5.1 NAS / Tawtheeq OIDC Authentication

```mermaid
sequenceDiagram
    actor SME as SME Owner (Browser)
    participant Portal as Next.js Portal
    participant API as Fastify API
    participant NAS as NAS / Tawtheeq (OIDC)
    participant Audit as Audit Trail Service

    SME->>Portal: GET / — home page
    Portal-->>SME: Render home page with language selector

    SME->>Portal: Click "Apply for Relief"
    Portal->>API: POST /auth/init
    API->>API: Generate PKCE code_verifier + code_challenge
    API->>API: Generate state parameter (CSRF token)
    API-->>Portal: Authorization URL + state cookie
    Portal-->>SME: Redirect to NAS Authorization Endpoint

    SME->>NAS: Authenticate with QID + biometric/OTP
    NAS-->>SME: Authentication challenge

    alt NAS Authentication Successful
        NAS-->>Portal: Redirect to /auth/callback with authorization_code + state
        Portal->>API: POST /auth/callback {code, state}
        API->>API: Validate state matches CSRF token
        API->>NAS: POST /token {code, code_verifier, client_id, client_secret}
        NAS-->>API: ID Token (JWT with QID claim) + Access Token
        API->>API: Verify ID Token signature, expiry, audience
        API->>API: Extract QID from ID Token claims
        API->>API: Create portal session (JWT access + refresh token pair)
        API->>Audit: Log: auth_success {QID, timestamp, NAS assurance_level}
        API-->>Portal: Session tokens set as httpOnly cookies
        Portal-->>SME: Redirect to /apply/start

    else NAS Authentication Failed
        NAS-->>Portal: Redirect with error=access_denied
        Portal->>API: POST /auth/callback {error}
        API->>Audit: Log: auth_failure {timestamp, error_code, no QID}
        API-->>Portal: 401 with error detail
        Portal-->>SME: Display: "Authentication failed. Please retry or contact QDB Operations."

    else NAS Unavailable
        API->>NAS: Authorization request times out after 10s
        API->>Audit: Log: auth_failure {timestamp, error_code: nas_timeout}
        API-->>Portal: 503 with error detail
        Portal-->>SME: Display: "National authentication unavailable. Try again in 30 minutes."
    end
```

---

### 5.2 MOCI Commercial Registration Lookup

```mermaid
sequenceDiagram
    actor SME as SME Owner (Browser)
    participant Portal as Next.js Portal
    participant API as Fastify API
    participant MOCI as MOCI API
    participant Audit as Audit Trail Service

    SME->>Portal: Enter CR number + click "Verify Company"
    Portal->>Portal: Client-side format check (10-digit numeric)

    Portal->>API: POST /application/verify-cr {cr_number}
    API->>API: Retrieve QID from session
    API->>MOCI: GET /company/{cr_number} with Authorization API key

    alt MOCI responds within 3 seconds — CR found and active
        MOCI-->>API: 200 OK {name_ar, name_en, status, sector, reg_date, shareholders[]}
        API->>API: Check CR status — must be "active"
        API->>API: Cross-reference authenticated QID with shareholders list

        alt QID matches authorized signatory
            API->>Audit: Log: cr_lookup_success {cr, name, signatory_verified: true}
            API-->>Portal: 200 {company_data, signatory_status: verified}
            Portal-->>SME: Display read-only company details + Confirm and Continue

        else QID not in signatory list
            API->>Audit: Log: cr_lookup_success {cr, signatory_verified: false, reason: qid_not_found}
            API-->>Portal: 200 {company_data, signatory_status: not_authorized}
            Portal-->>SME: Display: "You are not listed as authorized signatory. Contact QDB Operations."

        else MOCI returns no signatory data
            API->>Audit: Log: cr_lookup_success {cr, signatory_check: declaration_required}
            API-->>Portal: 200 {company_data, signatory_status: declaration_required}
            Portal-->>SME: Display company details + statutory declaration checkbox
        end

    else CR status inactive or suspended or cancelled
        API->>Audit: Log: cr_lookup_failed {cr, reason: inactive_status}
        API-->>Portal: 422 {error: cr_inactive, status_value}
        Portal-->>SME: Display: "CR status is inactive. Application cannot proceed."

    else CR not found — 404
        MOCI-->>API: 404 Not Found
        API->>Audit: Log: cr_lookup_failed {cr, reason: not_found}
        API-->>Portal: 404 {error: cr_not_found}
        Portal-->>SME: Display: "CR not found in MOCI. Verify and retry."

    else MOCI unavailable — timeout or 5xx
        API->>Audit: Log: cr_lookup_failed {cr, reason: moci_unavailable}
        API-->>Portal: 503 {error: moci_unavailable}
        Portal-->>SME: Display: "Company verification temporarily unavailable. Progress saved."
    end
```

---

### 5.3 WPS Payroll Validation

```mermaid
sequenceDiagram
    participant API as Fastify API
    participant WPS_SVC as WPS Validation Service
    participant WPS as WPS API (Ministry of Labor)
    participant Audit as Audit Trail Service
    participant CRM as Dynamics 365 CRM

    Note over API,CRM: Triggered after document upload step

    API->>WPS_SVC: ValidateWPS {cr_number, declared_amount, wps_file_data?}

    WPS_SVC->>WPS: GET /payroll/{cr_number}?months=3
    Note over WPS_SVC,WPS: Retrieves last 90 days of payroll records

    alt WPS API responds — records found
        WPS-->>WPS_SVC: {employee_count, monthly_payroll[], total_3mo, payment_dates[]}
        WPS_SVC->>WPS_SVC: Calculate discrepancy vs declared_amount

        alt Discrepancy within 10 percent
            WPS_SVC->>Audit: Log: wps_validation {cr, result: pass, discrepancy_pct, wps_total, declared}
            WPS_SVC-->>API: {result: pass, wps_employee_count, wps_total, discrepancy_pct}
            API->>CRM: PATCH /cases/{id} {wps_result: pass}

        else Discrepancy exceeds 10 percent
            WPS_SVC->>Audit: Log: wps_validation {cr, result: discrepancy, discrepancy_pct}
            WPS_SVC-->>API: {result: discrepancy, discrepancy_pct, wps_total, declared}
            API->>CRM: PATCH /cases/{id} {wps_result: discrepancy, wps_discrepancy_pct}
            Note over API: Case flagged for manual review — not blocked
        end

    else WPS API returns no records for CR
        WPS-->>WPS_SVC: 200 {records: []}
        WPS_SVC->>Audit: Log: wps_validation {cr, result: no_records}
        WPS_SVC-->>API: {result: no_records}
        API->>CRM: PATCH /cases/{id} {wps_result: no_records, manual_salary_verify: true}

    else WPS API unavailable
        WPS_SVC->>Audit: Log: wps_validation {cr, result: api_unavailable}
        Note over WPS_SVC: Fall back to uploaded WPS CSV file if provided
        WPS_SVC-->>API: {result: api_fallback, source: uploaded_file}
        API->>CRM: PATCH /cases/{id} {wps_result: api_fallback}
    end
```

---

### 5.4 Dynamics CRM Case Creation and Routing

```mermaid
sequenceDiagram
    participant API as Fastify API
    participant NRGP as NRGP List Service
    participant CRM_SVC as CRM Integration Service
    participant CRM as Dynamics 365 CRM
    participant Audit as Audit Trail Service
    participant NOTIF as Notification Service

    Note over API,NOTIF: Triggered after eligibility check passes

    API->>NRGP: LookupCR {cr_number}
    NRGP->>NRGP: Query NRGP beneficiary list (exact + fuzzy match)
    NRGP-->>API: {match: true/false, match_type, list_version}
    API->>Audit: Log: nrgp_check {cr, match_result, list_version, timestamp}

    alt CR found in NRGP list — auto-disbursement path
        API->>CRM_SVC: CreateCase {type: auto_nrgp, status: pending_disbursement, payload}
        Note over CRM_SVC,CRM: Payload includes company name, CR, QID, eligibility snapshot,<br/>NRGP match, WPS result, and document URLs
        CRM_SVC->>CRM: POST /api/data/v9.2/incidents {case_data}

        alt CRM responds within 5 seconds
            CRM-->>CRM_SVC: 201 Created {case_id}
            CRM_SVC->>Audit: Log: crm_case_created {case_id, type: auto_nrgp, cr, timestamp}
            CRM_SVC-->>API: {case_id, type: auto_nrgp}
            API->>NOTIF: SendNotification {event: case_created, case_id, path: auto}

        else CRM unavailable — retry with back-off
            loop Up to 3 retries with exponential back-off (2s, 4s, 8s)
                CRM_SVC->>CRM: POST /api/data/v9.2/incidents {case_data}
            end
            CRM_SVC->>Audit: Log: crm_case_failed {cr, error, retry_count: 3}
            CRM_SVC-->>API: {queued: true, expected_within: 2h}
            Note over API: Application state preserved — QDB Ops alerted
        end

    else CR not found in NRGP list — manual review path
        API->>CRM_SVC: CreateCase {type: manual_review, status: pending_review, payload}
        CRM_SVC->>CRM: POST /api/data/v9.2/incidents {case_data}
        CRM-->>CRM_SVC: 201 Created {case_id}
        CRM_SVC->>Audit: Log: crm_case_created {case_id, type: manual_review, cr, timestamp}
        CRM_SVC-->>API: {case_id, type: manual_review}
        API->>NOTIF: SendNotification {event: case_created, case_id, path: manual}
    end
```

---

## 6. End-to-End Data Flow

This diagram shows how data moves through the system from the moment an applicant starts to the
point their case is ready for disbursement in Dynamics CRM.

```mermaid
flowchart TD
    A["SME Owner visits portal"] --> B{"Language selected?"}
    B -->|"Arabic"| C["Load Arabic RTL layout"]
    B -->|"English"| D["Load English LTR layout"]
    C --> E["NAS OIDC redirect"]
    D --> E

    E --> F{"NAS auth result?"}
    F -->|"Success"| G["QID extracted from ID Token<br/>Portal session created<br/>Audit: auth_success"]
    F -->|"Failure"| Z1["Error displayed — no session<br/>Application ends"]

    G --> H["SME enters CR number"]
    H --> I["MOCI API query — company data retrieved"]
    I --> J{"CR status?"}
    J -->|"Active + signatory OK"| K["Company data displayed (read-only)<br/>Audit: cr_lookup_success"]
    J -->|"Inactive"| Z2["Application blocked<br/>Audit: cr_lookup_failed"]
    J -->|"Signatory mismatch"| Z3["Blocked or declaration captured<br/>Audit: signatory_check"]

    K --> L["Eligibility Engine runs EC-001 through EC-007"]
    L --> M{"All criteria pass?"}
    M -->|"No"| Z4["Ineligible result — reason codes shown<br/>Email notification sent<br/>Audit: eligibility_result"]
    M -->|"Yes"| N["Duplicate check — same CR in current period?"]
    N -->|"Duplicate"| Z5["Existing case referenced<br/>No new application created"]
    N -->|"No duplicate"| O["NRGP list lookup by CR number"]

    O --> P{"NRGP match?"}
    P -->|"Yes — returning beneficiary"| Q["CRM: auto_nrgp case<br/>status: pending_disbursement"]
    P -->|"No — new applicant"| R["CRM: manual_review case<br/>status: pending_review"]

    Q --> S["Document upload step"]
    R --> S

    S --> T["Files virus scanned<br/>Format + size validated<br/>AES-256 encrypted to S3"]
    T --> U["WPS validation — API query + CSV cross-check"]
    U --> V{"WPS result?"}
    V -->|"Pass"| W["WPS validated<br/>Audit: wps_validation pass"]
    V -->|"Discrepancy"| X["WPS discrepancy flag set on CRM case<br/>Non-blocking warning shown<br/>Audit: wps_validation discrepancy"]
    V -->|"Unavailable"| Y["WPS fallback flag — manual salary verification<br/>Audit: wps_api_fallback"]

    W --> AA["Applicant clicks Submit"]
    X --> AA
    Y --> AA

    AA --> BB["Audit trail finalised<br/>All events written transactionally"]
    BB --> CC["CRM case updated with document URLs + WPS result"]
    CC --> DD["Email + SMS notification sent in applicant language"]
    DD --> EE["Applicant monitors status via portal<br/>Portal polls CRM every 5 minutes"]

    style G fill:#36b37e,color:#fff
    style K fill:#36b37e,color:#fff
    style Q fill:#4c9aff,color:#fff
    style R fill:#6554c0,color:#fff
    style EE fill:#36b37e,color:#fff
    style Z1 fill:#ff6b6b,color:#fff
    style Z2 fill:#ff6b6b,color:#fff
    style Z3 fill:#ff991f,color:#fff
    style Z4 fill:#ff6b6b,color:#fff
    style Z5 fill:#ff991f,color:#fff
```

---

## 7. Data Model — ER Diagram

The planned PostgreSQL data model for the production system. All tables use UUID primary keys
except `audit_events` which uses sequential IDs for ordered export.

```mermaid
erDiagram
    applications {
        uuid id PK
        varchar cr_number
        varchar qid
        varchar company_name_ar
        varchar company_name_en
        varchar company_sector
        date company_registered_at
        varchar signatory_status
        varchar signatory_declaration_text
        varchar eligibility_status
        jsonb eligibility_snapshot
        varchar nrgp_match_type
        varchar nrgp_list_version
        varchar crm_case_id
        varchar crm_case_type
        varchar application_status
        varchar language_preference
        varchar declared_salary_amount
        varchar declared_rent_amount
        timestamp submitted_at
        timestamp created_at
        timestamp updated_at
    }

    eligibility_results {
        uuid id PK
        uuid application_id FK
        boolean overall_eligible
        jsonb criteria_results
        jsonb criteria_snapshot
        timestamp evaluated_at
    }

    documents {
        uuid id PK
        uuid application_id FK
        varchar doc_type
        varchar original_filename
        varchar storage_path
        bigint file_size_bytes
        varchar mime_type
        varchar checksum_sha256
        varchar virus_scan_status
        varchar upload_status
        timestamp uploaded_at
    }

    wps_validations {
        uuid id PK
        uuid application_id FK
        integer wps_employee_count
        decimal wps_total_3mo
        jsonb wps_monthly_breakdown
        decimal declared_amount
        decimal discrepancy_pct
        varchar validation_result
        varchar data_source
        timestamp validated_at
    }

    audit_events {
        bigint id PK
        varchar event_type
        timestamp timestamp_utc
        varchar actor_qid
        varchar session_id
        uuid application_id FK
        text input_summary
        text output_summary
        varchar data_source_id
        jsonb criteria_snapshot
        varchar crm_case_id
    }

    nrgp_list {
        uuid id PK
        varchar cr_number
        varchar list_version
        boolean is_active
        timestamp activated_at
        varchar activated_by_qid
    }

    nrgp_list_versions {
        uuid id PK
        varchar version_id
        integer record_count
        varchar file_checksum
        boolean is_active
        timestamp uploaded_at
        varchar uploaded_by_qid
    }

    eligibility_rules {
        uuid id PK
        varchar criterion_id
        varchar criterion_name
        boolean is_mandatory
        jsonb rule_parameters
        boolean is_active
        timestamp effective_from
        varchar changed_by_qid
    }

    program_config {
        uuid id PK
        varchar program_status
        date program_start_date
        date program_end_date
        integer session_timeout_minutes
        varchar changed_by_qid
        timestamp changed_at
    }

    applications ||--o{ documents : "has"
    applications ||--|| eligibility_results : "has one"
    applications ||--o| wps_validations : "has one"
    applications ||--o{ audit_events : "generates"
    nrgp_list }o--|| nrgp_list_versions : "belongs to version"
```

---

## 8. Application State Machine

An application moves through a defined set of states from draft to final outcome. State
transitions are enforced by the API and recorded in the audit trail at every step.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : SME authenticated via NAS

    DRAFT --> COMPANY_VERIFIED : MOCI lookup succeeds + signatory confirmed
    DRAFT --> ABANDONED : Session expires (30 min idle) or applicant leaves

    COMPANY_VERIFIED --> INELIGIBLE : Eligibility engine returns INELIGIBLE
    COMPANY_VERIFIED --> ELIGIBLE : All 7 eligibility criteria pass

    INELIGIBLE --> [*] : Notification sent — application closed

    ELIGIBLE --> DOCS_PENDING : CRM case created (auto or manual path)

    DOCS_PENDING --> DOCS_SUBMITTED : All required documents validated

    DOCS_SUBMITTED --> WPS_VALIDATED : WPS validation passes — no discrepancy
    DOCS_SUBMITTED --> WPS_FLAGGED : WPS discrepancy or WPS API unavailable

    WPS_VALIDATED --> SUBMITTED : Applicant clicks Submit — audit trail complete
    WPS_FLAGGED --> SUBMITTED : Applicant clicks Submit — manual review flag set on CRM case

    SUBMITTED --> UNDER_REVIEW : QDB RM opens case (manual_review path only)
    SUBMITTED --> APPROVED : auto_nrgp path — no manual review required

    UNDER_REVIEW --> APPROVED : QDB RM approves
    UNDER_REVIEW --> REJECTED : QDB RM rejects

    APPROVED --> DISBURSED : QDB Finance processes funds transfer

    REJECTED --> [*] : Rejection notification sent with reason

    DISBURSED --> [*] : Disbursement confirmed — SME receives relief

    ABANDONED --> [*] : Application data purged after 30 days
```

---

## 9. Security Architecture

### 9.1 Authentication and Session Management

```mermaid
flowchart TD
    subgraph Auth["Authentication Layer"]
        A["SME arrives at portal"] --> B["PKCE flow initiated<br/>code_verifier stored server-side<br/>state token for CSRF protection"]
        B --> C["NAS / Tawtheeq OIDC"]
        C --> D["ID Token received<br/>Signature verified<br/>QID extracted"]
        D --> E["Portal JWT pair issued<br/>Access token: 30 min lifetime<br/>Refresh token: 8 hr absolute maximum"]
        E --> F["Tokens in httpOnly cookies<br/>Secure + SameSite=Strict"]
    end

    subgraph Session["Session Management"]
        F --> G["Every request validated against access token"]
        G --> H{"Token expired?"}
        H -->|"No"| I["Request proceeds"]
        H -->|"Yes — within 8hr window"| J["Refresh token used<br/>New access token issued"]
        H -->|"Yes — 8hr absolute reached"| K["Session terminated<br/>User returned to NAS login"]
        J --> I
    end

    subgraph Admin["Admin Authentication"]
        L["QDB Admin arrives"] --> M["Azure AD or NAS with MFA required"]
        M --> N["Admin role claim verified"]
        N --> O["Separate admin JWT issued<br/>Scoped to admin routes only"]
    end
```

### 9.2 Document Security Model

| Layer | Control | Implementation |
|-------|---------|----------------|
| Transport | TLS 1.3 minimum | All HTTP requests rejected and redirected to HTTPS |
| Storage encryption | AES-256 at rest | Applied before write, verified on read |
| Key management | KMS — not co-located with data | Keys rotated per KMS policy |
| Access URLs | Signed, time-limited | 1-hour expiry; scoped to requesting user's case |
| Virus scanning | Pre-activation scan | Files quarantined on detection; applicant notified |
| Retention | Enforced at storage tier | 7-year minimum per QDB policy and Qatar PDPA |
| Role-based access | Applicant: own docs only | QDB staff: all docs by case; Audit: read-only export |

### 9.3 Audit Trail Integrity

The audit trail is a core compliance requirement for a government-administered financial relief
program. Its integrity is enforced at multiple levels.

```mermaid
flowchart LR
    A["Application step begins"] --> B["Business logic executes"]
    B --> C["Audit write attempted"]
    C --> D{"Audit write succeeded?"}
    D -->|"Yes"| E["Step marked complete<br/>Response returned to client"]
    D -->|"No"| F["Retry up to 3 times"]
    F --> G{"Retries exhausted?"}
    G -->|"No — retry"| C
    G -->|"Yes — all failed"| H["QDB IT alerted<br/>Application placed in manual hold<br/>Step NOT marked complete"]
```

Database-level protections on `audit_events`:

- `REVOKE UPDATE, DELETE ON audit_events FROM application_role` — the application service account
  cannot modify or delete audit records
- Only the append-only writer role holds INSERT permissions
- Any direct UPDATE or DELETE attempt against the audit table triggers a monitoring alert
- Full export available to the Compliance Officer via admin API as JSON or CSV, in chronological
  order with criteria snapshots

### 9.4 Rate Limiting and Fraud Controls

| Control | Rule | Enforcement |
|---------|------|-------------|
| Application rate limit | Max 3 attempts per CR per 24 hours | API-level rate limiter keyed on CR number |
| Duplicate detection | One active application per CR per program period | Eligibility engine check before NRGP lookup |
| Document URL forgery | Signed URLs with 1-hour TTL | S3 pre-signed URL with HMAC signature |
| Admin brute force | MFA required; account lockout after 5 failed attempts | Azure AD or NAS policy |
| Session fixation | New session ID issued after NAS auth callback | PKCE state parameter invalidated after use |
| CR format injection | Strict 10-digit numeric validation | Client and API-level schema validation |

### 9.5 Qatar PDPA Compliance

| Requirement | Implementation |
|-------------|----------------|
| Data minimisation | MOCI company data not persisted beyond session; only summary stored in DB |
| Purpose limitation | Data collected solely for NRGP application processing |
| Retention limits | 7-year minimum; automated purge policy after retention period |
| Data subject access | Applicant can view own application data and status via the portal |
| Consent | Explicit consent captured at application start and recorded in audit trail |
| Cross-border transfers | All data stored within Qatar or QDB-approved jurisdiction |
| PDPA impact assessment | Required before production launch (NFR-011) — must be signed off by DPO |
