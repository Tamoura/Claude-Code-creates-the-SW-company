# DealGate -- System Architecture

**Version**: 1.0
**Status**: Proposed
**Last Updated**: 2026-01-31
**Architect**: Claude Architect (ConnectSW)

---

## 1. Executive Summary

DealGate is a Qatar-focused deal flow investment platform connecting investors
with opportunities (IPOs, funds, sukuk, PE/VC, private placements, real estate)
while enabling issuers to manage offerings. The architecture must support:

- **Multi-tenancy** for government white-label deployments (QDB, QFC, banks)
- **Bilingual** Arabic (RTL) + English (LTR) from day one
- **Sharia-native** compliance as a first-class attribute
- **Integration hub** connecting 13+ enterprise systems (CRM, banking, QCSD)
- **Regulatory compliance** with QFMA, QFCRA, QCB, and PDPPL requirements

Technology stack follows ConnectSW standards: Fastify + Prisma + PostgreSQL
backend, Next.js 14+ frontend, deployed on ports 5003 (API) and 3108 (web).

---

## 2. Architecture Overview

```
                       ┌──────────────────────────┐
                       │      Client Devices       │
                       │  Browser / Mobile / API   │
                       └────────────┬─────────────┘
                                    │ HTTPS
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  Next.js 14 (App Router, RSC, next-intl for i18n/RTL)       │
│  Port: 3108                                                  │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐           │
│  │ Marketplace│ │ Issuer Dash │ │ Admin Portal │           │
│  │ (Investor) │ │ (Fund Mgr)  │ │ (Tenant Ops) │           │
│  └────────────┘ └─────────────┘ └──────────────┘           │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (HTTPS)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
│  Fastify + TypeScript | Port: 5003                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes: /api/v1/auth, /deals, /subscriptions, etc.   │   │
│  │ Middleware: JWT auth, RBAC, tenant resolution, i18n   │   │
│  │ Validation: JSON Schema (Fastify native)              │   │
│  │ Services: DealService, SubscriptionService, etc.      │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                            │                                 │
│  ┌─────────┐ ┌─────────┐ │ ┌───────────┐ ┌──────────────┐ │
│  │ Event   │ │ Audit   │ │ │ Webhook   │ │ Integration  │ │
│  │ Bus     │ │ Logger  │ │ │ Delivery  │ │ Hub          │ │
│  └─────────┘ └─────────┘ │ └───────────┘ └──────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
     ┌──────────────┐ ┌─────────┐  ┌───────────────┐
     │  PostgreSQL  │ │  Redis  │  │  BullMQ       │
     │  (Primary)   │ │ (Cache) │  │  (Job Queue)  │
     │  + Prisma    │ │         │  │               │
     └──────────────┘ └─────────┘  └───────────────┘
```

---

## 3. Component Architecture

### 3.1 Frontend (apps/web) -- Next.js 14

| Component | Responsibility |
|-----------|---------------|
| **Marketplace** | Deal discovery, search/filter, deal detail pages, watchlist |
| **Investor Portal** | Registration, profile, portfolio, subscription history |
| **Issuer Dashboard** | Deal creation wizard, subscription management, analytics |
| **Admin Portal** | Tenant management, user management, system config |
| **Shared Layout** | Navigation, language switcher, RTL/LTR layout |
| **i18n Layer** | next-intl with Arabic/English translations, ICU messages |

### 3.2 Backend (apps/api) -- Fastify

| Component | Responsibility |
|-----------|---------------|
| **Auth Module** | JWT issuance, token refresh, RBAC enforcement |
| **Deal Engine** | Deal CRUD, status workflow, document management |
| **Subscription Engine** | Subscription lifecycle, eligibility checks, allocation |
| **Investor Engine** | Profile management, classification, KYC status |
| **Notification Service** | Multi-channel delivery (email, SMS, in-app, push) |
| **Audit Service** | Immutable audit log for all state changes |
| **Event Bus** | Domain events (DealPublished, SubscriptionReceived, etc.) |
| **Integration Hub** | Adapter-based connectors to external systems |
| **Tenant Resolver** | Resolve tenant from subdomain/header, inject config |
| **Webhook Engine** | Outbound webhook delivery with retry and signing |

### 3.3 Shared Packages (packages/)

