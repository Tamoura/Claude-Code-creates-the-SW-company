"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CHALLENGE_OPTIONS } from "@/lib/validations/onboarding";

interface Step3ChallengesProps {
  onSubmit: (data: {
    challenges: string[];
    customChallenges: string[];
  }) => void;
  onBack: () => void;
  initialData?: {
    challenges?: string[];
    customChallenges?: string[];
  };
}

export function Step3Challenges({
  onSubmit,
  onBack,
  initialData,
}: Step3ChallengesProps) {
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>(
    initialData?.challenges ?? []
  );
  const [customChallenges, setCustomChallenges] = useState<string[]>(
    initialData?.customChallenges ?? []
  );
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggleChallenge = (challenge: string) => {
    setSelectedChallenges((prev) =>
      prev.includes(challenge)
        ? prev.filter((c) => c !== challenge)
        : [...prev, challenge]
    );
    setError(null);
  };

  const addCustomChallenge = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customChallenges.includes(trimmed)) {
      setCustomChallenges((prev) => [...prev, trimmed]);
      setCustomInput("");
      setError(null);
    }
  };

  const removeCustomChallenge = (challenge: string) => {
    setCustomChallenges((prev) => prev.filter((c) => c !== challenge));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      selectedChallenges.length + customChallenges.length === 0
    ) {
      setError("Select at least one challenge");
      return;
    }
    onSubmit({
      challenges: selectedChallenges,
      customChallenges,
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Challenges
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        What are your biggest technical challenges right now?
      </p>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Challenge chips */}
        <div className="flex flex-wrap gap-2">
          {CHALLENGE_OPTIONS.map((challenge) => {
            const isSelected =
              selectedChallenges.includes(challenge);
            return (
              <button
                key={challenge}
                type="button"
                role="button"
                aria-pressed={isSelected}
                onClick={() => toggleChallenge(challenge)}
                className={cn(
                  "px-3 py-2 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 min-h-[40px]",
                  isSelected
                    ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
              >
                {challenge}
              </button>
            );
          })}
        </div>

        {/* Custom challenges */}
        {customChallenges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customChallenges.map((challenge) => (
              <span
                key={challenge}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
              >
                {challenge}
                <button
                  type="button"
                  onClick={() => removeCustomChallenge(challenge)}
                  aria-label={`Remove ${challenge}`}
                  className="ml-0.5 rounded-full hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-0.5"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Custom challenge input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomChallenge();
              }
            }}
            placeholder="Add a custom challenge"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px]"
          />
          <button
            type="button"
            onClick={addCustomChallenge}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Add
          </button>
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}
