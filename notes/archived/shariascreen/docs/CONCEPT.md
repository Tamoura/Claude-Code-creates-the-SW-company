# ShariaScreen - Prototype Concept

## Core Problem

Muslim investors and fintech developers need reliable, real-time Shariah compliance data for investment assets. Current solutions suffer from:
- **Outdated data** (90% of market caps stale on leading platforms)
- **Rules-based only** (no AI-powered analysis)
- **Stocks only** (no crypto, real estate, private equity)
- **No developer API** (only 2 weak competitors: Zoya API, Muslim Xchange)

## Target User (Primary)

**Fintech Developer** building a halal investing app (robo-advisor, neobank, trading platform). Needs a reliable Shariah compliance API to integrate into their product. Currently has no good option - Zoya API just launched with limited coverage, IdealRatings is enterprise-only and expensive.

## Key Features (Prototype Scope)

1. **Stock Compliance Check** (`GET /api/v1/screen/:ticker`) - Screen a single stock against AAOIFI standard. Returns compliance status, financial ratios, and detailed breakdown.

2. **Batch Screening** (`POST /api/v1/screen/batch`) - Screen multiple tickers in one request. Returns compliance results for up to 50 stocks.

3. **Compliance Report** (`GET /api/v1/report/:ticker`) - Detailed compliance report with financial ratios, threshold comparisons, revenue source breakdown, and educational explanations.

4. **API Key Management** - Developer self-service: create API keys, view usage, rate limits.

5. **Developer Dashboard** - Simple web UI showing API usage stats, quick-test console, and documentation links.

## What We're Validating

1. Can we build a useful Shariah screening API using publicly available financial data?
2. Does the API-first approach resonate with fintech developers?
3. Is AAOIFI screening implementable with accurate results?
4. Can we differentiate on data quality and transparency vs competitors?

## Success Criteria

- API responds with correct compliance status for known halal/haram stocks
- Screening logic matches AAOIFI standard thresholds
- Response includes detailed explanation (not just pass/fail)
- API is fast (< 500ms per single stock screen)
- Developer can get an API key and make their first call in < 5 minutes

## AAOIFI Screening Standard (Implementation Reference)

### Business Activity Screen
Exclude companies with >5% revenue from:
- Alcohol, tobacco, pork
- Conventional financial services (interest-based)
- Gambling, adult entertainment
- Weapons/defense

### Financial Ratio Screen (AAOIFI thresholds)
- **Debt ratio**: Total debt / trailing 36-month avg market cap < 30%
- **Interest income**: Interest income / total revenue < 5%
- **Cash & interest-bearing**: (Cash + interest-bearing securities) / trailing 36-month avg market cap < 30%
- **Receivables ratio**: Accounts receivable / trailing 36-month avg market cap < 67%

### Purification
- Calculate purification amount per share for borderline-compliant stocks
- Purification = (non-permissible income / total income) x dividend per share

## Scope Boundaries

**IN scope for prototype:**
- US-listed stocks (S&P 500 subset)
- AAOIFI screening standard
- REST API with JSON responses
- API key authentication
- Simple developer dashboard

**OUT of scope for prototype:**
- Real-time data feeds (use sample/cached data)
- Crypto, real estate, PE screening
- Multiple screening standards (DJIM, MSCI)
- Webhook notifications
- Payment/billing
- Mobile app
