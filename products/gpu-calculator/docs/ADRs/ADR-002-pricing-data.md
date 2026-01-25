# ADR-002: Pricing Data Strategy

**Status**: Accepted
**Date**: 2025-01-25
**Decision Makers**: Architect Agent
**Context**: AI GPU Usage Calculator MVP

---

## Context

The AI GPU Usage Calculator needs access to pricing data for 7 cloud GPU providers:
- AWS (EC2 GPU instances)
- Google Cloud Platform (GCP)
- Microsoft Azure
- Lambda Labs
- RunPod
- Vast.ai
- CoreWeave

The pricing data includes:
- GPU instance hourly rates
- Object storage per-GB monthly rates
- Data egress per-GB rates
- GPU specifications (memory, TFLOPS)

We need to decide how this data is stored, structured, and updated.

---

## Decision

### Storage: Embedded TypeScript Files

**Choice**: Static TypeScript files compiled into the application bundle

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| **Embedded TS/JSON** | No API, offline works, instant access, type-safe | Manual updates, stale data possible |
| Real-time API calls | Always current pricing | API costs, latency, rate limits, CORS, downtime |
| Backend with cache | Fresh data, single source | Infrastructure cost, complexity, maintenance |
| Third-party pricing API | Less maintenance | Dependency, cost, may not cover all providers |
| JSON fetched at runtime | Updatable without redeploy | Network dependency, loading state |

**Decision Rationale**:

1. **No Backend Requirement**: PRD explicitly requires client-side only for MVP
2. **Reliability**: No API failures, network issues, or CORS problems
3. **Performance**: Data available instantly, no loading spinners
4. **Offline Support**: Calculator works without internet after initial load
5. **Type Safety**: TypeScript interfaces catch data structure errors
6. **Simplicity**: No API keys, authentication, or rate limiting
7. **Transparency**: Open source - users can see exactly what prices are used

---

### Structure: Normalized TypeScript Modules

**Data Organization**:

```
src/data/
├── index.ts           # Re-exports all data
├── providers.ts       # Provider metadata (name, logo, website)
├── gpus.ts           # GPU specs and hourly rates per provider
├── storage.ts        # Storage rates per provider
├── egress.ts         # Egress rates per provider
├── presets.ts        # Quick-start configurations
└── metadata.ts       # Last updated date, version
```

**Normalized Structure Rationale**:
1. **Maintainability**: Change GPU prices without touching storage rates
2. **Type Inference**: TypeScript can infer precise types
3. **Testing**: Each data file can be validated independently
4. **Code Splitting**: (Future) Could lazy-load less common providers

---

### Update Process: Monthly Manual Updates

**Chosen Process**:

1. **Schedule**: First week of each month
2. **Responsibility**: Maintainer or contributor
3. **Process**:
   ```
   a. Review each provider's pricing page
   b. Update TypeScript files with new rates
   c. Update lastUpdated in metadata.ts
   d. Run data validation tests
   e. Create PR with pricing update
   f. Review and merge
   g. Auto-deploy via CI/CD
   ```
4. **Display**: Show "Prices last updated: [date]" in footer

**Update Tooling** (Phase 2):
- GitHub Action to remind about monthly updates
- Automated price change detection scripts
- Changelog for pricing changes

---

### Data Validation

**Build-Time Validation**:
```typescript
// src/data/validation.ts
export function validatePricingData(): ValidationResult {
  // Check all providers have required GPU types
  // Check all rates are positive numbers
  // Check no duplicate entries
  // Check storage and egress defined for all providers
}
```

**Test Coverage**:
```typescript
// tests/data/pricing.test.ts
describe('Pricing Data Integrity', () => {
  it('all providers have at least one GPU', () => {})
  it('all GPU rates are positive', () => {})
  it('all providers have storage rates', () => {})
  it('all providers have egress rates', () => {})
  it('lastUpdated is within 45 days', () => {})
})
```

---

## Consequences

### Positive

- **Zero infrastructure cost** - no backend, no database
- **100% uptime** - data is part of the app
- **Fast calculations** - no API latency
- **Works offline** - after initial load
- **Transparent** - open source data, auditable
- **Type-safe** - compilation catches data structure errors

### Negative

- **Data can be stale** - up to 30 days between updates
- **Manual effort** - requires monthly maintenance
- **Redeploy required** - price changes need new deployment
- **No real-time accuracy** - can't reflect flash sales or promotions

### Mitigations

| Risk | Mitigation |
|------|------------|
| Stale data | Display last updated date prominently |
| Missed updates | GitHub Action reminders, community PRs |
| Price variance | Document that estimates are approximate (+/- 20%) |
| Special pricing | Note that on-demand prices only (no spot/reserved) |

---

## Data Schema

### Provider Metadata

```typescript
interface Provider {
  id: string;           // 'aws' | 'gcp' | 'azure' | etc.
  name: string;         // 'Amazon Web Services'
  shortName: string;    // 'AWS'
  website: string;      // 'https://aws.amazon.com'
  pricingUrl: string;   // Direct link to GPU pricing page
  logoPath: string;     // '/assets/logos/aws.svg'
}
```

### GPU Pricing

```typescript
interface GPUOffering {
  providerId: string;
  gpuType: string;      // 'H100' | 'A100-80GB' | 'A10' | etc.
  instanceType: string; // 'p5.48xlarge' (AWS) or null
  gpuCount: number;     // GPUs per instance
  memoryGb: number;     // Memory per GPU
  tflops: number;       // FP16 TFLOPS for calculations
  hourlyRate: number;   // USD per hour
  available: boolean;   // Currently available
  regions?: string[];   // Optional: specific regions
}
```

### Storage Pricing

```typescript
interface StorageRate {
  providerId: string;
  type: 'object' | 'block';
  tierName: string;     // 'Standard', 'Hot', etc.
  perGbMonth: number;   // USD per GB per month
  freeGb?: number;      // Free tier if applicable
}
```

### Egress Pricing

```typescript
interface EgressRate {
  providerId: string;
  perGb: number;        // USD per GB
  freeGbMonth: number;  // Free tier per month
  tiers?: EgressTier[]; // Tiered pricing if applicable
}

interface EgressTier {
  upToGb: number;
  perGb: number;
}
```

---

## Example Data

See `data-model.md` for complete TypeScript interfaces and example data for all providers.

---

## Future Considerations

### Phase 2: Automated Price Monitoring

```typescript
// GitHub Action: price-checker.yml
// Runs weekly, compares cached prices to provider pages
// Opens issue if significant changes detected
```

### Phase 3: Real-Time API Option

```typescript
// Optional API integration for users who want live prices
// Fallback to embedded data if API unavailable
interface PricingSource {
  type: 'embedded' | 'api';
  lastUpdated: Date;
  source: string;
}
```

---

## References

- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [GCP GPU Pricing](https://cloud.google.com/compute/gpus-pricing)
- [Azure VM Pricing](https://azure.microsoft.com/pricing/details/virtual-machines/)
- [Lambda Labs Pricing](https://lambdalabs.com/service/gpu-cloud)
- [RunPod Pricing](https://www.runpod.io/gpu-instance/pricing)
- [Vast.ai Pricing](https://vast.ai/pricing)
- [CoreWeave Pricing](https://www.coreweave.com/pricing)
