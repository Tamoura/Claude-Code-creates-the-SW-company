import { useState } from 'react';
import type { TrainingConfig } from '../../types';

interface TrainingFormProps {
  onCalculate: (config: TrainingConfig) => void;
}

/**
 * Training configuration form
 * Collects model size, dataset info, GPU selection for training cost calculation
 */
export function TrainingForm({ onCalculate }: TrainingFormProps) {
  const [config, setConfig] = useState<TrainingConfig>({
    modelSizeB: 7,
    datasetSizeGb: 100,
    epochs: 3,
    tokensPerSample: 512,
    sampleCount: 1000000,
    gpuType: 'A100-80GB',
    gpuCount: 8,
    nodeCount: 1,
    includeStorage: true,
    storageDurationMonths: 1,
    checkpointFrequency: 'epoch',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(config);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Model Configuration</h3>

          <div>
            <label htmlFor="modelSizeB" className="block text-sm font-medium text-gray-700">
              Model Size (Billions of Parameters)
            </label>
            <input
              type="number"
              id="modelSizeB"
              value={config.modelSizeB}
              onChange={(e) => setConfig({ ...config, modelSizeB: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              min="0.1"
              step="0.1"
            />
          </div>

          <div>
            <label htmlFor="datasetSizeGb" className="block text-sm font-medium text-gray-700">
              Dataset Size (GB)
            </label>
            <input
              type="number"
              id="datasetSizeGb"
              value={config.datasetSizeGb}
              onChange={(e) => setConfig({ ...config, datasetSizeGb: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              min="0.1"
              step="0.1"
            />
          </div>

          <div>
            <label htmlFor="epochs" className="block text-sm font-medium text-gray-700">
              Training Epochs
            </label>
            <input
              type="number"
              id="epochs"
              value={config.epochs}
              onChange={(e) => setConfig({ ...config, epochs: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              min="1"
              step="1"
            />
          </div>
        </div>

        {/* GPU Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">GPU Configuration</h3>

          <div>
            <label htmlFor="gpuType" className="block text-sm font-medium text-gray-700">
              GPU Type
            </label>
            <select
              id="gpuType"
              value={config.gpuType}
              onChange={(e) => setConfig({ ...config, gpuType: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="H100-80GB">H100 80GB</option>
              <option value="A100-80GB">A100 80GB</option>
              <option value="A100-40GB">A100 40GB</option>
              <option value="A10">A10</option>
            </select>
          </div>

          <div>
            <label htmlFor="gpuCount" className="block text-sm font-medium text-gray-700">
              Number of GPUs
            </label>
            <input
              type="number"
              id="gpuCount"
              value={config.gpuCount}
              onChange={(e) => setConfig({ ...config, gpuCount: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              min="1"
              step="1"
            />
          </div>

          <div>
            <label htmlFor="nodeCount" className="block text-sm font-medium text-gray-700">
              Number of Nodes
            </label>
            <input
              type="number"
              id="nodeCount"
              value={config.nodeCount}
              onChange={(e) => setConfig({ ...config, nodeCount: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              min="1"
              step="1"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md"
        >
          Calculate Costs
        </button>
      </div>
    </form>
  );
}
