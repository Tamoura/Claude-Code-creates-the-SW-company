"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CloudSpendForm } from "@/components/costs/CloudSpendForm";
import { CloudSpendAnalysisView } from "@/components/costs/CloudSpendAnalysisView";
import { apiClient } from "@/lib/api";
import { CLOUD_PROVIDER_LABELS } from "@/types/costs";
import type {
  CloudSpendEntry,
  CloudSpendFormData,
  CloudSpendAnalysis,
  CloudProvider,
} from "@/types/costs";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Cloud spend analysis page with entry form and analysis display.
 * [US-13][FR-027]
 */
export default function CloudSpendPage() {
  const [entries, setEntries] = useState<CloudSpendEntry[]>([]);
  const [analysis, setAnalysis] = useState<CloudSpendAnalysis | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setIsLoadingList(true);
    const response =
      await apiClient.get<CloudSpendEntry[]>("/costs/cloud-spend");
    if (response.success && response.data) {
      setEntries(response.data);
    }
    setIsLoadingList(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSave = async (data: CloudSpendFormData) => {
    setIsSaving(true);
    setError(null);
    const total = Object.values(data.categories).reduce(
      (sum, val) => sum + val,
      0
    );
    const response = await apiClient.post<CloudSpendEntry>(
      "/costs/cloud-spend",
      { ...data, total }
    );
    if (response.success) {
      loadEntries();
    } else {
      setError(
        response.error?.message || "Failed to save spend data"
      );
    }
    setIsSaving(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    const response = await apiClient.post<CloudSpendAnalysis>(
      "/costs/cloud-spend/analyze",
      {}
    );
    if (response.success && response.data) {
      setAnalysis(response.data);
    } else {
      setError(
        response.error?.message || "Failed to analyze spend data"
      );
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/costs"
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          Cost Analysis
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">Cloud Spend</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Cloud Spend Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Track cloud infrastructure costs and get optimization
          recommendations.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Entry Form */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Record Cloud Spend
        </h2>
        <CloudSpendForm onSubmit={handleSave} isLoading={isSaving} />
      </div>

      {/* Spend History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Spend History
          </h2>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[44px]"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Spend"}
            </button>
          )}
        </div>

        {isLoadingList ? (
          <div className="text-sm text-muted-foreground">
            Loading spend history...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-muted-foreground">
              No spend data recorded yet. Add your first cloud spend
              entry above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {CLOUD_PROVIDER_LABELS[entry.provider as CloudProvider] ||
                        entry.provider}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(entry.periodStart).toLocaleDateString()}{" "}
                      - {new Date(entry.periodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(entry.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="rounded-xl border border-border bg-background p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Analysis Results
          </h2>
          <CloudSpendAnalysisView analysis={analysis} />
        </div>
      )}
    </div>
  );
}
