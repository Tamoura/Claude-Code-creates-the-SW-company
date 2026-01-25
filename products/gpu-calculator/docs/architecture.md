# AI GPU Usage Calculator - Architecture Document

**Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: Architect Agent
**Status**: Draft

---

## 1. System Overview

The AI GPU Usage Calculator is a client-side single-page application (SPA) that performs GPU cost calculations entirely in the browser. There is no backend server - all pricing data is embedded at build time and updated monthly via code deployments.

### 1.1 Architecture Diagram

```
+------------------------------------------------------------------+
|                         BROWSER                                    |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------------+    +-------------------+                   |
|  |   INPUT FORMS      |    |  CALCULATION      |                   |
|  |                    |    |  ENGINE           |                   |
|  | - Training Config  |--->|                   |                   |
|  | - Inference Config |    | - Training Calc   |                   |
|  | - Storage Config   |    | - Inference Calc  |                   |
|  +--------------------+    | - Storage Calc    |                   |
|           |                | - Network Calc    |                   |
|           |                | - TCO Aggregation |                   |
|           v                +-------------------+                   |
|  +--------------------+            |                               |
|  |   VALIDATION       |            |                               |
|  |                    |            v                               |
|  | - Input sanitizer  |    +-------------------+                   |
|  | - Range checks     |    |  PRICING DATA     |                   |
|  | - Error messages   |    |  (Embedded JSON)  |                   |
|  +--------------------+    |                   |                   |
|                            | - 7 Providers     |                   |
|                            | - GPU Specs       |                   |
|                            | - Storage Rates   |                   |
|                            | - Egress Rates    |                   |
|                            +-------------------+                   |
|                                     |                              |
|                                     v                              |
|                            +-------------------+                   |
|                            |  RESULTS VIEW     |                   |
|                            |                   |                   |
|                            | - Comparison Grid |                   |
|                            | - Detail Cards    |                   |
|                            | - Sorting/Filter  |                   |
|                            +-------------------+                   |
|                                                                    |
+------------------------------------------------------------------+
                                     |
                                     v
+------------------------------------------------------------------+
|                     STATIC HOSTING (CDN)                          |
|  - Vercel / Netlify / GitHub Pages                                |
|  - HTTPS enforced                                                 |
|  - No server-side processing                                      |
+------------------------------------------------------------------+
```

### 1.2 Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client-side only | Yes | Zero infrastructure cost, instant calculations, privacy |
| Static pricing data | Embedded JSON | No API dependencies, works offline, simple updates |
| Single-page application | Yes | Fast navigation, good UX for calculator flow |
| No user accounts | Yes | Simplicity, privacy, no backend needed |

---

## 2. Component Architecture

### 2.1 Component Hierarchy

```
App
├── Layout
│   ├── Header (logo, nav)
│   └── Footer (methodology link, last updated)
│
├── CalculatorTabs
│   ├── TrainingTab
│   │   ├── ModelConfigForm
│   │   ├── GPUConfigForm
│   │   └── StorageConfigForm
│   │
│   └── InferenceTab
│       ├── InferenceConfigForm
│       ├── LatencyConfigForm
│       └── EgressConfigForm
│
├── PresetsBar (quick-start buttons)
│
├── ResultsPanel
│   ├── ComparisonGrid
│   │   └── ProviderCard (x7)
│   │       ├── ProviderSummary
│   │       └── ProviderDetails (expandable)
│   │
│   ├── SortControls
│   └── FilterControls
│
└── MethodologyModal
```

### 2.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `CalculatorTabs` | Mode switching between training/inference |
| `ModelConfigForm` | Model size, dataset, epochs input |
| `GPUConfigForm` | GPU type, count, node selection |
| `InferenceConfigForm` | Requests/sec, batch size, model size |
| `ComparisonGrid` | Renders all provider results |
| `ProviderCard` | Single provider cost display with expand |
| `PresetsBar` | Quick-fill common configurations |

---

## 3. Data Flow

### 3.1 Calculation Flow

```
User Input
    │
    v
┌─────────────────┐
│  Input Forms    │  ─── onChange ───>  Local State
└─────────────────┘
         │
         │ onSubmit
         v
┌─────────────────┐
│   Validation    │  ─── errors? ───>  Display Errors
└─────────────────┘
         │
         │ valid
         v
┌─────────────────┐     ┌──────────────────┐
│  Calculation    │ <── │  Pricing Data    │
│    Engine       │     │  (static import) │
└─────────────────┘     └──────────────────┘
         │
         │ results[]
         v
┌─────────────────┐
│  Results View   │  ─── sort/filter ───>  Display
└─────────────────┘
```

### 3.2 State Management

Given the simplicity of this application, we use React's built-in state management:

| State | Location | Purpose |
|-------|----------|---------|
| Form inputs | Component state (useState) | User input values |
| Validation errors | Component state | Error messages |
| Calculation results | Component state | Provider cost array |
| Active tab | Component state | Training vs Inference |
| Sort/filter | Component state | UI preferences |
| Pricing data | Static import | No state needed |

---

## 4. Calculation Engine Design

### 4.1 Engine Structure

```typescript
calculationEngine/
├── index.ts              // Public API
├── trainingCalculator.ts // Training cost calculations
├── inferenceCalculator.ts// Inference cost calculations
├── storageCalculator.ts  // Storage cost calculations
├── networkCalculator.ts  // Egress/ingress calculations
├── tcoAggregator.ts      // Combines all costs
└── formulas.ts           // Shared calculation formulas
```

### 4.2 Calculation Functions

