import { useState } from 'react';
import { Tabs } from '../components/common/Tabs';
import { TrainingForm } from '../components/forms/TrainingForm';
import { ComparisonGrid } from '../components/results';
import { ComingSoon } from '../components/common/ComingSoon';
import { useCalculator } from '../hooks/useCalculator';
import type { TrainingConfig } from '../types';

/**
 * Calculator Page Component
 *
 * Main calculator interface with tabs for:
 * - Training cost calculations (MVP)
 * - Inference cost calculations (Coming Soon)
 *
 * Manages calculation state and displays results.
 */
export function Calculator() {
  const [activeTab, setActiveTab] = useState('training');
  const { results, isCalculating, error, calculateTraining, reset } = useCalculator();

  const tabs = [
    { id: 'training', label: 'Training' },
    { id: 'inference', label: 'Inference' },
  ];

  const handleCalculate = (config: TrainingConfig) => {
    calculateTraining(config);
  };

  const handleReset = () => {
    reset();
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-8">
          {activeTab === 'training' && (
            <>
              <TrainingForm onCalculate={handleCalculate} />

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <p className="font-semibold">Error calculating costs:</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              {isCalculating && (
                <div className="mt-6 text-center text-gray-600">
                  <p>Calculating costs...</p>
                </div>
              )}

              {results && !isCalculating && (
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Results
                    </h2>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Calculate Again
                    </button>
                  </div>
                  <ComparisonGrid results={results.results} />
                </div>
              )}
            </>
          )}

          {activeTab === 'inference' && (
            <ComingSoon
              title="Inference Calculator - Coming Soon"
              description={
                <div className="space-y-4">
                  <p>
                    We're working on the inference cost calculator.
                  </p>
                  <p className="text-sm">
                    This feature will help you estimate costs for deploying AI models
                    in production, including throughput and latency considerations.
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
