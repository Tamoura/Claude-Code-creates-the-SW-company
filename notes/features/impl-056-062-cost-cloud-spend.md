# IMPL-056 through IMPL-062: Cost Calculator & Cloud Spend

## Sprint 7 — Combined Red+Green

### Scope
- **IMPL-056**: Unit tests for CostService (TCO calculator)
- **IMPL-058**: Unit tests for CloudSpendService
- **IMPL-059**: Integration tests for cost routes
- **IMPL-060**: CostService implementation
- **IMPL-062**: CloudSpendService implementation

### Key Decisions
- TCO calculations are pure functions (no DB needed for core math)
- Cloud spend benchmarks hardcoded for MVP (industry averages)
- CSV parsing: basic comma-separated with header row
- TCO scoped to user, cloud spend scoped to org
- All routes require authentication

### Prisma Models
- `TcoComparison`: user_id, title, options (JSON), projections (JSON), ai_analysis
- `CloudSpend`: user_id, org_id, provider (enum), spend_breakdown (JSON), total_monthly (Decimal), benchmarks (JSON), recommendations (JSON), import_source (enum), period_start, period_end

### Routes
- POST /api/v1/costs/tco
- GET /api/v1/costs/tco
- GET /api/v1/costs/tco/:id
- POST /api/v1/costs/cloud-spend
- GET /api/v1/costs/cloud-spend
- POST /api/v1/costs/cloud-spend/analyze

### TCO Formula
- Year 1: upfront + (monthly x 12) + (teamSize x hourlyRate x 160 x months)
- Year 2: (monthly x 12 x scalingFactor) + maintenance (15% of year-1)
- Year 3: (monthly x 12 x scalingFactor^2) + maintenance
