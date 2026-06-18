"use client";

import type { TcoComparison } from "@/types/costs";

interface TcoResultsProps {
  comparison: TcoComparison;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Displays TCO comparison results: summary table, bar chart, and AI analysis.
 * [US-12][FR-023]
 */
export function TcoResults({ comparison }: TcoResultsProps) {
  const { title, options, winnerIndex, aiAnalysis } = comparison;
  const maxTotal = Math.max(...options.map((o) => o.totalCost));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>

      {/* Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="py-3 px-4 text-left font-semibold text-foreground"
              >
                Option
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right font-semibold text-foreground"
              >
                Year 1
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right font-semibold text-foreground"
              >
                Year 2
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right font-semibold text-foreground"
              >
                Year 3
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-right font-semibold text-foreground"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option, index) => (
              <tr
                key={option.name}
                data-testid={`tco-option-row-${index}`}
                className={`border-b border-border ${
                  index === winnerIndex
                    ? "bg-green-50"
                    : ""
                }`}
              >
                <td className="py-3 px-4 text-foreground font-medium">
                  {option.name}
                  {index === winnerIndex && (
                    <span className="ml-2 text-xs text-green-700 font-semibold">
                      Best Value
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-foreground">
                  {formatCurrency(option.year1)}
                </td>
                <td className="py-3 px-4 text-right text-foreground">
                  {formatCurrency(option.year2)}
                </td>
                <td className="py-3 px-4 text-right text-foreground">
                  {formatCurrency(option.year3)}
                </td>
                <td className="py-3 px-4 text-right font-bold text-foreground">
                  {formatCurrency(option.totalCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">
          3-Year Total Comparison
        </h3>
        <div className="space-y-2" role="img" aria-label="Bar chart comparing 3-year total costs">
          {options.map((option, index) => {
            const widthPercent =
              maxTotal > 0 ? (option.totalCost / maxTotal) * 100 : 0;
            return (
              <div key={option.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{option.name}</span>
                  <span className="text-muted-foreground font-medium">
                    {formatCurrency(option.totalCost)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    data-testid={`tco-bar-${index}`}
                    className={`h-full rounded-full transition-all ${
                      index === winnerIndex
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${widthPercent}%` }}
                    role="presentation"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-base font-semibold text-foreground mb-2">
          AI Analysis
        </h3>
        {aiAnalysis ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {aiAnalysis}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            AI analysis will be available after the backend processes this comparison.
          </p>
        )}
      </div>
    </div>
  );
}
