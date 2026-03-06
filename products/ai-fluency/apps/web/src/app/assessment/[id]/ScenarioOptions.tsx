'use client';

import type { ScenarioOption } from '@/types/index';

interface ScenarioOptionsProps {
  questionId: string;
  options: ScenarioOption[];
  selectedAnswer: string | null;
  onSelect: (answer: string) => void;
}

export function ScenarioOptions({
  questionId,
  options,
  selectedAnswer,
  onSelect,
}: ScenarioOptionsProps) {
  return (
    <fieldset>
      <legend className="sr-only">Select your answer</legend>
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.key;
          return (
            <label
              key={option.key}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`question-${questionId}`}
                value={option.key}
                checked={isSelected}
                onChange={() => onSelect(option.key)}
                className="mt-0.5 h-4 w-4 accent-brand-600"
              />
              <span className="text-sm text-gray-700">{option.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
