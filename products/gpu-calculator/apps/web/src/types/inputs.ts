import type { GPUType } from './pricing';

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
