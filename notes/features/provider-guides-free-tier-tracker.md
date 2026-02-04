# Provider Acquisition Guides & Free Tier Tracker

## Feature Summary
Enrich AIRouter's provider data with detailed step-by-step key acquisition guides, add a Free Tier Comparison page, and individual Provider Detail pages.

## Branch
`feature/airouter/provider-guides-free-tier-tracker`

## Phases
1. Backend data enrichment (types, provider data, routes, tests)
2. Frontend data & mock alignment (api-client types/mock data)
3. Free Tier Comparison page (new page at /dashboard/free-tiers)
4. Provider Detail page (new page at /dashboard/providers/:slug)
5. Update existing pages & navigation (ProvidersPage, ProviderCard, Sidebar, App.tsx)

## Key Decisions
- `keyAcquisitionGuide` changes from string to structured object with steps[], tips[], gotchas[], verificationSteps[]
- New fields: description, category, lastVerified, prerequisites[], documentation links
- Frontend Provider type gains: category, lastVerified, freeTier (structured), keyAcquisitionGuide (structured)
- New API endpoint: GET /api/v1/providers/compare

## TDD Approach
Each phase: write failing tests first, then implement, then refactor.
