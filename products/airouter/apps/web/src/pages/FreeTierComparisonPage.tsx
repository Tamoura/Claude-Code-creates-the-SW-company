import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import type { Provider } from '../lib/api-client';

type SortField =
  | 'name'
  | 'category'
  | 'rpm'
  | 'daily'
  | 'monthly'
  | 'models'
  | 'verified';
type SortOrder = 'asc' | 'desc';

export default function FreeTierComparisonPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    async function fetchProviders() {
      try {
        const data = await apiClient.getProviderComparison();
        setProviders(data);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProviders = [...providers].sort((a, b) => {
    let compareValue = 0;

    switch (sortField) {
      case 'name':
        compareValue = a.name.localeCompare(b.name);
        break;
      case 'category':
        compareValue = a.category.localeCompare(b.category);
        break;
      case 'rpm':
        compareValue =
          (a.freeTier.requestsPerMinute ?? 0) -
          (b.freeTier.requestsPerMinute ?? 0);
        break;
      case 'daily':
        compareValue =
          (a.freeTier.requestsPerDay ?? a.freeTier.tokensPerDay ?? 0) -
          (b.freeTier.requestsPerDay ?? b.freeTier.tokensPerDay ?? 0);
        break;
      case 'monthly':
        compareValue =
          (a.freeTier.requestsPerMonth ?? a.freeTier.tokensPerMonth ?? 0) -
          (b.freeTier.requestsPerMonth ?? b.freeTier.tokensPerMonth ?? 0);
        break;
      case 'models':
        compareValue = a.models.length - b.models.length;
        break;
      case 'verified':
        compareValue = a.lastVerified.localeCompare(b.lastVerified);
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      Multimodal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      Speed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'Open Source': 'bg-green-500/10 text-green-400 border-green-500/20',
      Aggregator: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      Enterprise: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'Edge AI': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      Reasoning: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return colors[category] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const getTierGenerosity = (provider: Provider): string => {
    // SambaNova: unlimited (green)
    if (provider.freeTier.unlimited) return 'text-accent-green';
    // Generous: >1M tokens or >500 req/day (green)
    if (
      (provider.freeTier.tokensPerDay ?? 0) > 1000000 ||
      (provider.freeTier.tokensPerMonth ?? 0) > 1000000 ||
      (provider.freeTier.requestsPerDay ?? 0) > 500
    ) {
      return 'text-accent-green';
    }
    // Moderate: everything else (amber)
    return 'text-yellow-500';
  };

  const formatDailyLimits = (provider: Provider): string => {
    if (provider.freeTier.unlimited) return 'Unlimited';
    if (provider.freeTier.requestsPerDay)
      return `${provider.freeTier.requestsPerDay} req/day`;
    if (provider.freeTier.tokensPerDay)
      return `${(provider.freeTier.tokensPerDay / 1000000).toFixed(1)}M tokens/day`;
    if (provider.freeTier.neuronsPerDay)
      return `${provider.freeTier.neuronsPerDay} neurons/day`;
    return '—';
  };

  const formatMonthlyLimits = (provider: Provider): string => {
    if (provider.freeTier.unlimited) return 'Unlimited';
    if (provider.freeTier.requestsPerMonth)
      return `${provider.freeTier.requestsPerMonth} req/mo`;
    if (provider.freeTier.tokensPerMonth)
      return `${(provider.freeTier.tokensPerMonth / 1000000).toFixed(1)}M tokens/mo`;
    return '—';
  };

  const formatRPM = (provider: Provider): string => {
    if (provider.freeTier.requestsPerSecond)
      return `${provider.freeTier.requestsPerSecond} RPS`;
    if (provider.freeTier.requestsPerMinute)
      return `${provider.freeTier.requestsPerMinute} RPM`;
    return '—';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-text-muted ml-1">↕</span>;
    }
    return (
      <span className="text-accent-blue ml-1">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Free Tier Comparison</h1>
        <p className="text-text-secondary mt-1">
          Compare free tier limits across all 10 AI providers
        </p>
      </div>

      <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-card-border bg-bg-primary">
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Provider
                  <SortIcon field="name" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('category')}
                >
                  Category
                  <SortIcon field="category" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('rpm')}
                >
                  RPM
                  <SortIcon field="rpm" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('daily')}
                >
                  Daily Limits
                  <SortIcon field="daily" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('monthly')}
                >
                  Monthly Limits
                  <SortIcon field="monthly" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('models')}
                >
                  Models
                  <SortIcon field="models" />
                </th>
                <th
                  className="text-left px-4 py-3 text-sm font-semibold text-text-primary cursor-pointer hover:bg-card-bg transition-colors"
                  onClick={() => handleSort('verified')}
                >
                  Last Verified
                  <SortIcon field="verified" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProviders.map((provider) => (
                <tr
                  key={provider.id}
                  className="border-b border-card-border hover:bg-bg-primary transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/dashboard/providers/${provider.slug}`}
                      className="text-accent-blue hover:underline font-medium"
                    >
                      {provider.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getCategoryColor(provider.category)}`}
                    >
                      {provider.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm">
                    {formatRPM(provider)}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${getTierGenerosity(provider)}`}>
                    {formatDailyLimits(provider)}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${getTierGenerosity(provider)}`}>
                    {formatMonthlyLimits(provider)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm">
                    {provider.models.length}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-sm">
                    {provider.lastVerified}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
