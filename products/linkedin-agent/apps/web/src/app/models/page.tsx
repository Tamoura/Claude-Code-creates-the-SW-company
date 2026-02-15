'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface ModelDefaults {
  writing: string;
  analysis: string;
  image: string;
  translation: string;
}

interface AvailableModel {
  id: string;
  name: string;
}

interface ModelsResponse {
  defaults: ModelDefaults;
  available?: AvailableModel[];
  availableCount: number;
}

interface ModelUsageEntry {
  model: string;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  avgDurationMs: number;
}

interface TaskUsageEntry {
  taskType: string;
  calls: number;
  costUsd: number;
  avgDurationMs: number;
}

interface UsageResponse {
  period: { days: number; since: string };
  totals: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
    totalDurationMs: number;
  };
  byModel: ModelUsageEntry[];
  byTaskType: TaskUsageEntry[];
}

const taskTypeLabels: Record<string, string> = {
  writing: 'Content Writing',
  analysis: 'Trend Analysis',
  translation: 'Translation',
  image: 'Image Generation',
  carousel: 'Carousel Generation',
};

export default function ModelsPage() {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [modelsResult, usageResult] = await Promise.allSettled([
          apiFetch<ModelsResponse>('/api/models'),
          apiFetch<UsageResponse>('/api/models/usage'),
        ]);

        if (modelsResult.status === 'fulfilled') setModels(modelsResult.value);
        if (usageResult.status === 'fulfilled') setUsage(usageResult.value);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalCost = usage?.totals?.totalCostUsd || 0;
  const totalTokens = (usage?.totals?.promptTokens || 0) + (usage?.totals?.completionTokens || 0);
  const totalCalls = usage?.totals?.calls || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">AI Models</h1>
        <p className="text-sm text-gray-400 mt-1" dir="rtl">
          نماذج الذكاء الاصطناعي - إحصائيات الاستخدام
        </p>
      </div>

      {/* Usage summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Tokens Used</p>
          <p className="text-2xl font-bold text-gray-100">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-gray-800 rounded animate-pulse" />
            ) : (
              totalTokens.toLocaleString()
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-gray-100">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-gray-800 rounded animate-pulse" />
            ) : (
              `$${totalCost.toFixed(4)}`
            )}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-400 mb-1">Total API Calls</p>
          <p className="text-2xl font-bold text-gray-100">
            {loading ? (
              <span className="inline-block w-20 h-7 bg-gray-800 rounded animate-pulse" />
            ) : (
              totalCalls.toLocaleString()
            )}
          </p>
        </div>
      </div>

      {/* Model Defaults */}
      {models && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Model Assignments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(models.defaults).map(([task, modelId]) => (
              <div key={task} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                <span className="text-sm font-medium text-gray-300 capitalize">{task}</span>
                <span className="text-xs text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded-full font-mono">
                  {modelId}
                </span>
              </div>
            ))}
          </div>
          {models.availableCount > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              {models.availableCount} models available on OpenRouter
            </p>
          )}
        </div>
      )}

      {/* Usage by Model */}
      {usage && usage.byModel.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Usage by Model</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-800">
                  <th className="pb-3 font-medium text-gray-400">Model</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Calls</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Tokens</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Cost</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {usage.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-gray-800/50">
                    <td className="py-3 text-gray-200 font-mono text-xs">{m.model}</td>
                    <td className="py-3 text-gray-300 text-right">{m.calls.toLocaleString()}</td>
                    <td className="py-3 text-gray-300 text-right">
                      {(m.promptTokens + m.completionTokens).toLocaleString()}
                    </td>
                    <td className="py-3 text-gray-300 text-right">${m.costUsd.toFixed(4)}</td>
                    <td className="py-3 text-gray-300 text-right">{m.avgDurationMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Usage by Task Type */}
      {usage && usage.byTaskType.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Usage by Task Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {usage.byTaskType.map((t) => (
              <div key={t.taskType} className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  {taskTypeLabels[t.taskType] || t.taskType}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Calls:</span>
                    <span className="text-gray-300 ml-1">{t.calls}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cost:</span>
                    <span className="text-gray-300 ml-1">${t.costUsd.toFixed(4)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Avg Latency:</span>
                    <span className="text-gray-300 ml-1">{t.avgDurationMs}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !usage?.byModel.length && !models && (
        <div className="card text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No models available</h3>
          <p className="text-sm text-gray-500">
            Connect to the API to see available OpenRouter models and usage statistics.
          </p>
        </div>
      )}
    </div>
  );
}
