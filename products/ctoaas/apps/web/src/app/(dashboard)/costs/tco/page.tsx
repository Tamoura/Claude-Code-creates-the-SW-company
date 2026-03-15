"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TcoForm } from "@/components/costs/TcoForm";
import { TcoResults } from "@/components/costs/TcoResults";
import { apiClient } from "@/lib/api";
import type { TcoComparison, TcoFormData } from "@/types/costs";

/**
 * TCO comparison page with form and results display.
 * [US-12][FR-023]
 */
export default function TcoPage() {
  const [comparisons, setComparisons] = useState<TcoComparison[]>([]);
  const [activeComparison, setActiveComparison] =
    useState<TcoComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparisons = useCallback(async () => {
    setIsLoadingList(true);
    const response = await apiClient.get<TcoComparison[]>("/costs/tco");
    if (response.success && response.data) {
      setComparisons(response.data);
    }
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    loadComparisons();
  }, [loadComparisons]);

  const handleSubmit = async (data: TcoFormData) => {
    setIsLoading(true);
    setError(null);
    const response = await apiClient.post<TcoComparison>(
      "/costs/tco",
      data
    );
    if (response.success && response.data) {
      setActiveComparison(response.data);
      loadComparisons();
    } else {
      setError(
        response.error?.message || "Failed to calculate TCO"
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/costs"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          Cost Analysis
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">TCO Calculator</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          TCO Calculator
        </h1>
        <p className="text-muted-foreground mt-1">
          Compare total cost of ownership across technology options over
          a 3-year horizon.
        </p>
      </div>

      {/* New Comparison Form */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          New Comparison
        </h2>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <TcoForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Active Comparison Results */}
      {activeComparison && (
        <div className="rounded-xl border border-border bg-background p-6">
          <TcoResults comparison={activeComparison} />
        </div>
      )}

      {/* Past Comparisons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Past Comparisons
        </h2>
        {isLoadingList ? (
          <div className="text-sm text-muted-foreground">
            Loading comparisons...
          </div>
        ) : comparisons.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-muted-foreground">
              No comparisons yet. Create your first TCO comparison
              above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.id}
                href={`/costs/tco/${comparison.id}`}
                className="block rounded-lg border border-border bg-background p-4 hover:shadow-sm hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {comparison.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {comparison.options.length} options compared
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comparison.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
