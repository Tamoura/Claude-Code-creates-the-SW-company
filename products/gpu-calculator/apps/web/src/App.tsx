import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Tabs } from './components/common/Tabs';
import { TrainingForm } from './components/forms/TrainingForm';
import type { TrainingConfig } from './types';

/**
 * Main App component for GPU Calculator
 * Manages tab navigation and calculation flow
 */
function App() {
  const [activeTab, setActiveTab] = useState('training');

  const tabs = [
    { id: 'training', label: 'Training' },
    { id: 'inference', label: 'Inference' },
    { id: 'storage', label: 'Storage' },
    { id: 'networking', label: 'Networking' },
  ];

  const handleCalculate = (config: TrainingConfig) => {
    console.log('Calculating costs for:', config);
    // Calculation logic will be implemented later
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mt-8">
            {activeTab === 'training' && <TrainingForm onCalculate={handleCalculate} />}
            {activeTab === 'inference' && (
              <div className="text-gray-500 text-center py-12">
                Inference calculator coming soon
              </div>
            )}
            {activeTab === 'storage' && (
              <div className="text-gray-500 text-center py-12">
                Storage calculator coming soon
              </div>
            )}
            {activeTab === 'networking' && (
              <div className="text-gray-500 text-center py-12">
                Networking calculator coming soon
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
