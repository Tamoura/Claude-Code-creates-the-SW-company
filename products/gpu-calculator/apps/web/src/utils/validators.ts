/**
 * Input validation schemas and functions
 */

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

/**
 * Validate a number against min/max constraints
 */
export function validateNumber(
  value: number,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (value > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return null;
}