```typescript
// Training calculation
function calculateTrainingCost(config: TrainingConfig): ProviderResult[]

// Inference calculation
function calculateInferenceCost(config: InferenceConfig): ProviderResult[]

// TCO aggregation
function calculateTCO(
  computeCost: number,
  storageCost: number,
  networkCost: number
): number
```

### 4.3 Key Formulas

**Training Hours**:
```
training_flops = 6 * model_params * dataset_tokens * epochs
hours = training_flops / (gpu_tflops * 1e12 * utilization * num_gpus * 3600)
```

**Inference GPU Requirement**:
```
tokens_per_second = requests_per_sec * avg_tokens_per_request
gpus_needed = ceil(tokens_per_second / tokens_per_gpu_per_second)
monthly_hours = gpus_needed * 24 * 30
```

**Monthly Egress**:
```
monthly_requests = requests_per_sec * 86400 * 30
monthly_egress_gb = monthly_requests * avg_response_kb / (1024 * 1024)
egress_cost = max(0, monthly_egress_gb - free_tier_gb) * per_gb_rate
```

---

## 5. Pricing Data Model

### 5.1 Data Structure

```typescript
// See data-model.md for complete TypeScript interfaces
pricingData/
├── index.ts           // Aggregated export
├── providers.ts       // Provider metadata
├── gpus.ts           // GPU specifications and rates
├── storage.ts        // Storage pricing per provider
├── egress.ts         // Egress pricing per provider
└── presets.ts        // Quick-start configurations
```

### 5.2 Update Process

1. **Monthly**: Developer reviews provider pricing pages
2. **Update**: Modify JSON/TS files in `pricingData/`
3. **Test**: Run validation tests for data integrity
4. **Deploy**: Push to main, auto-deploys via CI/CD
5. **Display**: `lastUpdated` date shown in UI footer

---

## 6. Tech Stack

### 6.1 Core Technologies

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18 | Industry standard, good ecosystem |
| Build Tool | Vite | Fast builds, good DX, small bundles |
| Language | TypeScript | Type safety for calculations |
| Styling | Tailwind CSS | Rapid development, consistent design |
| State | React useState/useReducer | Sufficient for this complexity |

### 6.2 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code quality |
| Prettier | Code formatting |
| Vitest | Unit testing |
| Playwright | E2E testing |

### 6.3 Deployment

| Aspect | Choice |
|--------|--------|
| Hosting | Vercel (free tier) |
| CDN | Included with Vercel |
| Domain | Custom domain via Vercel |
| CI/CD | GitHub Actions or Vercel auto-deploy |

---

## 7. File Structure

```
gpu-calculator/
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── data-model.md
│   └── ADRs/
│       ├── ADR-001-tech-stack.md
│       └── ADR-002-pricing-data.md
│
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── forms/
│   │   │   ├── TrainingForm.tsx
│   │   │   ├── InferenceForm.tsx
│   │   │   ├── GPUSelector.tsx
│   │   │   └── FormField.tsx
│   │   ├── results/
│   │   │   ├── ComparisonGrid.tsx
│   │   │   ├── ProviderCard.tsx
│   │   │   └── SortControls.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Tabs.tsx
│   │       └── Tooltip.tsx
│   │
│   ├── calculators/
│   │   ├── index.ts
│   │   ├── trainingCalculator.ts
│   │   ├── inferenceCalculator.ts
│   │   ├── storageCalculator.ts
│   │   ├── networkCalculator.ts
│   │   └── formulas.ts
│   │
│   ├── data/
│   │   ├── index.ts
│   │   ├── providers.ts
│   │   ├── gpus.ts
│   │   ├── storage.ts
│   │   ├── egress.ts
│   │   └── presets.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── inputs.ts
│   │   ├── outputs.ts
│   │   └── pricing.ts
│   │
│   ├── hooks/
│   │   ├── useCalculator.ts
│   │   └── useValidation.ts
│   │
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
│
├── tests/
│   ├── calculators/
│   │   ├── training.test.ts
│   │   └── inference.test.ts
│   ├── components/
│   └── e2e/
│
├── public/
│   └── assets/
│       └── provider-logos/
│
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 8. Performance Considerations

### 8.1 Bundle Size Budget

| Component | Budget |
|-----------|--------|
| React + ReactDOM | ~45KB |
| Tailwind (purged) | ~10KB |
| App code | ~50KB |
| Pricing data | ~20KB |
| **Total** | **<150KB gzipped** |

### 8.2 Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| First Contentful Paint | <1s | Static hosting, minimal JS |
| Time to Interactive | <2s | No heavy framework |
| Calculation time | <100ms | Pure JS, no async |

---

## 9. Security Considerations

- No user data collection
- No external API calls
- No authentication required
- All calculations client-side
- HTTPS enforced via hosting provider
- CSP headers configured

---

## 10. Future Considerations

### 10.1 Phase 2 Enhancements

- URL state persistence (shareable links)
- Export to PDF/CSV
- PWA for offline use
- Analytics integration (opt-in)

### 10.2 Phase 3 Possibilities

- Real-time pricing API integration
- User accounts for saved estimates
- More providers
- Spot pricing comparison

---

## Appendix: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-25 | React over Vue/Svelte | Largest ecosystem, team familiarity |
| 2025-01-25 | Vite over CRA | Better performance, modern tooling |
| 2025-01-25 | Tailwind over CSS-in-JS | Rapid development, small bundle |
| 2025-01-25 | useState over Redux | Simplicity - not enough state to justify |
| 2025-01-25 | Embedded JSON over API | Reliability, offline support, no backend |
