# DealGate -- Deal Flow Investment Platform

A unified digital marketplace for investment deal flow in the Qatar and GCC capital markets.

## Product Overview

DealGate connects investors and issuers through an intelligent, compliant, and comprehensive deal flow platform. Investors discover, evaluate, and subscribe to investment opportunities across all asset classes. Fund managers and issuers list offerings, manage subscriptions, and track investor demand.

### Deal Types Supported

- IPOs (Initial Public Offerings)
- Mutual fund offerings
- Sukuk (Islamic bonds)
- Private placements
- Private equity and venture capital fund allocations
- Real estate funds and REITs
- Savings instruments

### Target Users

- **Qatari HNWIs** -- High net worth Qatari nationals (116 millionaires per 1,000 households, 3rd globally)
- **Expatriate professional investors** -- 88% of Qatar's population, high-income professionals seeking local and regional investment access
- **QFC-based fund managers** -- Over half of Qatar's fund industry operates from the QFC (3,300 registered firms)
- **QSE-listed companies** -- Companies seeking capital through sukuk, rights issues, or secondary offerings
- **Institutional investors** -- Asset managers, banks, sovereign wealth-adjacent entities
- **Foreign institutional investors** -- International investors seeking Qatar exposure (Aa2/AA credit rating)

## Market Context

- QSE market capitalization: QR 644.3 billion (~USD 177 billion)
- Only 54 listed companies (thin market = opportunity for alternative deal flow)
- Only 2 locally listed ETFs, no fund supermarket, no digital-first investment platform
- First Islamic sukuk listed on QSE in December 2025
- QIA sovereign wealth: ~USD 557 billion (8th largest globally)
- Millionaire density: 116 per 1,000 households (3rd globally)
- 99.7% internet penetration, ~90% smartphone adoption
- QIA $1B Fund of Funds for VC (Feb 2024); QVCA founded May 2025
- QFC Digital Assets Framework launched September 2024
- GCC fintech market: USD 10.5B (2025), growing to USD 29.8B by 2032

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5+ |
| Backend | Fastify |
| Frontend | Next.js 14+ / React 18+ |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Testing | Jest, React Testing Library, Playwright |

## Port Assignments

| Service | Port |
|---------|------|
| Frontend (web) | 3108 |
| Backend (API) | 5003 |

## Project Structure

```
products/deal-flow-platform/
├── apps/
│   ├── api/             # Fastify backend service
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── web/             # Next.js frontend application
│       ├── src/
│       ├── tests/
│       └── package.json
├── packages/            # Shared code (types, utilities)
├── e2e/                 # Playwright E2E tests
├── docs/
│   ├── PRODUCT-CONCEPT.md   # Product concept and strategy (v2.0 -- Qatar focus)
│   ├── PRD.md               # Product requirements (TBD)
│   ├── API.md               # API documentation (TBD)
│   └── ADRs/                # Architecture Decision Records
├── .claude/
│   └── addendum.md      # Product context for agents
└── README.md            # This file
```

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis (for caching and job queues)

### Getting Started

```bash
# Install dependencies
npm install

# Start database
docker compose up -d postgres redis

# Run migrations
cd apps/api && npx prisma migrate dev

# Seed sample data
cd apps/api && npm run seed

# Start development servers
npm run dev
```

### Running Tests

```bash
# All tests
npm test

# Backend tests
cd apps/api && npm test

# Frontend tests
cd apps/web && npm test

# E2E tests
cd e2e && npx playwright test
```

## Documentation

- [Product Concept Document](docs/PRODUCT-CONCEPT.md) -- Strategic overview, Qatar market analysis, competitive landscape (25 platforms), feature scope
- Product Requirements Document -- TBD
- API Documentation -- TBD
- Architecture Decision Records -- TBD

## Key Features (Prototype Scope)

1. **Deal marketplace** -- Searchable catalog of investment opportunities across all asset classes
2. **Deal detail pages** -- Comprehensive deal information and documents
3. **Investor onboarding** -- Registration with investor classification (retail, HNWI, institutional, foreign)
4. **Issuer dashboard** -- Deal listing and management tools for QFC-based fund managers and QSE-listed companies
5. **Subscription intent** -- Express interest in deals
6. **Portfolio view** -- Track investments, watchlist, and Sharia compliance status
7. **Notifications** -- Deal alerts and updates
8. **Bilingual UI** -- Full Arabic and English support with RTL

## Regulatory Framework

This product operates within the Qatar regulatory framework:
- **QFMA** (Qatar Financial Markets Authority) -- onshore securities regulation
- **QFC / QFCRA** (Qatar Financial Centre / Regulatory Authority) -- international operations under English common law
- **QCB** (Qatar Central Bank) -- banking supervision and payment systems
- **QCSD** (Edaa Qatar) -- securities depository, clearing, and settlement

DealGate pursues a dual-licensing strategy: QFMA for onshore Qatar + QFC for international operations. See the [Product Concept Document](docs/PRODUCT-CONCEPT.md) Section 9 for detailed regulatory considerations.

## Competitive Positioning

DealGate is the first platform to combine multi-asset deal aggregation, GCC regulatory intelligence, Arabic-native design, Sharia compliance by default, and service to both institutional and retail investors -- in the Qatar/GCC context. See the [Product Concept Document](docs/PRODUCT-CONCEPT.md) Section 3 for the full competitive landscape analysis of 25 global and regional platforms.

## Status

**Phase**: Concept / Pre-Development
**Last Updated**: January 31, 2026
**Concept Version**: 2.0 (Qatar focus)
