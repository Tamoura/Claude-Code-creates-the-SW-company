"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TcoResults } from "@/components/costs/TcoResults";
import { apiClient } from "@/lib/api";
import type { TcoComparison } from "@/types/costs";

/**
 * TCO comparison detail page. Loads a specific comparison by ID.
 * [US-12][FR-023]
 */
export default function TcoDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [comparison, setComparison] = useState<TcoComparison | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setIsLoading(true);
      const response = await apiClient.get<TcoComparison>(
        `/costs/tco/${id}`
      );
      if (response.success && response.data) {
        setComparison(response.data);
      } else {
        setError(
          response.error?.message || "Failed to load comparison"
        );
      }
      setIsLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/costs"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          Cost Analysis
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/costs/tco"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          TCO Calculator
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">
          {comparison?.title || "Detail"}
        </span>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          Loading comparison...
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {comparison && (
        <div className="rounded-xl border border-border bg-background p-6">
          <TcoResults comparison={comparison} />
        </div>
      )}

      <div>
        <Link
          href="/costs/tco"
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to TCO Calculator
        </Link>
      </div>
    </div>
  );
}
