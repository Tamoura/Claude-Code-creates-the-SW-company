# IMPL-063 & IMPL-064: TCO Calculator and Cloud Spend Pages

## Task Summary
Build cost analysis pages for CTOaaS dashboard:
- Cost analysis hub page (`/costs`)
- TCO calculator page (`/costs/tco`) with form + results
- TCO detail page (`/costs/tco/[id]`)
- Cloud spend page (`/costs/cloud-spend`) with entry form + analysis

## API Endpoints
- POST /api/v1/costs/tco - Create TCO comparison
- GET /api/v1/costs/tco - List TCO comparisons
- GET /api/v1/costs/tco/:id - Get specific TCO comparison
- POST /api/v1/costs/cloud-spend - Save cloud spend entry
- GET /api/v1/costs/cloud-spend - List cloud spend entries
- POST /api/v1/costs/cloud-spend/analyze - Analyze cloud spend

## Key Decisions
- Pure CSS bars for charts (no chart library)
- React Hook Form + Zod for validation
- TCO form requires min 2 options
- Cloud spend total auto-calculated from categories

## Branch: foundation/ctoaas
## Port: 3120
