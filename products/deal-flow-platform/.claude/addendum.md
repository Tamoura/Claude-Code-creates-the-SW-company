# DealGate -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on the Deal Flow Investment Platform (DealGate).

## Product Identity

- **Product name**: DealGate
- **Product directory**: `products/deal-flow-platform/`
- **Frontend port**: 3108
- **Backend port**: 5003
- **Status**: Concept / Pre-Development
- **Primary market**: Qatar (expanding to GCC)

## What This Product Does

DealGate is a deal flow investment marketplace for the Qatar and GCC capital markets. It enables:

1. **Investors** to discover, evaluate, and subscribe to investment deals (IPOs, mutual funds, sukuk, private placements, PE/VC fund allocations, real estate funds, savings instruments)
2. **Issuers / Fund Managers** to list offerings, manage subscriptions, and track investor demand

## Domain Knowledge for Agents

### Key Business Terms

- **Deal flow**: The stream of investment opportunities available to investors
- **IPO**: Initial Public Offering -- a company's first public stock sale
- **Sukuk**: Islamic bonds -- fixed-income instruments compliant with Sharia law
- **Private placement**: Sale of securities to a select group of institutional/qualified investors
- **PE/VC**: Private Equity / Venture Capital -- alternative investment fund types
- **HNWI**: High Net Worth Individual -- investors with significant investable assets
- **NAV**: Net Asset Value -- per-unit value of a fund
- **AUM**: Assets Under Management
- **NIN**: National Investor Number -- mandatory investor identifier issued by QCSD for all investors on QSE
- **Subscription**: The act of committing to invest in a deal
- **Allocation**: The number of units/shares assigned to an investor after subscription
- **Prospectus**: Legal document describing an offering's terms, risks, and financials
- **Feeder fund**: A fund that aggregates smaller investor commitments to invest in a larger institutional fund

### Regulatory Context (Qatar)

DealGate operates in a tri-regulator environment:

- **QFMA** (Qatar Financial Markets Authority): Regulates securities markets, QSE-listed companies, and onshore capital markets activities. All onshore platform activities must comply with QFMA regulations.
- **QCB** (Qatar Central Bank): Central monetary authority. Regulates banking, payment systems, insurance. Oversees AML/CFT compliance.
- **QFC / QFCRA** (Qatar Financial Centre / Regulatory Authority): Separate legal and regulatory environment based on English common law. 100% foreign ownership, 10% flat tax. Regulates QFC-licensed financial services firms. DealGate's international operations and tokenized products would operate under QFC.

**Dual licensing strategy**: DealGate pursues QFMA license (onshore Qatar operations) + QFC license (international operations, digital assets).

### Investor Classification (Qatar)

- **Retail investor**: Individual not meeting professional/institutional criteria. Access to QSE-listed securities, public funds, retail-eligible sukuk.
- **Professional investor**: Individual/entity meeting financial thresholds. Extended access to private offerings.
- **Institutional investor**: Licensed financial institution, government entity, SWF. Access to all deal types.
- **QFC investor**: Investor through QFC-licensed entities. Access to QFC-regulated funds.
- **Foreign investor**: Non-Qatari with NIN and broker account. QSE access with ownership caps (49% default, 100% with Cabinet approval).

### KYC/AML Requirements (Qatar)

- **Primary law**: Law No. 20 of 2019 (AML/CFT)
- **Central FIU**: QFIU (Qatar Financial Information Unit)
- **STR filing**: Within 24 hours of suspicious activity
- **Sanctions freezing**: UN designations within 24 hours, local within 8 hours
- **Record retention**: Minimum 5 years
- **NIN requirement**: All investors must obtain NIN from QCSD (QR 100 fee)
- **e-KYC**: Mandatory for all financial institutions
- **FATF status**: Qatar is NOT on the grey list or blacklist

### Foreign Ownership Rules

