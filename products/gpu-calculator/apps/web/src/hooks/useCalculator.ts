import { useState, useCallback } from 'react';
import type {
  TrainingConfig,
  InferenceConfig,
  CalculationSummary,
} from '../types';
import { calculateTrainingTCO, calculateInferenceTCO } from '../calculators';

type CalculatorMode = 'training' | 'inference';

interface UseCalculatorReturn {
  results: CalculationSummary | null;
  isCalculating: boolean;
  error: string | null;
  calculateTraining: (config: TrainingConfig) => void;
  calculateInference: (config: InferenceConfig) => void;
  reset: () => void;
}

/**
 * useCalculator hook - Manages calculation state and execution
 *
 * Features:
 * - Handles both training and inference calculations
 * - Loading and error states
 * - Results caching
 *
 * Usage:
 * ```tsx
 * const { results, isCalculating, calculateTraining } = useCalculator();
 *
 * const handleSubmit = (config: TrainingConfig) => {
 *   calculateTraining(config);
 * };
 *
 * if (results) {
 *   return <ComparisonGrid results={results.results} />;
 * }
 * ```
 */
export function useCalculator(): UseCalculatorReturn {
  const [results, setResults] = useState<CalculationSummary | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTraining = useCallback((config: TrainingConfig) => {
    setIsCalculating(true);
    setError(null);

    try {
      // In a real app, this might be async if calling an API
      // For now, calculations are synchronous
      const summary = calculateTrainingTCO(config);
      setResults(summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during calculation'
      );
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const calculateInference = useCallback((config: InferenceConfig) => {
    setIsCalculating(true);
    setError(null);

    try {
      const summary = calculateInferenceTCO(config);
      setResults(summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during calculation'
      );
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
    setIsCalculating(false);
  }, []);

  return {
    results,
    isCalculating,
    error,
    calculateTraining,
    calculateInference,
    reset,
  };
}
