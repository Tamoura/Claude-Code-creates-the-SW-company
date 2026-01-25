import type { TrainingConfig, InferenceConfig, CalculationSummary } from '../types';
import { calculateTrainingCost } from './trainingCalculator';
import { calculateMonthlyInferenceCost } from './inferenceCalculator';

/**
 * Calculate Total Cost of Ownership for training workload
 * Combines compute, storage, and network costs
 *
 * @param config Training configuration
 * @returns Complete calculation summary with all provider results
 */
export function calculateTrainingTCO(
  config: TrainingConfig
): CalculationSummary {
  const results = calculateTrainingCost(config);

  // Find cheapest and most expensive available options
  const availableResults = results.filter((r) => r.available);
  const sortedByCost = [...availableResults].sort(
    (a, b) => a.costs.total - b.costs.total
  );

  return {
    input: config,
    mode: 'training',
    results,
    cheapest: sortedByCost[0] || null,
    mostExpensive: sortedByCost[sortedByCost.length - 1] || null,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Total Cost of Ownership for inference workload
 * Combines compute, storage, and network costs
 *
 * @param config Inference configuration
 * @returns Complete calculation summary with all provider results
 */
export function calculateInferenceTCO(
  config: InferenceConfig
): CalculationSummary {
  const results = calculateMonthlyInferenceCost(config);

  // Find cheapest and most expensive available options
  const availableResults = results.filter((r) => r.available);
  const sortedByCost = [...availableResults].sort(
    (a, b) => a.costs.total - b.costs.total
  );

  return {
    input: config,
    mode: 'inference',
    results,
    cheapest: sortedByCost[0] || null,
    mostExpensive: sortedByCost[sortedByCost.length - 1] || null,
    calculatedAt: new Date().toISOString(),
  };
}
