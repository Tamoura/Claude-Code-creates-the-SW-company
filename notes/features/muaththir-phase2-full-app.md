# Muaththir Phase 2 - Full App Before Launch

## CEO Request
"I want full app before launch. AI features, demo child with all milestones and scores as model child, multi-child, etc."

## Features (Priority Order)

| # | Feature | Status | Backend | Frontend |
|---|---------|--------|---------|----------|
| 1 | Demo/Model Child | IN PROGRESS | Seed script | Display in onboarding |
| 2 | Goal Setting (F-011) | PENDING | CRUD endpoints | Goal pages |
| 3 | AI Insights (F-009) | PENDING | Analysis endpoint | Insights page |
| 4 | Multi-Child Family View (F-010) | PENDING | Family endpoint | Family dashboard |
| 5 | Progress Reports (F-012) | PENDING | Report generation | Reports page |
| 6 | Onboarding Polish | PENDING | - | Guided flow |
| 7 | Subscription/Premium | PENDING | Stripe integration | Billing page |

## Architecture Decisions

### Schema Changes Needed
- **Goal model**: parent-defined goals linked to dimensions and children
- **InsightCache**: cached AI-generated insights per child
- **isDemo flag on Child**: marks demo/model children

### Demo Child Design
- Pre-seeded "Aisha" (age 7, primary band) with:
  - 30+ observations across all 6 dimensions
  - Multiple milestones achieved
  - Scores ~70-85 range showing healthy development
  - Both positive and needs_attention sentiments for realism

### AI Insights Design
- Rule-based pattern analysis (no external AI API needed)
- Analyzes: dimension strengths/weaknesses, sentiment trends, milestone velocity
- Generates: strengths, areas for growth, recommendations

## Task Graph

### Phase 1: Schema + Backend
- SCHEMA-01: Prisma schema update (Goal model, isDemo flag)
- BACKEND-01: Demo child seed script
- BACKEND-02: Goals CRUD endpoints
- BACKEND-03: AI Insights endpoint
- BACKEND-04: Family overview endpoint
- BACKEND-05: Progress reports data endpoint

### Phase 2: Frontend
- FRONTEND-01: Goals pages (list, create, detail)
- FRONTEND-02: AI Insights page (replace Coming Soon)
- FRONTEND-03: Family view (multi-child comparison)
- FRONTEND-04: Progress reports page
- FRONTEND-05: Onboarding polish
- FRONTEND-06: Subscription improvements
