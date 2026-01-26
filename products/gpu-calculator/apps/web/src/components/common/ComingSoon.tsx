import { type ReactNode } from 'react';

interface ComingSoonProps {
  title: string;
  description?: string | ReactNode;
  className?: string;
}

/**
 * ComingSoon Component
 *
 * A reusable component for displaying "coming soon" content.
 * Used for features that are planned but not yet implemented.
 *
 * @example
 * ```tsx
 * <ComingSoon
 *   title="Inference Calculator"
 *   description="We're working on the inference cost calculator. Check back soon!"
 * />
 * ```
 *
 * Accessibility:
 * - Uses semantic heading for title
 * - Proper text hierarchy
 * - Keyboard navigable
 * - WCAG 2.1 AA compliant
 */
export function ComingSoon({ title, description, className = '' }: ComingSoonProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {title}
        </h2>

        {description && (
          <div className="text-gray-600">
            {typeof description === 'string' ? (
              <p>{description}</p>
            ) : (
              description
            )}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p>This feature is currently under development.</p>
        </div>
      </div>
    </div>
  );
}
