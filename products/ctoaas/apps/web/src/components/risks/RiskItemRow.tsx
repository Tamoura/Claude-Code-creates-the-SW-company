"use client";

import Link from "next/link";
import type { RiskItem, RiskStatus } from "@/types/risks";
import { getScoreColor, getTrendDisplay } from "@/types/risks";

interface RiskItemRowProps {
  item: RiskItem;
  onStatusChange: (itemId: string, status: RiskStatus) => void;
  onSelect?: (item: RiskItem) => void;
}

const STATUS_STYLES: Record<RiskStatus, string> = {
  active: "bg-blue-100 text-blue-800",
  mitigated: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

/**
 * Row component for a risk item in a category list.
 * Shows title, severity, status, trend, and action buttons.
 * [US-11][FR-021]
 */
export function RiskItemRow({ item, onStatusChange, onSelect }: RiskItemRowProps) {
  const scoreColor = getScoreColor(item.severity);
  const trendDisplay = getTrendDisplay(item.trend);

  return (
    <div
      className="bg-background border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
      role="article"
      aria-label={`Risk: ${item.title}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Severity badge */}
        <div
          data-testid="severity-badge"
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${scoreColor.bg} ${scoreColor.text}`}
        >
          {item.severity}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect?.(item)}
              className="text-sm font-semibold text-foreground hover:text-primary-600 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              {item.title}
            </button>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[item.status]}`}
            >
              {item.status}
            </span>
            <span
              className={`text-xs font-medium ${trendDisplay.color} flex items-center gap-0.5`}
            >
              <span aria-hidden="true">{trendDisplay.arrowChar}</span>
              {trendDisplay.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.status === "active" && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(item.id, "mitigated")}
                className="text-xs px-3 py-1.5 rounded-md border border-green-300 text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 min-h-[36px]"
                aria-label={`Mitigate ${item.title}`}
              >
                Mitigate
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(item.id, "dismissed")}
                className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 min-h-[36px]"
                aria-label={`Dismiss ${item.title}`}
              >
                Dismiss
              </button>
            </>
          )}
          <Link
            href={`/chat?context=risk:${item.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-primary-300 text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[36px] inline-flex items-center"
            aria-label={`Discuss ${item.title} with advisor`}
          >
            Discuss
          </Link>
        </div>
      </div>
    </div>
  );
}
