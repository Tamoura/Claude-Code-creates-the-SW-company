# GPU Calculator - Technical Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: GPU Calculator

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Components](#system-components)
4. [Calculation Engine](#calculation-engine)
5. [Data Model](#data-model)
6. [Performance Optimization](#performance-optimization)
7. [Deployment](#deployment)
8. [Development Guide](#development-guide)
9. [Testing](#testing)
10. [API Reference](#api-reference)

---

## Architecture Overview

### High-Level Architecture

GPU Calculator is a **client-side only** web application with no backend server. All calculations, filtering, and state management happen in the user's browser.

```
┌──────────────────────────────────────────────────┐
│                  Browser                          │
│  ┌────────────────────────────────────────────┐ │
│  │          React 18 Application               │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │   Components Layer                   │  │ │
│  │  │   - Forms (Training, Inference)      │  │ │
│  │  │   - Results (Comparison Grid)        │  │ │
│  │  │   - Layout (Header, Footer)          │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  │                    │                        │ │
│  │                    ▼                        │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │   Calculation Engine                 │  │ │
│  │  │   - Training Calculator              │  │ │
│  │  │   - Inference Calculator             │  │ │
│  │  │   - TCO Aggregator                   │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  │                    │                        │ │
│  │                    ▼                        │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │   Pricing Data (Static)              │  │ │
│  │  │   - Provider metadata                │  │ │
│  │  │   - GPU specifications               │  │ │
│  │  │   - Storage rates                    │  │ │
│  │  │   - Egress rates                     │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────┐
│         Static Hosting (Vercel/Netlify)          │
│   - HTML, CSS, JS served via CDN                 │
│   - No server-side processing                    │
└──────────────────────────────────────────────────┘
```

### Design Principles

1. **No Backend Required** - Zero infrastructure costs, instant calculations, privacy-first
2. **Static Pricing Data** - Embedded at build time, updated monthly via deployments
3. **Client-Side Calculations** - All compute happens in browser for speed and privacy
4. **Responsive Design** - Mobile-first approach, works on all devices
5. **Progressive Enhancement** - Core functionality works without JavaScript

---

## Technology Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 18.x | Component-based UI, hooks, concurrent features |
| Build Tool | Vite | 5.x | Fast dev server, optimized builds, small bundle |
| Language | TypeScript | 5.x | Type safety for calculation logic |
| Styling | Tailwind CSS | 3.x | Utility-first CSS, rapid development |
| State Management | React useState/useReducer | - | Sufficient for application complexity |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code quality and consistency |
| Prettier | Code formatting |
| Vitest | Unit testing framework |
| Playwright | End-to-end testing |
| Vite Plugin React | React Fast Refresh support |

### Deployment

| Aspect | Choice |
|--------|--------|
| Hosting | Vercel (recommended) or Netlify |
| CDN | Included with hosting provider |
| Domain | Custom domain via hosting provider |
| CI/CD | GitHub Actions or auto-deploy |

---

## System Components

### Component Architecture

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Site header with navigation
│   │   └── Footer.tsx              # Site footer with metadata
│   ├── forms/
│   │   ├── TrainingForm.tsx        # Training parameter inputs
│   │   ├── InferenceForm.tsx       # Inference parameter inputs
│   │   ├── GPUSelector.tsx         # GPU type selection
│   │   └── FormField.tsx           # Reusable form field
│   ├── results/
│   │   ├── ComparisonGrid.tsx      # Provider comparison table
│   │   ├── ProviderCard.tsx        # Individual provider result
│   │   └── SortControls.tsx        # Sort and filter controls
│   └── common/
│       ├── Button.tsx              # Button component
│       ├── Tabs.tsx                # Tab navigation
│       └── Tooltip.tsx             # Tooltip component
│
├── calculators/
│   ├── index.ts                    # Public API exports
│   ├── trainingCalculator.ts      # Training cost calculations
│   ├── inferenceCalculator.ts     # Inference cost calculations
│   ├── storageCalculator.ts       # Storage cost calculations
│   ├── networkCalculator.ts       # Network cost calculations
│   └── formulas.ts                # Shared calculation formulas
│
├── data/
│   ├── index.ts                    # Data exports
│   ├── providers.ts                # Provider metadata
│   ├── gpus.ts                     # GPU specifications
│   ├── storage.ts                  # Storage pricing
│   ├── egress.ts                   # Egress pricing
│   └── presets.ts                  # Quick-start presets
│
├── types/
│   ├── index.ts                    # Type exports
│   ├── inputs.ts                   # Input form types
│   ├── outputs.ts                  # Result types
│   └── pricing.ts                  # Pricing data types
│
├── hooks/
│   ├── useCalculator.ts            # Main calculation hook
│   └── useValidation.ts            # Form validation hook
│
└── utils/
    ├── formatters.ts               # Number and currency formatting
    └── validators.ts               # Input validation functions
```

### Component Responsibilities

**Layout Components**
- `Header`: Navigation, logo, GitHub link
- `Footer`: Last updated date, methodology link

**Form Components**
- `TrainingForm`: Model size, dataset, epochs, GPU config
- `InferenceForm`: Model size, requests/sec, latency tier
- `GPUSelector`: GPU type dropdown with memory info
- `FormField`: Label, input, validation, error display

**Results Components**
- `ComparisonGrid`: Displays all provider results
- `ProviderCard`: Single provider with expand/collapse
- `SortControls`: Sort by cost, filter by availability

---

## Calculation Engine

### Training Cost Formula

```typescript
// trainingCalculator.ts

interface TrainingConfig {
  modelSize: number;        // Billions of parameters
  datasetSize: number;      // GB
  epochs: number;
  gpuType: GPUType;
  gpuCount: number;
}

function calculateTrainingCost(config: TrainingConfig): ProviderResult[] {
  // Step 1: Calculate training FLOPs
  const datasetTokens = config.datasetSize * 1e9 / 2; // ~2 bytes per token
  const trainingFlops = 6 * config.modelSize * 1e9 * datasetTokens * config.epochs;

  // Step 2: Calculate training hours
  const gpuTflops = getGPUTflops(config.gpuType);
  const utilization = 0.5; // Assume 50% utilization
  const flopsPerSecond = gpuTflops * 1e12 * utilization * config.gpuCount;
  const trainingSeconds = trainingFlops / flopsPerSecond;
  const trainingHours = trainingSeconds / 3600;

  // Step 3: Calculate costs per provider
  const results: ProviderResult[] = providers.map(provider => {
    const gpuRate = getGPUHourlyRate(provider, config.gpuType);
    const computeCost = gpuRate * config.gpuCount * trainingHours;

    const storageCost = calculateStorageCost({
      datasetSize: config.datasetSize,
      provider: provider
    });

    return {
      provider: provider.name,
      totalCost: computeCost + storageCost,
      computeCost,
      storageCost,
      networkCost: 0, // Minimal for training
      hours: trainingHours
    };
  });

  return results.sort((a, b) => a.totalCost - b.totalCost);
}
```

### Inference Cost Formula

```typescript
// inferenceCalculator.ts

interface InferenceConfig {
  modelSize: number;        // Billions of parameters
  requestsPerSecond: number;
  batchSize: number;
  latencyTier: 'realtime' | 'standard' | 'batch';
  responseSize: number;     // KB
}

function calculateInferenceCost(config: InferenceConfig): ProviderResult[] {
  // Step 1: Calculate tokens per second
  const avgTokensPerRequest = 100; // Assumption
  const tokensPerSecond = config.requestsPerSecond * avgTokensPerRequest;

  // Step 2: Calculate GPU requirement
  const tokensPerGpuPerSecond = getInferenceTokenRate(config.modelSize);
  const utilizationFactor = config.latencyTier === 'realtime' ? 0.3 : 0.7;
  const gpusNeeded = Math.ceil(tokensPerSecond / (tokensPerGpuPerSecond * utilizationFactor));

  // Step 3: Calculate monthly hours
  const monthlyHours = gpusNeeded * 24 * 30;

  // Step 4: Calculate egress
  const monthlyRequests = config.requestsPerSecond * 86400 * 30;
  const monthlyEgressGB = monthlyRequests * config.responseSize / (1024 * 1024);

  // Step 5: Calculate costs per provider
  const results: ProviderResult[] = providers.map(provider => {
    const gpuRate = getGPUHourlyRate(provider, selectOptimalGPU(config.modelSize));
    const computeCost = gpuRate * monthlyHours;

    const egressCost = calculateEgressCost({
      egressGB: monthlyEgressGB,
      provider: provider
    });

    return {
      provider: provider.name,
      totalCost: computeCost + egressCost,
      computeCost,
      storageCost: 0,
      networkCost: egressCost,
      hours: monthlyHours
    };
  });

  return results;
}
```

### Key Formulas

**Training FLOPS**:
```
training_flops = 6 × model_params × dataset_tokens × epochs
```

**Training Hours**:
```
hours = training_flops / (gpu_tflops × 1e12 × utilization × num_gpus × 3600)
```

**Inference GPU Count**:
```
tokens_per_second = requests_per_sec × avg_tokens_per_request
gpus_needed = ceil(tokens_per_second / tokens_per_gpu_per_second)
```

**Monthly Egress**:
```
monthly_egress_gb = requests_per_month × avg_response_kb / (1024 × 1024)
egress_cost = max(0, monthly_egress_gb - free_tier_gb) × per_gb_rate
```

---

## Data Model

### Provider Data Structure

```typescript
// types/pricing.ts

interface Provider {
  id: string;
  name: string;
  website: string;
  logo: string;
  gpus: GPU[];
  storage: StorageRate;
  egress: EgressRate;
}

interface GPU {
  id: string;
  name: string;
  memory: number;           // GB
  tflops: number;           // FP32 TFLOPS
  hourlyRate: number;       // USD per hour
  available: boolean;
}

interface StorageRate {
  provider: string;
  perGBMonth: number;       // USD per GB per month
  minCharge: number;        // Minimum monthly charge
}

interface EgressRate {
  provider: string;
  perGB: number;            // USD per GB
  freeTierGB: number;       // Free monthly egress
}
```

### Preset Data Structure

```typescript
interface Preset {
  id: string;
  name: string;
  description: string;
  type: 'training' | 'inference';
  config: TrainingConfig | InferenceConfig;
}

const presets: Preset[] = [
  {
    id: 'training-7b',
    name: '7B Model Training',
    description: 'Train a 7 billion parameter model',
    type: 'training',
    config: {
      modelSize: 7,
      datasetSize: 100,
      epochs: 3,
      gpuType: 'A100-80GB',
      gpuCount: 4
    }
  },
  // More presets...
];
```

---

## Performance Optimization

### Bundle Size Optimization

**Target**: < 500KB gzipped

**Strategies**:
- Tree-shaking for unused code
- Code splitting by route
- Dynamic imports for heavy components
- Minimize dependencies

**Bundle Analysis**:
```bash
# Build and analyze bundle
npm run build
npm run analyze

# Expected output:
# - React + ReactDOM: ~45KB
# - Tailwind (purged): ~10KB
# - App code: ~50KB
# - Pricing data: ~20KB
# Total: ~125KB gzipped
```

### Runtime Performance

**Targets**:
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Calculation time: < 100ms

**Optimization Techniques**:
1. **Memoization**: Cache calculation results
2. **Debouncing**: Debounce form inputs (300ms)
3. **Virtual Scrolling**: For large provider lists
4. **Web Workers**: Offload heavy calculations (future)

```typescript
// Example: Memoized calculation
import { useMemo } from 'react';

function ResultsPanel({ config }) {
  const results = useMemo(() => {
    return calculateTrainingCost(config);
  }, [config]); // Recalculate only when config changes

  return <ComparisonGrid results={results} />;
}
```

---

## Deployment

### Build Process

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build

# Output directory: dist/
# - index.html
# - assets/
#   - index-[hash].js
#   - index-[hash].css
```

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Link to Vercel
   vercel link
   ```

2. **Configure Build**
   ```json
   // vercel.json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite"
   }
   ```

3. **Deploy**
   ```bash
   # Deploy to production
   vercel --prod
   ```

### Environment Variables

No environment variables needed for MVP (static pricing data).

Future considerations:
- `VITE_ANALYTICS_ID`: Google Analytics ID
- `VITE_PRICING_API_URL`: Real-time pricing API

---

## Development Guide

### Setup

```bash
# Clone repository
git clone https://github.com/connectsw/gpu-calculator.git
cd gpu-calculator

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/add-tpu-support
   ```

2. **Make Changes**
   - Edit components in `src/components/`
   - Update calculations in `src/calculators/`
   - Add pricing data in `src/data/`

3. **Test Changes**
   ```bash
   npm test                  # Run unit tests
   npm run test:e2e          # Run E2E tests
   npm run lint              # Check code quality
   ```

4. **Build and Preview**
   ```bash
   npm run build
   npm run preview
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add TPU pricing support"
   git push origin feature/add-tpu-support
   ```

6. **Create Pull Request**
   - Open PR on GitHub
   - Wait for CI checks to pass
   - Request review

### Updating Pricing Data

Pricing data should be updated monthly:

```bash
# 1. Update data files
vim src/data/gpus.ts
vim src/data/storage.ts
vim src/data/egress.ts

# 2. Update lastUpdated date
vim src/data/index.ts

# 3. Test calculations
npm test

# 4. Commit and deploy
git commit -m "chore: update pricing data for Jan 2026"
git push
```

---

## Testing

### Unit Tests (Vitest)

**Coverage Target**: 80%+

```typescript
// Example: Testing calculation function
import { describe, it, expect } from 'vitest';
import { calculateTrainingCost } from './trainingCalculator';

describe('calculateTrainingCost', () => {
  it('calculates cost for 7B model', () => {
    const config = {
      modelSize: 7,
      datasetSize: 100,
      epochs: 3,
      gpuType: 'A100-80GB',
      gpuCount: 4
    };

    const results = calculateTrainingCost(config);

    expect(results).toHaveLength(7); // 7 providers
    expect(results[0].totalCost).toBeGreaterThan(0);
    expect(results[0].hours).toBeGreaterThan(0);
  });

  it('handles edge case: 0 epochs', () => {
    const config = { modelSize: 7, datasetSize: 100, epochs: 0, gpuType: 'A100-80GB', gpuCount: 1 };
    const results = calculateTrainingCost(config);
    expect(results[0].hours).toBe(0);
  });
});
```

### Integration Tests

```typescript
// Example: Testing component integration
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingForm } from './TrainingForm';

it('calculates training cost on submit', async () => {
  render(<TrainingForm />);

  fireEvent.change(screen.getByLabelText('Model Size'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Dataset Size'), { target: { value: '100' } });
  fireEvent.click(screen.getByText('Calculate'));

  expect(await screen.findByText(/AWS/)).toBeInTheDocument();
  expect(await screen.findByText(/GCP/)).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/training-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete training cost calculation flow', async ({ page }) => {
  await page.goto('/');

  // Select training tab
  await page.click('text=Training');

  // Fill form
  await page.fill('[name="modelSize"]', '7');
  await page.fill('[name="datasetSize"]', '100');
  await page.fill('[name="epochs"]', '3');

  // Submit
  await page.click('text=Calculate');

  // Verify results
  await expect(page.locator('text=AWS')).toBeVisible();
  await expect(page.locator('text=Total Cost')).toBeVisible();
});
```

---

## API Reference

### Public API

The calculator exposes these functions for programmatic use:

```typescript
import { calculateTrainingCost, calculateInferenceCost } from '@gpu-calculator/core';

// Training calculation
const trainingResults = calculateTrainingCost({
  modelSize: 7,
  datasetSize: 100,
  epochs: 3,
  gpuType: 'A100-80GB',
  gpuCount: 4
});

// Inference calculation
const inferenceResults = calculateInferenceCost({
  modelSize: 7,
  requestsPerSecond: 10,
  batchSize: 4,
  latencyTier: 'standard',
  responseSize: 5
});
```

### Type Definitions

Full type definitions available in `src/types/index.ts`:

```typescript
export type { TrainingConfig, InferenceConfig, ProviderResult, GPU, Provider };
```

---

**End of Technical Manual**

For questions or contributions, visit our GitHub repository or open an issue.
