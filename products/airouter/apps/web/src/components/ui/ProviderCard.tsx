import { useState } from 'react';
import StatusBadge from './StatusBadge';
import type { Provider } from '../../lib/api-client';

interface ProviderCardProps {
  provider: Provider;
  onAddKey: (providerId: string) => void;
}

export default function ProviderCard({
  provider,
  onAddKey,
}: ProviderCardProps) {
  const [showGuide, setShowGuide] = useState(false);

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
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-sm py-2 px-3 rounded-lg border border-card-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
          aria-label={`How to get a ${provider.name} key`}
        >
          ?
        </button>
      </div>

      {showGuide && (
        <div className="mt-3 p-3 rounded-lg bg-code-bg text-sm text-text-secondary">
          <p className="font-medium text-text-primary mb-2">
            How to get a key:
          </p>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed">
            {provider.keyGuide}
          </pre>
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-accent-blue hover:underline text-xs"
          >
            Visit {provider.name} &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