| Package | Purpose |
|---------|---------|
| **shared-types** | TypeScript types shared between API and web |
| **i18n-messages** | Translation JSON files for Arabic and English |

---

## 4. Data Architecture

### 4.1 Database Strategy

- **PostgreSQL 15+** with Prisma ORM
- **Shared-schema multi-tenancy** with `tenant_id` on all tenant-scoped tables
  (see ADR-001 for detailed analysis)
- **Row-level security** enforced at the application layer via Prisma middleware
- **Field-level encryption** for PII (national ID, bank details) using AES-256
- **Immutable audit log** table (append-only, no UPDATE or DELETE)

### 4.2 Entity Relationship Summary

```
Tenant 1──* User
User   1──1 InvestorProfile (optional)
User   1──1 IssuerProfile   (optional)
User   1──* WatchlistItem
User   1──* Notification

InvestorProfile 1──* Subscription
InvestorProfile 1──* PortfolioItem

IssuerProfile   1──* Deal

Deal   1──* DealDocument
Deal   1──* Subscription
Deal   1──* WatchlistItem

Subscription 1──* PortfolioItem (on settlement)

Tenant 1──1 TenantConfig
Tenant 1──1 TenantBranding
Tenant 1──* IntegrationConfig
Tenant 1──* WebhookEndpoint
```

### 4.3 Key Design Decisions (Data)

1. **Polymorphic deals**: A single `Deal` table with a `dealType` enum
   (IPO, MUTUAL_FUND, SUKUK, PE_VC, PRIVATE_PLACEMENT, REAL_ESTATE, SAVINGS).
   Type-specific fields stored in a `dealMetadata` JSON column.
2. **Decimal precision**: All monetary amounts use `Decimal(18,4)` for QAR
   precision (4 decimal places for sub-fils accuracy in calculations).
3. **Soft deletes**: No hard deletes on financial records. `deletedAt` timestamp
   used for logical deletion. Audit log is append-only.
4. **Tenant scope**: All queries automatically filtered by `tenantId` via
   Prisma middleware. Cross-tenant queries only in super-admin context.
5. **UUID primary keys**: All tables use `cuid()` for globally unique,
   sortable identifiers following the stablecoin-gateway pattern.

See `apps/api/prisma/schema.prisma` for the full schema definition.

---

## 5. Authentication and Authorization

### 5.1 Authentication

- **JWT-based** with short-lived access tokens (15 min) and refresh tokens
- **Password auth** with bcrypt hashing (cost factor 12)
- **Token refresh** rotation pattern (new refresh token on each use)
- **Future**: Qatar NAS (National Authentication System) integration via OAuth

### 5.2 Role-Based Access Control (RBAC)

| Role | Description | Access Scope |
|------|------------|--------------|
| `INVESTOR` | Individual or institutional investor | Marketplace, portfolio, subscriptions |
| `ISSUER` | Fund manager or company listing deals | Deal management, subscriber data |
| `TENANT_ADMIN` | Administrator of a white-label tenant | Tenant configuration, user mgmt |
| `SUPER_ADMIN` | ConnectSW platform administrator | Cross-tenant operations, system config |

### 5.3 Investor Classification Enforcement

Investor classification (RETAIL, PROFESSIONAL, INSTITUTIONAL, QFC, FOREIGN) is
stored on `InvestorProfile` and enforced at subscription time. Each deal
specifies eligible classifications via `eligibleClassifications` array. The
subscription engine rejects attempts from ineligible classifications.

---

## 6. Internationalization Architecture

See ADR-003 for the full evaluation. Summary:

- **next-intl** for frontend i18n (ICU message format, RSC support)
- **URL-based locale**: `/en/deals` and `/ar/deals`
- **RTL handled via**: `dir="rtl"` on `<html>`, Tailwind CSS `rtl:` variant
- **Backend i18n**: Accept-Language header for API error messages
- **Translation files**: `packages/i18n-messages/{en,ar}.json`
- **Number formatting**: Support both Western Arabic and Eastern Arabic numerals
- **Date support**: Both Gregorian and Hijri calendars via `Intl.DateTimeFormat`
- **Currency**: QAR with locale-aware formatting (QR 1,000.00 / ١٬٠٠٠٫٠٠ ر.ق)

Continued in [ARCHITECTURE-PART2.md](./ARCHITECTURE-PART2.md).
