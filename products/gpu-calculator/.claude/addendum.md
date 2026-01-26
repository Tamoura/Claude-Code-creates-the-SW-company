# GPU Calculator - Agent Addendum

## Product Overview

**Name**: AI GPU Usage Calculator
**Type**: Web app (client-side only)
**Status**: Development
**Repository**: `products/gpu-calculator/`

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + Vite | Client-side SPA |
| Backend | None | All calculations client-side |
| Database | None | No data persistence |
| Styling | Tailwind CSS 4 | Use standard colors (blue-*, gray-*) |
| Testing | Vitest + Playwright | Unit + E2E |
| Deployment | Vercel (free tier) | Static hosting |

## Libraries & Dependencies

### Adopted (Use These)

| Library | Purpose | Why Chosen |
|---------|---------|------------|
| React Hook Form | Form state | Minimal re-renders, great DX (ADR-003) |
| Zod | Validation | Type-safe, works with RHF (ADR-003) |
| Recharts | Charts | Cost visualizations (ADR-003) |
| shadcn/ui | UI Components | Accessible, customizable (ADR-003) |

### Avoid (Don't Use)

| Library | Reason |
|---------|--------|
| Redux/Zustand | Overkill - React state sufficient |
| Axios | Overkill - no API calls needed |
| Moment.js | Bundle size - use native Date |
| Material UI | Bundle size - use Tailwind/shadcn |

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Main calculator with tabs |
| /training | MVP | Training cost calculator (tab) |
| /inference | Coming Soon | Inference cost calculator |
| /methodology | Coming Soon | How calculations work |
| /about | Coming Soon | About page |

## Design Patterns

### Component Patterns
```
src/
├── components/
│   ├── ui/           # Base components (from shadcn/ui)
│   ├── forms/        # Calculator input forms
│   ├── results/      # Cost comparison displays
│   └── layout/       # Header, Footer, Page shells
├── calculators/      # Pure calculation functions
├── data/             # Static pricing data
└── hooks/            # Custom React hooks
```

### State Management
- Use React useState for form inputs
- Use custom hooks (useCalculator) for calculation logic
- No global state needed

### API Patterns
- No backend API
- Pricing data embedded in bundle
- Calculations run client-side

## Business Logic

### Key Calculations

**Training Cost Formula:**
```
training_flops = 6 × model_params × dataset_tokens × epochs
training_hours = training_flops / (gpu_flops × efficiency × gpu_count)
cost = training_hours × hourly_rate
```

**Inference Cost Formula:**
```
required_gpus = ceil(requests_per_sec / throughput_per_gpu)
monthly_cost = required_gpus × hourly_rate × hours_per_month
```

### Validation Rules
- Model size: 0.1B - 1000B parameters
- Dataset: > 0 GB
- Epochs: >= 1
- GPU count: 1-1000
- Requests/sec: > 0

## Data Models

### Key Entities
- **Provider**: Cloud provider (AWS, GCP, Azure, Lambda, RunPod, Vast.ai, CoreWeave)
- **GPUOffering**: GPU type with specs and pricing
- **TrainingConfig**: User inputs for training calculation
- **InferenceConfig**: User inputs for inference calculation
- **CalculationResult**: Output with cost breakdown per provider

## External Integrations

None - fully client-side application.

## Performance Requirements

- Bundle size: < 150KB gzipped
- First paint: < 1 second
- Calculation time: < 100ms
- Works offline after initial load

## Special Considerations

1. **Pricing Data Updates**: Pricing is static, updated monthly via code deploy. Show "Last updated" date prominently.

2. **Accuracy Disclaimer**: Estimates are approximate (±20%). Add disclaimer in UI.

3. **No User Data**: No accounts, no saving, no analytics beyond basic page views.

4. **Open Source**: MIT license, welcome contributions for pricing updates.

5. **Accessibility**: All forms must be keyboard navigable, WCAG 2.1 AA compliant.

6. **Mobile First**: Must work well on mobile devices.

---

*Created by*: Architect Agent
*Last Updated*: 2025-01-26
