import type { InferenceConfig, ProviderResult, GPUType } from '../types';
import { providers, gpuOfferings } from '../data';
import { calculateEgressCost } from './networkCalculator';

/**
 * Calculate required number of GPUs for inference workload
 * Based on throughput requirements and GPU capabilities
 *
 * @param gpuType GPU type to use
 * @param requestsPerSec Peak requests per second
 * @param avgTokensPerRequest Average tokens per request
 * @param latencyTier Latency requirement (affects utilization)
 * @returns Number of GPUs required
 */
export function calculateRequiredGPUs(
  gpuType: GPUType,
  requestsPerSec: number,
  avgTokensPerRequest: number,
  latencyTier: 'realtime' | 'standard' | 'batch'
): number {
  const gpuOffering = gpuOfferings.find((g) => g.gpuType === gpuType);
  if (!gpuOffering) return 1;

  // Tokens per second needed
  const tokensPerSecond = requestsPerSec * avgTokensPerRequest;

  // GPU throughput varies by model size and GPU type
  // Approximate tokens/sec per GPU (for 7B model on various GPUs)
  const baseTokensPerGpuPerSec: Record<string, number> = {
    'H100-80GB': 1500,
    'A100-80GB': 600,
    'A100-40GB': 500,
    A10: 200,
    L4: 180,
    T4: 100,
    'RTX-4090': 250,
    'RTX-A6000': 150,
  };

  const tokensPerGpu = baseTokensPerGpuPerSec[gpuType] || 100;

  // Utilization targets based on latency tier
  const utilization = {
    realtime: 0.4, // Lower utilization for consistent low latency
    standard: 0.7, // Balanced utilization
    batch: 0.9, // High utilization, latency less critical
  }[latencyTier];

  // Calculate required GPUs
  const effectiveTokensPerGpu = tokensPerGpu * utilization;
  const requiredGpus = Math.ceil(tokensPerSecond / effectiveTokensPerGpu);

  return Math.max(1, requiredGpus);
}

/**
 * Calculate monthly inference cost across all providers
 * @param config Inference configuration
 * @returns Array of provider results with cost breakdowns
 */
export function calculateMonthlyInferenceCost(
  config: InferenceConfig
): ProviderResult[] {
  const {
    modelSizeB,
    requestsPerSec,
    avgTokensPerRequest,
    latencyTier,
    avgResponseSizeKb,
    durationMonths,
  } = config;

  // Determine GPU type based on model size
  // This is a simple heuristic - could be made more sophisticated
  let recommendedGpuType: GPUType;
  if (modelSizeB <= 7) {
    recommendedGpuType = 'A100-80GB';
  } else if (modelSizeB <= 13) {
    recommendedGpuType = 'A100-80GB';
  } else if (modelSizeB <= 70) {
    recommendedGpuType = 'H100-80GB';
  } else {
    recommendedGpuType = 'H100-80GB';
  }

  const results: ProviderResult[] = [];

  for (const provider of providers) {
    // Try to find the recommended GPU, fall back to available alternatives
    let offering = gpuOfferings.find(
      (g) => g.providerId === provider.id && g.gpuType === recommendedGpuType
    );

    // If recommended GPU not available, try alternatives
    if (!offering || !offering.available) {
      const alternatives: GPUType[] = [
        'H100-80GB',
        'A100-80GB',
        'A100-40GB',
        'L4',
        'A10',
      ];
      for (const altGpu of alternatives) {
        offering = gpuOfferings.find(
          (g) => g.providerId === provider.id && g.gpuType === altGpu
        );
        if (offering && offering.available) break;
      }
    }

    if (!offering || !offering.available) {
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        available: false,
        unavailableReason: 'No suitable GPUs available for this workload',
        costs: {
          compute: 0,
          storage: 0,
          egress: 0,
          total: 0,
          currency: 'USD',
        },
        configuration: {
          gpuType: recommendedGpuType,
          instanceType: null,
          gpuCount: 0,
          hourlyRate: 0,
          estimatedHours: 0,
          storageGb: 0,
          egressGb: 0,
        },
      });
      continue;
    }

    // Calculate required GPUs
    const requiredGpus = calculateRequiredGPUs(
      offering.gpuType,
      requestsPerSec,
      avgTokensPerRequest,
      latencyTier
    );

    // Calculate hourly rate
    let hourlyRate: number;
    if (offering.gpuCount > 1) {
      // Multi-GPU instances
      const instancesNeeded = Math.ceil(requiredGpus / offering.gpuCount);
      hourlyRate = offering.hourlyRate * instancesNeeded;
    } else {
      hourlyRate = offering.hourlyRate * requiredGpus;
    }

    // Calculate monthly compute cost (24 hours * 30 days)
    const hoursPerMonth = 24 * 30;
    const monthlyComputeCost = hourlyRate * hoursPerMonth * durationMonths;

    // Calculate egress
    const requestsPerMonth = requestsPerSec * 60 * 60 * 24 * 30;
    const egressGb = (requestsPerMonth * avgResponseSizeKb) / 1024 / 1024;
    const totalEgressGb = egressGb * durationMonths;

    const egressCost = calculateEgressCost(provider.id, totalEgressGb);

    // Model storage (typically small for inference)
    const modelStorageGb = modelSizeB * 2; // FP16

    const totalCost = monthlyComputeCost + egressCost;

    results.push({
      providerId: provider.id,
      providerName: provider.name,
      available: true,
      costs: {
        compute: monthlyComputeCost,
        storage: 0, // Model storage typically included in instance
        egress: egressCost,
        total: totalCost,
        currency: 'USD',
      },
      configuration: {
        gpuType: offering.gpuType,
        instanceType: offering.instanceType,
        gpuCount: requiredGpus,
        hourlyRate,
        estimatedHours: hoursPerMonth * durationMonths,
        storageGb: modelStorageGb,
        egressGb: totalEgressGb,
      },
    });
  }

  return results;
}
