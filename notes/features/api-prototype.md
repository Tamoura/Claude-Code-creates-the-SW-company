# ShariaScreen API Prototype

## Overview
Build the complete backend API for ShariaScreen - an AI-powered Shariah compliance screening API.

## Key Decisions
- Port: 5005
- AAOIFI screening standard implementation
- Sample data (no external API calls)
- Redis optional (graceful degradation)
- Components reused from stablecoin-gateway and invoiceforge

## Reused Components
- Auth Plugin (adapted from stablecoin-gateway)
- Prisma Plugin (copied from stablecoin-gateway)
- Redis Plugin (copied from stablecoin-gateway)
- Observability Plugin (copied from stablecoin-gateway)
- Logger (copied from stablecoin-gateway)
- Crypto Utils (adapted from stablecoin-gateway)
- Error Classes (copied from invoiceforge)
- Pagination Helper (copied from invoiceforge)

## AAOIFI Thresholds
- Debt ratio: totalDebt / marketCap < 30%
- Interest income: interestIncome / totalRevenue < 5%
- Cash ratio: cash / marketCap < 30%
- Receivables ratio: accountsReceivable / marketCap < 67%
- Business activity: non-permissible revenue < 5% of total
- DOUBTFUL: within 5% of any threshold limit

## Test Strategy
- Unit tests for screening service logic (no DB needed)
- Route tests using mock Prisma for integration testing
