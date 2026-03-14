"use client";

import type { CloudSpendAnalysis } from "@/types/costs";
import { SPEND_CATEGORY_LABELS, SPEND_CATEGORY_COLORS } from "@/types/costs";

interface CloudSpendAnalysisViewProps {
  analysis: CloudSpendAnalysis;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

/**
 * Displays cloud spend analysis: breakdown bars, benchmarks, recommendations.
 * [US-13][FR-027]
 */
export function CloudSpendAnalysisView({
  analysis,
}: CloudSpendAnalysisViewProps) {
  const { totalSpend, breakdown, benchmarks, recommendations } = analysis;

  return (
    <div className="space-y-8">
      {/* Total Spend */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total Spend</p>
        <p className="text-3xl font-bold text-foreground">
          {formatCurrency(totalSpend)}
        </p>
      </div>

      {/* Spend Breakdown */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Spend Breakdown
        </h3>

        {/* Stacked bar */}
        <div
          className="w-full h-8 rounded-full overflow-hidden flex"
          role="img"
          aria-label="Spend breakdown by category"
        >
          {breakdown.map((item) => (
            <div
              key={item.category}
              data-testid={`spend-bar-${item.category}`}
              className={`${SPEND_CATEGORY_COLORS[item.category]} h-full transition-all`}
              style={{ width: `${item.percentage}%` }}
              title={`${SPEND_CATEGORY_LABELS[item.category]}: ${formatCurrency(item.amount)} (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4">
          {breakdown.map((item) => (
            <div key={item.category} className="flex items-center gap-2 text-sm">
              <div
                className={`w-3 h-3 rounded-sm ${SPEND_CATEGORY_COLORS[item.category]}`}
                aria-hidden="true"
              />
              <span className="text-foreground">
                {SPEND_CATEGORY_LABELS[item.category]}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(item.amount)} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Benchmarks */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Industry Average Comparison
        </h3>
        <div className="space-y-3">
          {benchmarks.map((benchmark) => (
            <div
              key={benchmark.category}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">
                  {SPEND_CATEGORY_LABELS[benchmark.category]}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    benchmark.percentDifference > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {benchmark.percentDifference > 0 ? "+" : ""}
                  {benchmark.percentDifference}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  Your spend: {formatCurrency(benchmark.yourSpend)}
                </div>
                <div>
                  Industry average:{" "}
                  {formatCurrency(benchmark.industryAverage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Recommendations
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.title}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    PRIORITY_STYLES[rec.priority] || ""
                  }`}
                >
                  {rec.priority}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-green-600">
                Estimated savings: {formatCurrency(rec.estimatedSavings)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
