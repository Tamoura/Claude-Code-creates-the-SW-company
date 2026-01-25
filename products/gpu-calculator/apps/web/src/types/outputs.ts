import type { ProviderId, GPUType } from './pricing';
import type { TrainingConfig, InferenceConfig } from './inputs';

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
