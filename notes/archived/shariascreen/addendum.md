# ShariaScreen - Product Addendum

## Product Overview
AI-powered Shariah compliance screening API - "Stripe for Shariah Compliance"

## Phase
Prototype (concept validation)

## Tech Stack
- **Backend**: Fastify + TypeScript (reuse ConnectSW backend-core)
- **Database**: PostgreSQL + Prisma (reuse Prisma Plugin)
- **Cache**: Redis (reuse Redis Plugin)
- **Frontend**: React + Vite + Tailwind (developer dashboard)
- **Testing**: Jest + Playwright

## Ports
- API: 5005
- Web: 3105

## Reused Components (from COMPONENT-REGISTRY.md)
- Auth Plugin (JWT + API key) from stablecoin-gateway
- Prisma Plugin from stablecoin-gateway
- Redis Plugin from stablecoin-gateway
- Observability Plugin from stablecoin-gateway
- Logger from stablecoin-gateway
- Crypto Utils from stablecoin-gateway
- Error Classes from invoiceforge
- Pagination Helper from invoiceforge
- Audit Log Service from stablecoin-gateway
- Rate Limit Store from stablecoin-gateway

## Key Domain Concepts
- AAOIFI: Accounting and Auditing Organization for Islamic Financial Institutions
- Shariah screening: Process of checking if an investment complies with Islamic law
- Purification: Amount to donate to charity from borderline-compliant investments
- Haram: Prohibited under Islamic law
- Halal: Permissible under Islamic law

## API Endpoints (Prototype)
- GET /api/v1/screen/:ticker - Screen single stock
- POST /api/v1/screen/batch - Screen multiple stocks
- GET /api/v1/report/:ticker - Detailed compliance report
- GET /health - Health check
