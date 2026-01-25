# AI GPU Usage Calculator - Data Model

**Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: Architect Agent

---

## Overview

This document defines the TypeScript interfaces for all data structures used in the AI GPU Usage Calculator. These types ensure type safety throughout the calculation engine and UI components.

---

## 1. Pricing Data Types

### 1.1 Provider

```typescript
/**
 * Cloud/GPU provider metadata
 */
export interface Provider {
  /** Unique identifier (e.g., 'aws', 'gcp', 'lambda-labs') */
  id: ProviderId;

  /** Full display name (e.g., 'Amazon Web Services') */
  name: string;

  /** Short display name (e.g., 'AWS') */
  shortName: string;

  /** Provider website URL */
  website: string;

  /** Direct link to GPU pricing page */
  pricingUrl: string;

  /** Path to logo asset */
  logoPath: string;

  /** Provider type classification */
  type: 'hyperscaler' | 'gpu-cloud' | 'marketplace';
}

export type ProviderId =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'lambda-labs'
  | 'runpod'
  | 'vast-ai'
  | 'coreweave';
```

### 1.2 GPU Offering

```typescript
/**
 * GPU instance offering from a provider
 */
export interface GPUOffering {
  /** Provider this offering belongs to */
  providerId: ProviderId;

  /** GPU model identifier */
  gpuType: GPUType;

  /** Provider-specific instance type (e.g., 'p5.48xlarge') */
  instanceType: string | null;

  /** Number of GPUs in this instance */
  gpuCount: number;

  /** Memory per GPU in GB */
  memoryGb: number;

  /** FP16 TFLOPS for this GPU */
  tflops: number;

  /** Hourly rate in USD */
  hourlyRate: number;

  /** Whether currently available */
  available: boolean;

  /** Optional notes (e.g., 'Limited availability') */
  notes?: string;
}

export type GPUType =
  | 'H100-80GB'
  | 'A100-80GB'
  | 'A100-40GB'
  | 'A10'
  | 'L4'
  | 'T4'
  | 'RTX-4090'
  | 'RTX-A6000';
```

### 1.3 Storage Rate

```typescript
/**
 * Storage pricing for a provider
 */
export interface StorageRate {
  /** Provider this rate belongs to */
  providerId: ProviderId;

  /** Storage type */
  type: 'object' | 'block';

  /** Tier name (e.g., 'Standard', 'Hot', 'Archive') */
  tierName: string;

  /** Cost per GB per month in USD */
  perGbMonth: number;

  /** Free tier allowance in GB (0 if none) */
  freeGbMonth: number;
}
```

### 1.4 Egress Rate

```typescript
/**
 * Data egress (outbound transfer) pricing
 */
export interface EgressRate {
  /** Provider this rate belongs to */
  providerId: ProviderId;

  /** Base rate per GB in USD (used if no tiers) */
  perGb: number;

  /** Free tier allowance per month in GB */
  freeGbMonth: number;

  /** Tiered pricing (if applicable) */
  tiers?: EgressTier[];
}

export interface EgressTier {
  /** Upper limit of this tier in GB */
  upToGb: number;

  /** Rate per GB in this tier */
  perGb: number;
}
```

### 1.5 Pricing Metadata

```typescript
/**
 * Metadata about the pricing data
 */
export interface PricingMetadata {
  /** When pricing was last updated */
  lastUpdated: string; // ISO 8601 date

  /** Data version for cache busting */
  version: string;

  /** Currency for all prices */
  currency: 'USD';

  /** Pricing type */
  pricingType: 'on-demand';
}
```

---

## 2. Input Types

### 2.1 Training Configuration

