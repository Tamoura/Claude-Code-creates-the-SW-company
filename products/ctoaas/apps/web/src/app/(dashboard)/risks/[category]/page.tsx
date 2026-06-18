"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useRiskCategory, useRiskActions } from "@/hooks/useRisks";
import { RiskItemRow } from "@/components/risks/RiskItemRow";
import { RiskDetail } from "@/components/risks/RiskDetail";
import {
  getScoreColor,
  getTrendDisplay,
  RISK_CATEGORY_META,
  type RiskCategory,
  type RiskStatus,
  type RiskItem,
} from "@/types/risks";

const STATUS_OPTIONS: { value: RiskStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "mitigated", label: "Mitigated" },
  { value: "dismissed", label: "Dismissed" },
];

/**
 * Category detail page showing risk items for a specific category.
 * [US-11][FR-021][FR-022]
 */
export default function CategoryPage() {
  const params = useParams();
  const category = params.category as RiskCategory;
  const { data, isLoading, error, refetch } = useRiskCategory(category);
  const { updateStatus, isUpdating } = useRiskActions();

  const [statusFilter, setStatusFilter] = useState<RiskStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<RiskItem | null>(null);

  const meta = RISK_CATEGORY_META[category] ?? {
    label: category,
    description: "",
    iconName: "Shield",
  };

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const items =
      statusFilter === "all"
        ? data.items
        : data.items.filter((item) => item.status === statusFilter);
    return [...items].sort((a, b) => b.severity - a.severity);
  }, [data?.items, statusFilter]);

  const handleStatusChange = async (itemId: string, status: RiskStatus) => {
    const success = await updateStatus(itemId, status);
    if (success) {
      refetch();
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-32" />
        <div className="h-8 bg-muted rounded w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
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

  const scoreColor = data ? getScoreColor(data.score) : null;
  const trendDisplay = data ? getTrendDisplay(data.trend) : null;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/risks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        aria-label="Back to risk dashboard"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back to Risk Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {meta.label}
          </h1>
          {scoreColor && (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor.bg} ${scoreColor.text}`}
            >
              {data?.score}
            </div>
          )}
          {trendDisplay && (
            <span
              className={`text-sm font-medium ${trendDisplay.color} flex items-center gap-1`}
            >
              <span aria-hidden="true">{trendDisplay.arrowChar}</span>
              {trendDisplay.label}
            </span>
          )}
        </div>

        {/* Status filter */}
        <div>
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RiskStatus | "all")
            }
            className="block w-full sm:w-auto rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px]"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content: list + detail */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Item list */}
        <div className="flex-1 space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <RiskItemRow
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                onSelect={setSelectedItem}
              />
            ))
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-lg border border-border">
              <p className="text-muted-foreground">
                No risk items match the current filter.
              </p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="lg:w-96 flex-shrink-0">
            <RiskDetail
              item={selectedItem}
              onStatusChange={handleStatusChange}
              onClose={() => setSelectedItem(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
