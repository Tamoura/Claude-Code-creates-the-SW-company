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