```typescript
/**
 * User inputs for training cost calculation
 */
export interface TrainingConfig {
  /** Model size in billions of parameters */
  modelSizeB: number;

  /** Dataset size in GB */
  datasetSizeGb: number;

  /** Number of training epochs */
  epochs: number;

  /** Average tokens per sample (derived from dataset type) */
  tokensPerSample: number;

  /** Number of samples in dataset */
  sampleCount: number;

  /** Selected GPU type */
  gpuType: GPUType;

  /** Number of GPUs to use */
  gpuCount: number;

  /** Number of nodes (for multi-node training) */
  nodeCount: number;

  /** Include storage costs */
  includeStorage: boolean;

  /** Storage duration in months */
  storageDurationMonths: number;

  /** Checkpoint frequency (none, epoch, steps) */
  checkpointFrequency: 'none' | 'epoch' | 'steps';

  /** Checkpoints per epoch (if steps) */
  checkpointsPerEpoch?: number;
}
```

### 2.2 Inference Configuration

```typescript
/**
 * User inputs for inference cost calculation
 */
export interface InferenceConfig {
  /** Model size in billions of parameters */
  modelSizeB: number;

  /** Requests per second (peak) */
  requestsPerSec: number;

  /** -OR- Requests per day (alternative input) */
  requestsPerDay?: number;

  /** Average tokens per request */
  avgTokensPerRequest: number;

  /** Latency requirement tier */
  latencyTier: 'realtime' | 'standard' | 'batch';

  /** Batch size for inference */
  batchSize: number;

  /** Average response size in KB */
  avgResponseSizeKb: number;

  /** Duration for cost calculation */
  durationMonths: number;
}
```

### 2.3 Preset Configuration

```typescript
/**
 * Quick-start preset configuration
 */
export interface Preset {
  /** Unique preset identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description for tooltip */
  description: string;

  /** Calculator mode */
  mode: 'training' | 'inference';

  /** Pre-filled configuration */
  config: Partial<TrainingConfig> | Partial<InferenceConfig>;
}
```

---

## 3. Output Types

### 3.1 Provider Result

```typescript
/**
 * Calculation result for a single provider
 */
export interface ProviderResult {
  /** Provider identifier */
  providerId: ProviderId;

  /** Provider display name */
  providerName: string;

  /** Whether this config is available on this provider */
  available: boolean;

  /** Reason if not available */
  unavailableReason?: string;

  /** Cost breakdown */
  costs: CostBreakdown;

  /** Configuration details */
  configuration: ConfigurationDetails;
}

export interface CostBreakdown {
  /** GPU compute cost */
  compute: number;

  /** Storage cost */
  storage: number;

  /** Network egress cost */
  egress: number;

  /** Total cost of ownership */
  total: number;

  /** Currency */
  currency: 'USD';
}

export interface ConfigurationDetails {
  /** GPU type used */
  gpuType: GPUType;

  /** Instance type (if applicable) */
  instanceType: string | null;

  /** Number of GPUs */
  gpuCount: number;

  /** Hourly rate for compute */
  hourlyRate: number;

  /** Estimated hours */
  estimatedHours: number;

  /** Storage in GB */
  storageGb: number;

  /** Egress in GB */
  egressGb: number;
}
```

### 3.2 Calculation Summary

```typescript
/**
 * Summary of all provider results
 */
export interface CalculationSummary {
  /** Input configuration */
  input: TrainingConfig | InferenceConfig;

  /** Mode of calculation */
  mode: 'training' | 'inference';

  /** Results per provider */
  results: ProviderResult[];

  /** Cheapest available option */
  cheapest: ProviderResult | null;

  /** Most expensive available option */
  mostExpensive: ProviderResult | null;

  /** Timestamp of calculation */
  calculatedAt: string;
}
```

---

## 4. Example Data

### 4.1 Provider Example

```typescript
// src/data/providers.ts
export const providers: Provider[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    website: 'https://aws.amazon.com',
    pricingUrl: 'https://aws.amazon.com/ec2/pricing/on-demand/',
    logoPath: '/assets/logos/aws.svg',
    type: 'hyperscaler'
  },
  {
    id: 'lambda-labs',
    name: 'Lambda Labs',
    shortName: 'Lambda',
    website: 'https://lambdalabs.com',
    pricingUrl: 'https://lambdalabs.com/service/gpu-cloud',
    logoPath: '/assets/logos/lambda-labs.svg',
    type: 'gpu-cloud'
  }
  // ... other providers
];
```