- **Default cap**: 49% foreign ownership per QSE-listed company
- **100% ownership**: Permitted with Council of Ministers approval (all major banks already approved)
- **QFC entities**: 100% foreign ownership by default
- **Anti-circumvention**: Law No. 3 of 2023 criminalizes concealment of non-Qatari ownership

### Cultural and Language Requirements

- **Bilingual**: Arabic and English must be treated as equal-priority languages throughout the application.
- **RTL support**: Arabic uses right-to-left text direction. The UI must support RTL layout natively.
- **Localization**: Use `next-intl` for internationalization. All user-facing strings must have Arabic and English translations.
- **Currency**: Qatari Riyal (QR / QAR), pegged to USD at 3.64. Display with Arabic and English formatting as appropriate.
- **Sharia-native**: Sharia compliance is the default, not an option. All deals display compliance status and purification ratios. Non-compliant deals are flagged, not the other way around.
- **Date formats**: Support both Hijri (Islamic) and Gregorian calendars.
- **Number formatting**: Support both Arabic-Indic (Eastern Arabic) numerals and Western Arabic numerals.
- **Expat awareness**: 88% of Qatar's population is expatriate. The platform must serve both Qatari nationals and the large expat professional community.

### Qatar Market Key Statistics

- **QSE market cap**: QR 644.3B (~USD 177B), 54 listed companies
- **QIA**: ~USD 557B (8th largest SWF globally)
- **ETFs**: Only 2 locally listed (QETF, QATR)
- **Fund supermarket**: None exists
- **Digital investment platform**: None exists
- **Millionaires**: 26,163 (116 per 1,000 households, 3rd globally)
- **Internet penetration**: 99.7%
- **Population**: ~3.12M (12% Qatari, 88% expat)
- **Credit rating**: Aa2/AA/AA (stable)
- **GDP per capita (PPP)**: USD 121,610

## Architecture Notes

### API Design

- RESTful API with versioned routes (`/api/v1/`)
- Fastify with schema-based validation (JSON Schema)
- JWT authentication with role-based access control
- Separate role scopes: investor, issuer, admin

### Database Schema Concepts

Key entities to model:

- **Users** (investors, issuers, admins)
- **Investor Profiles** (classification, KYC status, risk profile, Sharia preferences, NIN)
- **Issuer Profiles** (company details, QFMA registration or QFC license, track record)
- **Deals** (all deal types with polymorphic design -- IPO, fund, sukuk, PE/VC, private placement, savings)
- **Subscriptions** (investor-deal relationship with status workflow)
- **Documents** (prospectuses, fact sheets, Sharia certifications, linked to deals)
- **Notifications** (multi-channel delivery tracking)
- **Audit Log** (immutable record of all state changes)

### Deal Status Workflow

```
Draft -> Under Review -> Active -> Subscription Open -> Subscription Closed -> Allocation -> Settled
```

### Subscription Status Workflow

```
Intent Expressed -> Submitted -> Under Review -> Approved/Rejected -> Allocated -> Settled
```

## Testing Strategy

Follow ConnectSW TDD standards:

- **Unit tests**: All services, utilities, and components
- **Integration tests**: API routes with real database
- **E2E tests**: Critical user journeys (deal discovery, subscription flow)
- **No mocks**: Use real database instances for testing
- **80%+ coverage**: Minimum test coverage threshold

## Key Dependencies

- `next-intl` -- Internationalization and RTL support
- `@prisma/client` -- Database access
- `fastify` -- Backend framework
- `zod` or JSON Schema -- Request/response validation
- `pdf.js` -- In-browser PDF viewing
- `bullmq` -- Background job processing

## Related Products

- **stablecoin-gateway**: ConnectSW's digital asset payment product. DealGate may integrate with it in the future for digital asset settlement, particularly if leveraging the QFC Digital Assets Framework for tokenized fund distribution.

## Important Files

- `docs/PRODUCT-CONCEPT.md` -- Full product concept and strategy document (v2.0, Qatar focus)
- `docs/PRD.md` -- Product requirements (to be created)
- `docs/API.md` -- API documentation (to be created)
- `README.md` -- Product overview and setup instructions
