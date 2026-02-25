"use client";

interface ProfileStrengthMeterProps {
  score: number;
  completeness: number;
  suggestions: string[];
}

function getColorClass(score: number): string {
  if (score < 40) return "text-red-500";
  if (score <= 70) return "text-yellow-500";
  return "text-green-500";
}

function getProgressColor(score: number): string {
  if (score < 40) return "bg-red-500";
  if (score <= 70) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Circular-style profile strength indicator.
 * Color coded: red (<40), yellow (40-70), green (>70).
 * Shows improvement suggestions below the meter.
 */
export function ProfileStrengthMeter({ score, completeness: _completeness, suggestions }: ProfileStrengthMeterProps) {
  const colorClass = getColorClass(score);
  const progressColor = getProgressColor(score);

  return (
    <div className={`space-y-3 ${colorClass}`} aria-label="Profile strength">
      {/* Score display with progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-16 w-16 rounded-full border-4 border-current">
          <span className="text-xl font-bold">{score}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
            Profile Strength
          </p>
          <div
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile strength"
            className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
          >
            <div
              className={`h-full ${progressColor} transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul className="space-y-1">
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400"
            >
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
