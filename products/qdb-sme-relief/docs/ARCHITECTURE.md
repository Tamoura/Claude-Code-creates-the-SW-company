# QDB SME Relief Portal — Architecture Document

**Product**: QDB SME Relief Portal
**Version**: 1.0
**Date**: March 3, 2026
**Status**: Sprint 0 — Architecture Review Complete

---

## Table of Contents

1. [C4 Level 1 — System Context](#c4-level-1--system-context)
2. [C4 Level 2 — Container Diagram](#c4-level-2--container-diagram)
3. [C4 Level 3 — Component Diagram (Web App)](#c4-level-3--component-diagram-web-app)
4. [Data Flow Diagram](#data-flow-diagram)
5. [Application State Machine](#application-state-machine)
6. [Authentication Sequence — NAS PKCE OIDC](#authentication-sequence--nas-pkce-oidc)
7. [Integration Architecture](#integration-architecture)
8. [Database Schema — ER Diagram](#database-schema--er-diagram)
9. [Deployment Architecture](#deployment-architecture)
10. [Key Architectural Decisions](#key-architectural-decisions)
11. [Non-Functional Requirements — Architecture Implications](#non-functional-requirements--architecture-implications)

---

## C4 Level 1 — System Context

```mermaid
graph TD
    subgraph "Users"
        SME_OWNER["SME Owner / Authorized Signatory\n(Khalid — Primary Applicant)\nArabic or English language\nDesktop or mobile browser"]
        QDB_RM["QDB Relationship Manager\n(Fatima)\nReviews manual disbursement cases\nWorks in Dynamics CRM"]
        QDB_ADMIN["QDB Administrator\n(Mohammed — Program Manager)\nManages NRGP list, eligibility rules\nProgram lifecycle control"]
    end

    subgraph "QDB SME Relief Portal"
        PORTAL["QDB SME Relief Portal\nبوابة دعم المنشآت الصغيرة والمتوسطة\n\nEmergency financing portal for NRGP program\nBilingual Arabic + English\nWeb application"]
    end

    subgraph "Qatar Government Services"
        NAS["Tawtheeq / NAS\nQatar National Authentication Service\nOIDC identity provider\nQID claims"]
        MOCI["MOCI\nMinistry of Commerce and Industry\nCR number lookup\nCompany data + signatory verification"]
        WPS["WPS\nWage Protection System\nMinistry of Labour\nPayroll validation"]
    end

    subgraph "QDB Internal Systems"
        CRM["Microsoft Dynamics 365 CRM\nQDB Case Management\nAuto + manual disbursement cases\nRelationship Manager workspace"]
        DOCS["Document Storage\nAzure Blob Storage\nQatar-resident region\nAES-256 encrypted at rest"]
        SMS_EMAIL["Notification Service\nEmail + SMS\nBilingual notifications\nStatus change alerts"]
    end

    SME_OWNER -->|"Applies for relief\nUploads documents\nTracks status"| PORTAL
    QDB_ADMIN -->|"Manages program\nUploads NRGP list\nConfigures rules"| PORTAL
    QDB_RM -->|"Views cases created\nby portal"| CRM

    PORTAL -->|"OIDC Authorization\nCode + PKCE\nQID authentication"| NAS
    PORTAL -->|"CR number lookup\nCompany data\nSignatory list"| MOCI
    PORTAL -->|"Payroll validation\nLast 90 days\nWPS API or CSV"| WPS
    PORTAL -->|"Create + update\ndisbursement cases\nOData v4 REST"| CRM
    PORTAL -->|"Encrypted upload\nSigned URL access\nDocument linking"| DOCS
    PORTAL -->|"Status change\nnotifications\nArabic + English"| SMS_EMAIL

    style PORTAL fill:#339af0,color:#fff
    style SME_OWNER fill:#ffa94d,color:#000
    style QDB_RM fill:#ffa94d,color:#000
    style QDB_ADMIN fill:#ffa94d,color:#000
    style NAS fill:#ff9900,color:#fff
    style MOCI fill:#ff9900,color:#fff
    style WPS fill:#ff9900,color:#fff
    style CRM fill:#9b59b6,color:#fff
    style DOCS fill:#9b59b6,color:#fff
```

---

## C4 Level 2 — Container Diagram

```mermaid
graph TD
    subgraph "Browser"
        BROWSER["SME Owner Browser\nDesktop or Mobile"]
        ADMIN_BROWSER["QDB Admin Browser\nQDB Internal Network"]
    end

    subgraph "QDB SME Relief Portal — Deployable Containers"
        subgraph "Frontend"
            WEB["Web Application\nNext.js 14 / React 18\nTypeScript\nTailwind CSS\nPort 3120\n\nServer-side rendered\nArabic RTL support\nBilingual i18n\nWCAG 2.1 AA"]
        end

        subgraph "Backend"
            API["API Server\nFastify 4\nTypeScript\nPort 5014\n\nREST JSON API\nJWT session management\nIntegration orchestration\nAudit trail service"]
        end

        subgraph "Data Stores"
            PG["PostgreSQL 15+\nApplications\nEligibility criteria\nNRGP list\nAudit log\nNotifications"]
            REDIS["Redis 7+\nSession tokens\nAPI response cache\nCRM polling state"]
        end

        subgraph "File Storage"
            BLOB["Document Store\nAzure Blob Storage\nQatar-resident region\nAES-256 at rest\n7-year retention\nSigned URL access"]
        end
    end

    subgraph "External Services"
        NAS["Tawtheeq / NAS\nOIDC Provider"]
        MOCI["MOCI API"]
        WPS["WPS API\nMinistry of Labour"]
        CRM["Dynamics 365 CRM"]
        NOTIFY["Email + SMS\nGateway"]
        KMS["Key Management\nService\nEncryption keys"]
    end

    BROWSER -->|"HTTPS / TLS 1.3"| WEB
    ADMIN_BROWSER -->|"HTTPS / TLS 1.3"| WEB
    WEB -->|"JSON API calls\nBearer JWT"| API
    API -->|"Prisma ORM\nSQL"| PG
    API -->|"Redis client\nJSON"| REDIS
    API -->|"Multipart upload\nSigned URL generation"| BLOB
    BLOB -.->|"KMS key lookup"| KMS
    API -->|"OIDC PKCE\nToken exchange"| NAS
    API -->|"CR lookup\nAPI Key"| MOCI
    API -->|"Payroll query\nService token"| WPS
    API -->|"Case create/update\nOAuth 2.0"| CRM
    API -->|"Email HTML\nSMS text"| NOTIFY

    style WEB fill:#339af0,color:#fff
    style API fill:#339af0,color:#fff
    style PG fill:#51cf66,color:#000
    style REDIS fill:#ffd43b,color:#000
    style BLOB fill:#51cf66,color:#000
```

---

## C4 Level 3 — Component Diagram (Web App)

```mermaid
graph TD
    subgraph "Web Application — Internal Components"
        subgraph "Public Pages"
            HOME["Home Page\n/ route\nLanguage selector\nProgram overview"]
            HELP["Help / FAQ\n/help route\nContact information"]
        end

        subgraph "Applicant Flow"
            AUTH_MOD["Auth Module\n/auth/login + /auth/callback\nNAS PKCE initiation\nSession establishment"]
            CR_MOD["Company Verification Module\n/apply/company\nCR number entry\nMOCI data display\nSignatory confirmation"]
            ELIG_MOD["Eligibility Module\n/apply/eligibility\n7-criteria display\nPass/fail result\nReason codes AR + EN"]
            NRGP_MOD["NRGP Checker\n/apply/nrgp-check\nAuto vs manual path\nCase ID display"]
            DOC_MOD["Document Upload Module\n/apply/documents\nFile type validation\nVirus scan status\nUpload progress"]
            REVIEW_MOD["Review Module\n/apply/review\nPre-submission summary"]
            CONFIRM_MOD["Confirmation Module\n/apply/confirmation\nCase ID + timeline"]
            STATUS_MOD["Status Module\n/status\nTimeline view\nCRM status sync"]
        end

        subgraph "Admin Section"
            ADMIN_MOD["Admin Dashboard\n/admin\nApplication table\nKPI metrics"]
            NRGP_ADMIN["NRGP List Manager\n/admin/nrgp-list\nCSV upload + validate\nList activation"]
            ELIG_ADMIN["Eligibility Rules Editor\n/admin/eligibility-rules\nRule parameter editor"]
            LIFECYCLE_MOD["Program Lifecycle Controller\n/admin/program-lifecycle\nOpen / Paused / Closed"]
        end

        subgraph "Shared Infrastructure"
            I18N["i18n Layer\nArabic + English\nRTL layout switching"]
            API_CLIENT["API Client\nFetch wrapper\nJWT attachment"]
            SESSION["Session Manager\n30-min inactivity\nAuto-logout"]
        end
    end

    subgraph "API Server"
        API_SERVER["Fastify API\nPort 5014"]
    end

    AUTH_MOD --> API_CLIENT
    CR_MOD --> API_CLIENT
    ELIG_MOD --> API_CLIENT
    DOC_MOD --> API_CLIENT
    STATUS_MOD --> API_CLIENT
    ADMIN_MOD --> API_CLIENT
    NRGP_ADMIN --> API_CLIENT
    API_CLIENT -->|"JSON REST"| API_SERVER
    SESSION -->|"Auth guard"| CR_MOD
    SESSION -->|"Auth guard"| ADMIN_MOD
```

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Step 1: Auth"
        NAS_IDP["NAS / Tawtheeq"]
        AUTH_SVC["Auth Service\nPKCE token exchange"]
        QID["QID Claim\nin session"]
    end

    subgraph "Step 2: Company"
        MOCI_SVC["MOCI API"]
        CR_DATA["Verified company data\nName, status, shareholders"]
    end

    subgraph "Step 3: Eligibility"
        ELIG_ENGINE["Eligibility Engine\n7 criteria EC-001 to EC-007"]
        CRITERIA_DB["PostgreSQL\nEligibilityCriteria table"]
        ELIG_RESULT["Eligibility result\nbool + per-criterion"]
    end

    subgraph "Step 4: NRGP"
        NRGP_DB["PostgreSQL\nNrgpList table"]
        ROUTE_DECISION{{"Route\nDecision"}}
    end

    subgraph "Step 5: CRM"
        CRM_SVC["Dynamics 365 CRM"]
        CASE_AUTO["auto_nrgp case\nCAS-XXXX"]
        CASE_MANUAL["manual_review case\nCAS-XXXX"]
    end

    subgraph "Step 6: Docs + WPS"
        BLOB_STORE["Azure Blob\nAES-256 encrypted"]
        WPS_SVC["WPS API\nPayroll records"]
    end

    subgraph "Step 7: Audit"
        AUDIT_LOG["PostgreSQL\nAuditLog\nAppend-only"]
    end

    NAS_IDP -->|"ID Token + QID"| AUTH_SVC
    AUTH_SVC --> QID
    QID --> MOCI_SVC
    MOCI_SVC --> CR_DATA
    CR_DATA --> ELIG_ENGINE
    CRITERIA_DB -->|"Rule snapshot"| ELIG_ENGINE
    ELIG_ENGINE --> ELIG_RESULT
    ELIG_RESULT -->|"Eligible"| NRGP_DB
    NRGP_DB --> ROUTE_DECISION
    ROUTE_DECISION -->|"NRGP match"| CASE_AUTO
    ROUTE_DECISION -->|"No match"| CASE_MANUAL
    CASE_AUTO --> CRM_SVC
    CASE_MANUAL --> CRM_SVC
    WPS_SVC --> BLOB_STORE
    BLOB_STORE -->|"Document URLs"| CRM_SVC
    AUTH_SVC -->|"auth_success event"| AUDIT_LOG
    ELIG_ENGINE -->|"eligibility_result event"| AUDIT_LOG
    CRM_SVC -->|"crm_case_created event"| AUDIT_LOG
    BLOB_STORE -->|"document_uploaded event"| AUDIT_LOG
```

---

## Application State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Applicant authenticated via NAS\nSession created

    DRAFT --> COMPANY_VERIFIED : CR lookup succeeds\nSignatory confirmed
    DRAFT --> ABANDONED : Session expires after 30 min

    COMPANY_VERIFIED --> INELIGIBLE : Eligibility check fails
    COMPANY_VERIFIED --> ELIGIBLE : All 7 criteria pass

    INELIGIBLE --> [*] : Email notification sent\nApplication closed

    ELIGIBLE --> DOCS_PENDING : CRM case created\nauto_nrgp or manual_review

    DOCS_PENDING --> DOCS_SUBMITTED : All required documents uploaded

    DOCS_SUBMITTED --> WPS_VALIDATED : WPS validation passes

    DOCS_SUBMITTED --> WPS_FLAGGED : WPS discrepancy over 10%\nor WPS API unavailable

    WPS_VALIDATED --> SUBMITTED : Applicant clicks Submit

    WPS_FLAGGED --> SUBMITTED : Applicant clicks Submit\nwps_discrepancy flag set

    SUBMITTED --> UNDER_REVIEW : QDB RM picks up case\nmanual_review path only

    SUBMITTED --> APPROVED : Auto path\nNRGP pre-vetted

    UNDER_REVIEW --> APPROVED : QDB RM approves
    UNDER_REVIEW --> REJECTED : QDB RM rejects

    APPROVED --> DISBURSED : QDB processes funds

    REJECTED --> [*] : Rejection notification sent

    DISBURSED --> [*] : Disbursement confirmed

    ABANDONED --> [*] : Application data purged after 30 days
```

---

## Authentication Sequence — NAS PKCE OIDC

```mermaid
sequenceDiagram
    actor SME as SME Owner (Browser)
    participant Portal as QDB Relief Portal
    participant NAS as Tawtheeq / NAS (OIDC Provider)
    participant AuditLog as Audit Service (PostgreSQL)

    SME->>Portal: GET / (home page)
    Portal-->>SME: Render: language selector + Apply button

    SME->>Portal: Click Apply for Relief
    Portal->>Portal: Generate PKCE code_verifier (random 256-bit)
    Portal->>Portal: Compute code_challenge = BASE64URL(SHA256(code_verifier))
    Portal->>Portal: Generate state = random CSRF token
    Portal-->>SME: HTTP 302 Redirect to NAS Authorization Endpoint

    Note over SME,NAS: GET /authorize?client_id=qdb-relief-portal&response_type=code<br/>&scope=openid qid profile&code_challenge={challenge}&code_challenge_method=S256

    SME->>NAS: Authenticate with Tawtheeq (QID + biometric / OTP)

    alt Authentication Successful
        NAS-->>Portal: HTTP 302 to /auth/callback?code={auth_code}&state={state}
        Portal->>Portal: Verify state matches stored CSRF token
        Portal->>NAS: POST /token {code, code_verifier, client_id, client_secret}
        NAS-->>Portal: ID Token (signed JWT) + Access Token
        Portal->>Portal: Verify ID Token: signature, exp, aud, iss
        Portal->>Portal: Extract QID from id_token.claims.qid
        Portal->>Portal: Create portal session JWT (access + refresh)
        Portal->>AuditLog: INSERT: auth_success {QID, timestamp, NAS assurance_level}
        Portal-->>SME: HTTP 302 to /apply/company with session cookie

    else Authentication Failed
        NAS-->>Portal: HTTP 302 to /auth/callback?error=access_denied
        Portal->>AuditLog: INSERT: auth_failure {timestamp, error: access_denied}
        Portal-->>SME: Error: Authentication failed. Retry or contact QDB Operations.

    else NAS Unavailable (timeout over 10 seconds)
        Portal->>AuditLog: INSERT: auth_failure {timestamp, error: nas_timeout}
        Portal-->>SME: Service unavailable. Try again in 30 minutes.
    end
```

---

## Integration Architecture

```mermaid
graph TD
    subgraph "QDB Relief Portal API — Fastify"
        AUTH_CTRL["Auth Controller\n/api/v1/auth/..."]
        COMPANY_CTRL["Company Controller\n/api/v1/company/..."]
        APP_CTRL["Application Controller\n/api/v1/applications/..."]
        DOC_CTRL["Document Controller\n/api/v1/applications/:id/documents"]
        WPS_CTRL["WPS Controller\n/api/v1/.../wps/validate"]
        CRM_CTRL["CRM Controller\n/api/v1/.../submit-to-crm"]
        ADMIN_CTRL["Admin Controller\n/api/v1/admin/..."]
    end

    subgraph "Integration Adapters"
        NAS_ADAPTER["NAS Adapter\nOIDC PKCE flow\nToken validation"]
        MOCI_ADAPTER["MOCI Adapter\nREST client\nAPI key auth\n3s timeout"]
        WPS_ADAPTER["WPS Adapter\nREST client\nMOU service token\nFallback to CSV"]
        CRM_ADAPTER["Dynamics CRM Adapter\nOAuth 2.0 client credentials\n3x retry exponential backoff"]
        BLOB_ADAPTER["Document Storage Adapter\nAzure SDK\nAES-256 encrypt on write\nSigned URL generation 1h"]
    end

    subgraph "External Systems"
        NAS["Tawtheeq / NAS"]
        MOCI["MOCI API"]
        WPS_SYS["WPS System"]
        CRM_SYS["Dynamics 365"]
        AZURE_BLOB["Azure Blob Storage"]
    end

    AUTH_CTRL --> NAS_ADAPTER --> NAS
    COMPANY_CTRL --> MOCI_ADAPTER --> MOCI
    WPS_CTRL --> WPS_ADAPTER --> WPS_SYS
    CRM_CTRL --> CRM_ADAPTER --> CRM_SYS
    DOC_CTRL --> BLOB_ADAPTER --> AZURE_BLOB
```

---

## Database Schema — ER Diagram

```mermaid
erDiagram
    Application {
        uuid id PK
        string cr_number FK
        string nas_id
        string status
        string crm_case_id
        string crm_case_type
        string route
        string language_preference
        jsonb eligibility_snapshot
        jsonb nrgp_check_result
        jsonb wps_validation_result
        boolean wps_discrepancy_flag
        boolean wps_no_records_flag
        boolean wps_api_fallback_flag
        timestamp created_at
        timestamp submitted_at
    }

    Company {
        string cr_number PK
        string name_en
        string name_ar
        string status
        string sector
        integer employee_count
        date registration_date
        date expiry_date
        jsonb shareholders
        timestamp fetched_at
    }

    Document {
        uuid id PK
        uuid application_id FK
        string doc_type
        string filename
        string storage_path
        integer file_size_bytes
        string checksum_sha256
        boolean virus_scan_passed
        boolean validated
        timestamp uploaded_at
    }

    WpsRecord {
        uuid id PK
        uuid application_id FK
        string cr_number
        integer employee_count
        numeric total_salary_90d_qar
        jsonb monthly_records
        numeric discrepancy_pct
        string validation_status
        timestamp validated_at
    }

    EligibilityCriteria {
        uuid id PK
        string code
        string name
        jsonb rule_parameters
        boolean mandatory
        boolean active
        string modified_by_qid
        timestamp effective_from
    }

    NrgpList {
        uuid id PK
        string cr_number
        string program_cycle
        string list_version
        boolean active
        timestamp imported_at
        string imported_by_qid
    }

    AuditLog {
        uuid id PK
        uuid application_id FK
        string event_type
        string actor_qid
        jsonb input_summary
        jsonb output_summary
        string data_source_id
        jsonb criteria_snapshot
        timestamp timestamp_utc
    }

    Notification {
        uuid id PK
        uuid application_id FK
        string channel
        string template_key
        string language
        string status
        timestamp sent_at
    }

    Application ||--o{ Document : "has"
    Application ||--o| WpsRecord : "has"
    Application ||--o{ AuditLog : "generates"
    Application ||--o{ Notification : "triggers"
    Application }o--|| Company : "is for"
```

---

## Deployment Architecture

```mermaid
graph TD
    subgraph "Internet"
        USERS["SME Owners\nBrowsers"]
        QDB_STAFF["QDB Staff\nBrowsers"]
    end

    subgraph "Azure — Qatar North Region"
        subgraph "Edge / Security"
            WAF["Azure Front Door + WAF\nDDoS + rate limiting\nGeo-restriction"]
            CDN["Azure CDN\nStatic asset caching"]
        end

        subgraph "Application Tier"
            LB["Azure Application Gateway\nLayer 7 load balancer"]
            WEB1["Next.js App\nInstance 1\nPort 3120"]
            WEB2["Next.js App\nInstance 2\nauto-scale"]
            API1["Fastify API\nInstance 1\nPort 5014"]
            API2["Fastify API\nInstance 2\nauto-scale"]
        end

        subgraph "Data Tier"
            PG_PRIMARY["PostgreSQL\nPrimary\nFlexible Server HA"]
            PG_REPLICA["PostgreSQL\nStandby Replica"]
            REDIS_CACHE["Redis Cache\nC2 Standard HA"]
            BLOB_STORE["Azure Blob Storage\nGRS document store"]
            KMS["Azure Key Vault\nEncryption keys"]
        end

        subgraph "Monitoring"
            APP_INSIGHTS["Application Insights\nAPM + tracing"]
            LOG_ANALYTICS["Log Analytics\nAudit export + alerts"]
        end
    end

    USERS -->|"HTTPS"| WAF
    QDB_STAFF -->|"HTTPS"| WAF
    WAF --> CDN
    CDN --> LB
    LB --> WEB1
    LB --> WEB2
    WEB1 --> API1
    WEB2 --> API2
    API1 --> PG_PRIMARY
    PG_PRIMARY --> PG_REPLICA
    API1 --> REDIS_CACHE
    API1 --> BLOB_STORE
    BLOB_STORE <--> KMS
    API1 --> APP_INSIGHTS
    APP_INSIGHTS --> LOG_ANALYTICS

    style WAF fill:#ff6b6b,color:#fff
    style PG_PRIMARY fill:#51cf66,color:#000
    style BLOB_STORE fill:#51cf66,color:#000
    style KMS fill:#ffd43b,color:#000
```

---

## Key Architectural Decisions

| Decision | Choice | ADR |
|----------|--------|-----|
| Authentication provider | Tawtheeq / NAS OIDC only — no alternative auth path | ADR-001 |
| Disbursement routing | Dual-path via NRGP list exact match (auto) vs no-match (manual) | ADR-002 |
| WPS salary validation | File-based with API cross-check; fallback to file-only | ADR-003 |
| Technology stack | Next.js 14 + Fastify + PostgreSQL + Prisma + Azure | ADR-004 |
| Session management | Portal-issued JWT pair; 30-min inactivity; 8-hour absolute limit | — |
| Audit trail | Append-only PostgreSQL table; audit write blocks step on failure | — |
| Document storage | Azure Blob Storage (Qatar-resident); AES-256; signed URLs 1h expiry | — |

---

## Non-Functional Requirements — Architecture Implications

| NFR | Requirement | Architecture Response |
|-----|-------------|----------------------|
| NFR-001 | 500 concurrent sessions | Horizontal scaling of API; Redis session store |
| NFR-002 | Page load under 2s | Next.js SSR + CDN; Redis caching for MOCI |
| NFR-007 | No user passwords stored | NAS handles all credentials |
| NFR-008 | TLS 1.3 minimum | Enforced at WAF + Application Gateway |
| NFR-009 | AES-256 documents | Azure Blob + Key Vault KMS |
| NFR-011 | Qatar PDPA compliance | Qatar North region; PII minimization; 7-year retention |
| NFR-015 | Append-only audit trail | PostgreSQL REVOKE UPDATE/DELETE for app role |
| NFR-017 | 99.5% availability | 2+ API instances; PostgreSQL standby; Redis cluster |

---

*This document is confidential — QDB Internal Use Only.*
