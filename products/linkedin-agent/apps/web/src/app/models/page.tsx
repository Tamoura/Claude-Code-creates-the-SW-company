'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  pricing: {
    promptPerToken: number;
    completionPerToken: number;
  };
}

interface ModelUsage {
  modelId: string;
  totalTokens: number;
  totalCost: number;
  totalCalls: number;
  averageLatency: number;
}

interface ModelsData {
  models: ModelInfo[];
  usage: ModelUsage[];
}

export default function ModelsPage() {
  const [data, setData] = useState<ModelsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const result = await apiFetch<ModelsData>('/api/models');
        setData(result);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }

    loadModels();
  }, []);

  const models = data?.models || [];
  const usage = data?.usage || [];

  function getUsageForModel(modelId: string): ModelUsage | undefined {
    return usage.find((u) => u.modelId === modelId);
  }

  const totalCost = usage.reduce((sum, u) => sum + u.totalCost, 0);
  const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0);
  const totalCalls = usage.reduce((sum, u) => sum + u.totalCalls, 0);

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

      {/* Models list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Available Models</h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-32 h-5 bg-gray-800 rounded" />
                  <div className="flex-1 h-4 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : models.length > 0 ? (
          <div className="space-y-4">
            {models.map((model) => {
              const modelUsage = getUsageForModel(model.id);

              return (
                <div key={model.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-100">{model.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{model.provider} | {model.id}</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                      {(model.contextLength / 1000).toFixed(0)}K context
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-4">{model.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Prompt Price</p>
                      <p className="text-gray-300">${model.pricing.promptPerToken.toFixed(6)}/tok</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completion Price</p>
                      <p className="text-gray-300">${model.pricing.completionPerToken.toFixed(6)}/tok</p>
                    </div>
                    {modelUsage && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Total Calls</p>
                          <p className="text-gray-300">{modelUsage.totalCalls.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Latency</p>
                          <p className="text-gray-300">{modelUsage.averageLatency.toFixed(0)}ms</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Usage bar */}
                  {modelUsage && totalTokens > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Usage share</span>
                        <span>{((modelUsage.totalTokens / totalTokens) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 rounded-full h-1.5 transition-all duration-500"
                          style={{ width: `${(modelUsage.totalTokens / totalTokens) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
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

      {/* Model comparison (when usage data exists) */}
      {usage.length > 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Performance Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-800">
                  <th className="pb-3 font-medium text-gray-400">Model</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Tokens</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Calls</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Cost</th>
                  <th className="pb-3 font-medium text-gray-400 text-right">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => {
                  const model = models.find((m) => m.id === u.modelId);
                  return (
                    <tr key={u.modelId} className="border-b border-gray-800/50">
                      <td className="py-3 text-gray-200">{model?.name || u.modelId}</td>
                      <td className="py-3 text-gray-300 text-right">{u.totalTokens.toLocaleString()}</td>
                      <td className="py-3 text-gray-300 text-right">{u.totalCalls.toLocaleString()}</td>
                      <td className="py-3 text-gray-300 text-right">${u.totalCost.toFixed(4)}</td>
                      <td className="py-3 text-gray-300 text-right">{u.averageLatency.toFixed(0)}ms</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