### 4.2 GPU Offerings Example

```typescript
// src/data/gpus.ts
export const gpuOfferings: GPUOffering[] = [
  // AWS
  {
    providerId: 'aws',
    gpuType: 'H100-80GB',
    instanceType: 'p5.48xlarge',
    gpuCount: 8,
    memoryGb: 80,
    tflops: 1979, // FP16
    hourlyRate: 98.32,
    available: true
  },
  {
    providerId: 'aws',
    gpuType: 'A100-80GB',
    instanceType: 'p4d.24xlarge',
    gpuCount: 8,
    memoryGb: 80,
    tflops: 312,
    hourlyRate: 32.77,
    available: true
  },
  {
    providerId: 'aws',
    gpuType: 'A10',
    instanceType: 'g5.xlarge',
    gpuCount: 1,
    memoryGb: 24,
    tflops: 125,
    hourlyRate: 1.006,
    available: true
  },

  // Lambda Labs
  {
    providerId: 'lambda-labs',
    gpuType: 'H100-80GB',
    instanceType: null,
    gpuCount: 1,
    memoryGb: 80,
    tflops: 1979,
    hourlyRate: 2.49,
    available: true,
    notes: 'Limited availability'
  },
  {
    providerId: 'lambda-labs',
    gpuType: 'A100-80GB',
    instanceType: null,
    gpuCount: 1,
    memoryGb: 80,
    tflops: 312,
    hourlyRate: 1.29,
    available: true
  },
  {
    providerId: 'lambda-labs',
    gpuType: 'A10',
    instanceType: null,
    gpuCount: 1,
    memoryGb: 24,
    tflops: 125,
    hourlyRate: 0.60,
    available: true
  }
  // ... other providers
];
```

### 4.3 Storage Rates Example

```typescript
// src/data/storage.ts
export const storageRates: StorageRate[] = [
  {
    providerId: 'aws',
    type: 'object',
    tierName: 'S3 Standard',
    perGbMonth: 0.023,
    freeGbMonth: 5
  },
  {
    providerId: 'gcp',
    type: 'object',
    tierName: 'Cloud Storage Standard',
    perGbMonth: 0.020,
    freeGbMonth: 5
  },
  {
    providerId: 'lambda-labs',
    type: 'object',
    tierName: 'Persistent Storage',
    perGbMonth: 0.20,
    freeGbMonth: 0
  }
  // ... other providers
];
```

### 4.4 Egress Rates Example

```typescript
// src/data/egress.ts
export const egressRates: EgressRate[] = [
  {
    providerId: 'aws',
    perGb: 0.09,
    freeGbMonth: 100,
    tiers: [
      { upToGb: 10000, perGb: 0.09 },
      { upToGb: 50000, perGb: 0.085 },
      { upToGb: 150000, perGb: 0.07 },
      { upToGb: Infinity, perGb: 0.05 }
    ]
  },
  {
    providerId: 'gcp',
    perGb: 0.12,
    freeGbMonth: 1,
    tiers: [
      { upToGb: 1024, perGb: 0.12 },
      { upToGb: 10240, perGb: 0.11 },
      { upToGb: Infinity, perGb: 0.08 }
    ]
  },
  {
    providerId: 'lambda-labs',
    perGb: 0.00, // Free egress
    freeGbMonth: Infinity
  }
  // ... other providers
];
```

### 4.5 Presets Example

