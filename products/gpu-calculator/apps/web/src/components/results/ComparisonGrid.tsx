import { useState } from 'react';
import type { ProviderResult } from '../../types';
import { ProviderCard } from './ProviderCard';

interface ComparisonGridProps {
  results: ProviderResult[];
  sortBy?: 'cost' | 'name';
  hideUnavailable?: boolean;
}

/**
 * ComparisonGrid - Displays all provider results in a grid layout
 *
 * Props:
 * - results: Array of provider calculation results
 * - sortBy: Sort providers by 'cost' or 'name' (default: cost)
 * - hideUnavailable: Whether to hide unavailable providers (default: false)
 *
 * Features:
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * - Expandable provider cards for detailed breakdown
 * - Highlights cheapest option
 *
 * Accessibility:
 * - Semantic HTML structure
 * - ARIA labels for important information
 * - Keyboard navigation support
 */
export function ComparisonGrid({
  results,
  sortBy = 'cost',
  hideUnavailable = false,
}: ComparisonGridProps) {
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Filter and sort results
  let displayResults = [...results];

  if (hideUnavailable) {
    displayResults = displayResults.filter((r) => r.available);
  }

  if (sortBy === 'cost') {
    displayResults.sort((a, b) => {
      if (!a.available && !b.available) return 0;
      if (!a.available) return 1;
      if (!b.available) return -1;
      return a.costs.total - b.costs.total;
    });
  } else {
    displayResults.sort((a, b) => a.providerName.localeCompare(b.providerName));
  }

  // Find cheapest available provider
  const cheapest = displayResults.find((r) => r.available);

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No results yet</p>
        <p className="text-sm mt-2">
          Configure your workload and click Calculate to see cost estimates
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">
          Provider Comparison
        </h2>
        {cheapest && (
          <p className="text-sm text-gray-600">
            Best price:{' '}
            <span className="font-semibold text-green-600">
              {cheapest.providerName}
            </span>
          </p>
        )}
      </div>

      {/* Grid of provider cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        role="list"
        aria-label="Provider cost comparison"
      >
        {displayResults.map((result) => (
          <div
            key={result.providerId}
            role="listitem"
            className={
              result.available && result.providerId === cheapest?.providerId
                ? 'ring-2 ring-green-500 rounded-lg'
                : ''
            }
          >
            <ProviderCard
              result={result}
              expanded={expandedProvider === result.providerId}
              onToggle={() =>
                setExpandedProvider(
                  expandedProvider === result.providerId
                    ? null
                    : result.providerId
                )
              }
            />
          </div>
        ))}
      </div>

      {/* Footer info */}
      <div className="text-xs text-gray-500 text-center mt-6">
        <p>
          Showing {displayResults.length} provider
          {displayResults.length !== 1 ? 's' : ''}
          {hideUnavailable && results.length !== displayResults.length && (
            <span>
              {' '}
              ({results.length - displayResults.length} hidden)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
