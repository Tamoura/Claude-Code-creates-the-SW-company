import type { ReactNode } from 'react';

export interface PricingFeature {
  label: string;
  included: boolean;
}

export interface PricingCardProps {
  name: string;
  description?: string;
  priceMonthly: number;
  priceAnnual?: number;
  features: PricingFeature[];
  isCurrentPlan?: boolean;
  isFeatured?: boolean;
  onSelect?: () => void;
  selectLabel?: string;
  billingPeriod?: 'monthly' | 'annual';
  className?: string;
}

export default function PricingCard({
  name,
  description,
  priceMonthly,
  priceAnnual,
  features,
  isCurrentPlan = false,
  isFeatured = false,
  onSelect,
  selectLabel = 'Get Started',
  billingPeriod = 'monthly',
  className = '',
}: PricingCardProps) {
  const price = billingPeriod === 'annual' && priceAnnual != null
    ? Math.round(priceAnnual / 12)
    : priceMonthly;

  const isFree = priceMonthly === 0;

  return (
    <div
      className={`relative rounded-2xl border p-8 flex flex-col ${
        isFeatured
          ? 'border-blue-500 shadow-xl ring-2 ring-blue-500'
          : 'border-gray-200 dark:border-gray-700'
      } bg-white dark:bg-gray-800 ${className}`}
    >
      {isFeatured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>

      <div className="mb-6">
        {isFree ? (
          <div className="text-4xl font-bold text-gray-900 dark:text-white">Free</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">${price}</span>
            <span className="text-gray-500 dark:text-gray-400">/month</span>
          </div>
        )}
        {billingPeriod === 'annual' && priceAnnual != null && !isFree && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ${priceAnnual}/year (save {Math.round((1 - priceAnnual / (priceMonthly * 12)) * 100)}%)
          </p>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            {f.included ? (
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={f.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-default'
            : isFeatured
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : selectLabel}
      </button>
    </div>
  );
}
