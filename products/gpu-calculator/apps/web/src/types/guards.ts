import type { TrainingConfig, InferenceConfig } from './inputs';
import type { GPUType, ProviderId } from './pricing';

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
