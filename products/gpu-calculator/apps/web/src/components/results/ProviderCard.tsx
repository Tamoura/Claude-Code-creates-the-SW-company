import type { ProviderResult } from '../../types';

interface ProviderCardProps {
  result: ProviderResult;
  expanded?: boolean;
  onToggle?: () => void;
}

/**
 * ProviderCard - Displays cost breakdown for a single provider
 *
 * Props:
 * - result: Provider calculation result
 * - expanded: Whether to show detailed breakdown
 * - onToggle: Callback when card is clicked to expand/collapse
 *
 * Accessibility:
 * - Semantic HTML with proper headings
 * - ARIA labels for cost values
 * - Keyboard accessible expand/collapse
 */
export function ProviderCard({
  result,
  expanded = false,
  onToggle,
}: ProviderCardProps) {
  const { providerName, available, costs, configuration, unavailableReason } =
    result;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!available) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {providerName}
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p className="font-medium text-red-600">Not Available</p>
          {unavailableReason && (
            <p className="text-gray-500">{unavailableReason}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow cursor-pointer"
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      {/* Provider name and total cost */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{providerName}</h3>
        <div className="text-right">
          <p
            className="text-2xl font-bold text-blue-600"
            aria-label={`Total cost: ${formatCurrency(costs.total)}`}
          >
            {formatCurrency(costs.total)}
          </p>
          <p className="text-xs text-gray-500">Total Cost</p>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Compute:</span>
          <span className="font-medium">{formatCurrency(costs.compute)}</span>
        </div>
        {costs.storage > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Storage:</span>
            <span className="font-medium">{formatCurrency(costs.storage)}</span>
          </div>
        )}
        {costs.egress > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Network:</span>
            <span className="font-medium">{formatCurrency(costs.egress)}</span>
          </div>
        )}
      </div>

      {/* Configuration summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>{configuration.gpuType}</span>
          <span>{configuration.gpuCount} GPU{configuration.gpuCount > 1 ? 's' : ''}</span>
        </div>
        {configuration.instanceType && (
          <div className="mt-1 text-gray-500">{configuration.instanceType}</div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600">Hourly Rate:</span>
            </div>
            <div className="text-right font-medium">
              {formatCurrency(configuration.hourlyRate)}/hr
            </div>

            {configuration.estimatedHours > 0 && (
              <>
                <div>
                  <span className="text-gray-600">Hours:</span>
                </div>
                <div className="text-right font-medium">
                  {configuration.estimatedHours.toFixed(1)}
                </div>
              </>
            )}

            {configuration.storageGb > 0 && (
              <>
                <div>
                  <span className="text-gray-600">Storage:</span>
                </div>
                <div className="text-right font-medium">
                  {configuration.storageGb.toFixed(0)} GB
                </div>
              </>
            )}

            {configuration.egressGb > 0 && (
              <>
                <div>
                  <span className="text-gray-600">Egress:</span>
                </div>
                <div className="text-right font-medium">
                  {configuration.egressGb.toFixed(0)} GB
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
