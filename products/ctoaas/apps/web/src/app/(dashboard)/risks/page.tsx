"use client";

import { useRiskSummary, useRiskActions } from "@/hooks/useRisks";
import { RiskCard } from "@/components/risks/RiskCard";

/**
 * Risk Dashboard overview page.
 * Displays 4 category cards and a generate risks button.
 * [US-10][FR-020]
 */
export default function RisksPage() {
  const { data, isLoading, error, refetch } = useRiskSummary();
  const {
    generateRisks,
    isGenerating,
    error: generateError,
  } = useRiskActions();

  const handleGenerate = async () => {
    await generateRisks();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Risk Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage organizational risks across four key
            categories.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
          aria-label="Generate risks from company profile"
        >
          {isGenerating ? "Generating..." : "Generate Risks"}
        </button>
      </div>

      {generateError && (
        <p className="text-red-600 text-sm mb-4" role="alert">
          {generateError}
        </p>
      )}

      {/* Category Cards */}
      {data && data.categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.categories.map((summary) => (
            <RiskCard key={summary.category} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-xl border border-border">
          <p className="text-muted-foreground mb-4">
            No risk data available yet. Generate risks from your company
            profile to get started.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
          >
            {isGenerating ? "Generating..." : "Generate Risks"}
          </button>
        </div>
      )}

      {/* Last generated timestamp */}
      {data?.lastGeneratedAt && (
        <p className="text-xs text-muted-foreground mt-6">
          Last generated:{" "}
          {new Date(data.lastGeneratedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
