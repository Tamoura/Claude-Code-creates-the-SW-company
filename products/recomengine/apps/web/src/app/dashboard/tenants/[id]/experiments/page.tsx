'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../../lib/api-client';

interface Experiment {
  id: string;
  name: string;
  controlStrategy: string;
  variantStrategy: string;
  trafficSplit: number;
  metric: string;
  status: string;
  createdAt: string;
}

export default function ExperimentsPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExperiments = async () => {
    try {
      const res = await api.get<{ data: Experiment[] }>(`/api/v1/tenants/${tenantId}/experiments`);
      setExperiments(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadExperiments(); }, [tenantId]);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    running: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  if (loading) return <div className="text-gray-500">Loading experiments...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Experiments</h1>
      </div>

      {experiments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No experiments yet</p>
          <p className="text-sm">Create an A/B test to compare recommendation strategies.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strategies</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Split</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {experiments.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium">{exp.name}</td>
                  <td className="px-6 py-4 text-sm">
                    {exp.controlStrategy} vs {exp.variantStrategy}
                  </td>
                  <td className="px-6 py-4 text-sm">{exp.trafficSplit}/{100 - exp.trafficSplit}</td>
                  <td className="px-6 py-4 text-sm">{exp.metric}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[exp.status] || ''}`}>
                      {exp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
