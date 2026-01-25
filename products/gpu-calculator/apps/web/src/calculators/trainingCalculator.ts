import type { TrainingConfig, ProviderResult, GPUType } from '../types';
import { providers, gpuOfferings } from '../data';
import { calculateStorageCost } from './storageCalculator';

/**
 * Calculate training hours based on model parameters and GPU configuration
 * Formula: training_flops = 6 * model_params * dataset_tokens * epochs
 * hours = training_flops / (gpu_flops * utilization * num_gpus)
 *
 * @param config Training configuration
 * @returns Estimated training hours
 */
export function calculateTrainingHours(config: TrainingConfig): number {
  const {
    modelSizeB,
    sampleCount,
    tokensPerSample,
    epochs,
    gpuType,
    gpuCount,
    nodeCount,
  } = config;

  // Get GPU TFLOPS
  const gpuOffering = gpuOfferings.find((g) => g.gpuType === gpuType);
  if (!gpuOffering) return 0;

  // Calculate total tokens
  const totalTokens = sampleCount * tokensPerSample * epochs;

  // Calculate model parameters
  const modelParams = modelSizeB * 1e9;

  // Training FLOPS formula (6 * params * tokens)
  // 6 comes from: 1 forward pass + 2 backward passes + 3 for optimizer overhead
  const trainingFlops = 6 * modelParams * totalTokens;

  // GPU efficiency (assume 50% MFU - Model FLOPS Utilization)
  const efficiency = 0.5;

  // Convert TFLOPS to FLOPS (1 TFLOP = 10^12 FLOPS)
  const gpuFlops = gpuOffering.tflops * 1e12;

  // Total GPUs
  const totalGpus = gpuCount * nodeCount;

  // Calculate hours
  const seconds = trainingFlops / (gpuFlops * efficiency * totalGpus);
  const hours = seconds / 3600;

  return hours;
}

/**
 * Calculate training cost across all providers
 * @param config Training configuration
 * @returns Array of provider results with cost breakdowns
 */
export function calculateTrainingCost(config: TrainingConfig): ProviderResult[] {
  const trainingHours = calculateTrainingHours(config);
  const results: ProviderResult[] = [];

  for (const provider of providers) {
    // Find GPU offering for this provider
    const offering = gpuOfferings.find(
      (g) => g.providerId === provider.id && g.gpuType === config.gpuType
    );

    if (!offering || !offering.available) {
      // Provider doesn't have this GPU or it's unavailable
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        available: false,
        unavailableReason: offering
          ? 'GPU currently unavailable'
          : `${config.gpuType} not offered by this provider`,
        costs: {
          compute: 0,
          storage: 0,
          egress: 0,
          total: 0,
          currency: 'USD',
        },
        configuration: {
          gpuType: config.gpuType,
          instanceType: null,
          gpuCount: config.gpuCount * config.nodeCount,
          hourlyRate: 0,
          estimatedHours: trainingHours,
          storageGb: 0,
          egressGb: 0,
        },
      });
      continue;
    }

    // Calculate costs
    const totalGpus = config.gpuCount * config.nodeCount;

    // For multi-GPU instances, calculate based on instance configuration
    let hourlyRate: number;
    let instancesNeeded: number;

    if (offering.gpuCount > 1) {
      // Provider offers multi-GPU instances
      instancesNeeded = Math.ceil(totalGpus / offering.gpuCount);
      hourlyRate = offering.hourlyRate * instancesNeeded;
    } else {
      // Single GPU instances
      instancesNeeded = totalGpus;
      hourlyRate = offering.hourlyRate * totalGpus;
    }

    const computeCost = trainingHours * hourlyRate;

    // Calculate storage cost
    let storageCost = 0;
    let storageGb = 0;

    if (config.includeStorage) {
      storageGb = config.datasetSizeGb;

      // Add checkpoint storage
      if (config.checkpointFrequency !== 'none') {
        const modelSizeGb = config.modelSizeB * 2; // ~2GB per billion params (FP16)
        let checkpointCount = 0;

        if (config.checkpointFrequency === 'epoch') {
          checkpointCount = config.epochs;
        } else if (
          config.checkpointFrequency === 'steps' &&
          config.checkpointsPerEpoch
        ) {
          checkpointCount = config.epochs * config.checkpointsPerEpoch;
        }

        storageGb += modelSizeGb * checkpointCount;
      }

      storageCost = calculateStorageCost(
        provider.id,
        storageGb,
        config.storageDurationMonths
      );
    }

    const totalCost = computeCost + storageCost;

    results.push({
      providerId: provider.id,
      providerName: provider.name,
      available: true,
      costs: {
        compute: computeCost,
        storage: storageCost,
        egress: 0, // Training typically has minimal egress
        total: totalCost,
        currency: 'USD',
      },
      configuration: {
        gpuType: config.gpuType,
        instanceType: offering.instanceType,
        gpuCount: totalGpus,
        hourlyRate,
        estimatedHours: trainingHours,
        storageGb,
        egressGb: 0,
      },
    });
  }

  return results;
}