```typescript
// src/data/presets.ts
export const presets: Preset[] = [
  {
    id: '7b-training',
    name: '7B Model Training',
    description: 'Train a 7 billion parameter model like Llama 2 7B',
    mode: 'training',
    config: {
      modelSizeB: 7,
      datasetSizeGb: 100,
      epochs: 3,
      tokensPerSample: 512,
      sampleCount: 1000000,
      gpuType: 'A100-80GB',
      gpuCount: 8,
      nodeCount: 1,
      includeStorage: true,
      storageDurationMonths: 1,
      checkpointFrequency: 'epoch'
    }
  },
  {
    id: '70b-training',
    name: '70B Model Training',
    description: 'Train a 70 billion parameter model like Llama 2 70B',
    mode: 'training',
    config: {
      modelSizeB: 70,
      datasetSizeGb: 500,
      epochs: 1,
      tokensPerSample: 2048,
      sampleCount: 5000000,
      gpuType: 'H100-80GB',
      gpuCount: 8,
      nodeCount: 4,
      includeStorage: true,
      storageDurationMonths: 3,
      checkpointFrequency: 'steps',
      checkpointsPerEpoch: 10
    }
  },
  {
    id: 'llm-api',
    name: 'LLM API Serving',
    description: 'Serve a 7B model for API requests at ~100 req/s',
    mode: 'inference',
    config: {
      modelSizeB: 7,
      requestsPerSec: 100,
      avgTokensPerRequest: 500,
      latencyTier: 'standard',
      batchSize: 16,
      avgResponseSizeKb: 2,
      durationMonths: 1
    }
  },
  {
    id: 'image-model',
    name: 'Image Model Serving',
    description: 'Serve an image generation model at moderate scale',
    mode: 'inference',
    config: {
      modelSizeB: 2,
      requestsPerSec: 10,
      avgTokensPerRequest: 100,
      latencyTier: 'realtime',
      batchSize: 1,
      avgResponseSizeKb: 500,
      durationMonths: 1
    }
  }
];
```

### 4.6 Metadata Example

```typescript
// src/data/metadata.ts
export const pricingMetadata: PricingMetadata = {
  lastUpdated: '2025-01-25',
  version: '1.0.0',
  currency: 'USD',
  pricingType: 'on-demand'
};
```

---

## 5. Validation Schemas

### 5.1 Input Validation

```typescript
// src/utils/validators.ts

export const trainingConfigSchema = {
  modelSizeB: { min: 0.1, max: 1000 },
  datasetSizeGb: { min: 0.1, max: 100000 },
  epochs: { min: 1, max: 100 },
  tokensPerSample: { min: 1, max: 32768 },
  gpuCount: { min: 1, max: 256 },
  nodeCount: { min: 1, max: 64 },
  storageDurationMonths: { min: 1, max: 36 }
};

export const inferenceConfigSchema = {
  modelSizeB: { min: 0.1, max: 1000 },
  requestsPerSec: { min: 0.1, max: 10000 },
  avgTokensPerRequest: { min: 1, max: 32768 },
  batchSize: { min: 1, max: 256 },
  avgResponseSizeKb: { min: 0.1, max: 10000 },
  durationMonths: { min: 1, max: 36 }
};
```

---

## 6. Type Guards

```typescript
// src/types/guards.ts

export function isTrainingConfig(
  config: TrainingConfig | InferenceConfig
): config is TrainingConfig {
  return 'epochs' in config;
}

export function isInferenceConfig(
  config: TrainingConfig | InferenceConfig
): config is InferenceConfig {
  return 'requestsPerSec' in config;
}

export function isValidGPUType(value: string): value is GPUType {
  const validTypes: GPUType[] = [
    'H100-80GB', 'A100-80GB', 'A100-40GB',
    'A10', 'L4', 'T4', 'RTX-4090', 'RTX-A6000'
  ];
  return validTypes.includes(value as GPUType);
}

export function isValidProviderId(value: string): value is ProviderId {
  const validIds: ProviderId[] = [
    'aws', 'gcp', 'azure', 'lambda-labs',
    'runpod', 'vast-ai', 'coreweave'
  ];
  return validIds.includes(value as ProviderId);
}
```

---

## 7. Aggregate Export

```typescript
// src/data/index.ts

export { providers } from './providers';
export { gpuOfferings } from './gpus';
export { storageRates } from './storage';
export { egressRates } from './egress';
export { presets } from './presets';
export { pricingMetadata } from './metadata';

// Re-export types
export type {
  Provider,
  ProviderId,
  GPUOffering,
  GPUType,
  StorageRate,
  EgressRate,
  EgressTier,
  PricingMetadata,
  Preset
} from '../types';
```
