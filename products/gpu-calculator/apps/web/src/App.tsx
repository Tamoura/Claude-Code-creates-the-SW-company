import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Tabs } from './components/common/Tabs';
import { TrainingForm } from './components/forms/TrainingForm';
import { ComparisonGrid } from './components/results';
import { useCalculator } from './hooks/useCalculator';
import type { TrainingConfig } from './types';

/**
 * Main App component for GPU Calculator
 * Manages tab navigation and calculation flow
 */
function App() {
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

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
              <div className="text-gray-500 text-center py-12">
                <p className="text-lg">Inference calculator coming soon</p>
                <p className="text-sm mt-2">
                  We're working on the inference cost calculator. Check back soon!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;
