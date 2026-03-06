'use client';

import type { LikertScale } from '@/types/index';

interface LikertOptionsProps {
  questionId: string;
  scale: LikertScale;
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
}

export function LikertOptions({
  questionId,
  scale,
  selectedAnswer,
  onSelect,
}: LikertOptionsProps) {
  const values: number[] = [];
  for (let i = scale.min; i <= scale.max; i++) {
    values.push(i);
  }

  return (
    <fieldset>
      <legend className="sr-only">
        Rate your agreement from {scale.min} to {scale.max}
      </legend>
      <div className="space-y-2">
        {/* Labels at top */}
        {scale.labels.length > 0 && (
          <div className="mb-4 flex justify-between text-xs text-gray-500">
            <span>{scale.labels[0]}</span>
            {scale.labels.length > 2 && (
              <span>{scale.labels[Math.floor(scale.labels.length / 2)]}</span>
            )}
            <span>{scale.labels[scale.labels.length - 1]}</span>
          </div>
        )}

        <div className="flex justify-center gap-2">
          {values.map((value) => {
            const isSelected = selectedAnswer === String(value);
            const label =
              scale.labels[value - scale.min] ?? String(value);
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${value}: ${label}`}
                onClick={() => onSelect(String(value))}
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                  'min-h-[48px] min-w-[48px]',
                  isSelected
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300 hover:bg-brand-50',
                ].join(' ')}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
