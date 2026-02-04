import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { Provider } from '../../lib/api-client';

interface ProviderCardProps {
  provider: Provider;
  onAddKey: (providerId: string) => void;
}

const categoryColors: Record<string, string> = {
  Multimodal: 'bg-purple-500/10 text-purple-400',
  Speed: 'bg-blue-500/10 text-blue-400',
  'Open Source': 'bg-green-500/10 text-green-400',
  Aggregator: 'bg-yellow-500/10 text-yellow-400',
  Enterprise: 'bg-indigo-500/10 text-indigo-400',
  'Edge AI': 'bg-cyan-500/10 text-cyan-400',
  Reasoning: 'bg-pink-500/10 text-pink-400',
};

export default function ProviderCard({
  provider,
  onAddKey,
}: ProviderCardProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-6 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-lg font-bold text-accent-blue">
            {provider.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              {provider.name}
            </h3>
            <p className="text-xs text-text-muted">{provider.freeTierLimits}</p>
          </div>
        </div>
        <StatusBadge status={provider.status} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
            categoryColors[provider.category] || 'bg-gray-500/10 text-gray-400'
          }`}
        >
          {provider.category}
        </span>
        <span className="text-xs text-text-muted">
          {provider.lastVerified}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-3 flex-1">
        {provider.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {provider.models.map((model) => (
          <span
            key={model}
            className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-secondary"
          >
            {model}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onAddKey(provider.id)}
          className="flex-1 bg-accent-blue text-white text-sm py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
        >
          Add Key
        </button>
        <Link
          to={`/dashboard/providers/${provider.slug}`}
          className="text-sm py-2 px-3 rounded-lg border border-card-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
        >
          View Guide
        </Link>
      </div>
    </div>
  );
}
