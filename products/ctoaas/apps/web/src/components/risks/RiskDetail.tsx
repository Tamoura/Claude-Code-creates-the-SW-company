"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { RiskItem, RiskStatus } from "@/types/risks";
import { getScoreColor, getTrendDisplay, RISK_CATEGORY_META } from "@/types/risks";

interface RiskDetailProps {
  item: RiskItem;
  onStatusChange: (itemId: string, status: RiskStatus) => void;
  onClose: () => void;
}

/**
 * Detail panel for a single risk item.
 * Shows full description, affected systems, mitigations, and AI recommendations.
 * [US-11][FR-021][FR-022]
 */
export function RiskDetail({ item, onStatusChange, onClose }: RiskDetailProps) {
  const scoreColor = getScoreColor(item.severity);
  const trendDisplay = getTrendDisplay(item.trend);
  const categoryMeta = RISK_CATEGORY_META[item.category];

  return (
    <div
      className="bg-background border border-border rounded-xl shadow-lg overflow-hidden"
      role="dialog"
      aria-label={`Risk detail: ${item.title}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor.bg} ${scoreColor.text}`}
          >
            {item.severity}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {item.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {categoryMeta.label}
              </span>
              <span
                className={`text-xs font-medium ${trendDisplay.color}`}
              >
                {trendDisplay.arrowChar} {trendDisplay.label}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close detail panel"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-6">
        {/* Description */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Description
          </h3>
          <p className="text-sm text-muted-foreground">
            {item.description}
          </p>
        </section>

        {/* Affected Systems */}
        {item.affectedSystems.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Affected Systems
            </h3>
            <ul className="space-y-1">
              {item.affectedSystems.map((system) => (
                <li
                  key={system}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {system}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Mitigations */}
        {item.mitigations.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Mitigations
            </h3>
            <ul className="space-y-1">
              {item.mitigations.map((mitigation) => (
                <li
                  key={mitigation}
                  className="text-sm text-muted-foreground flex items-center gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {mitigation}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* AI Recommendations placeholder */}
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            AI Recommendations
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground">
              AI-powered recommendations will be available after advisor
              analysis. Start a conversation to get tailored advice.
            </p>
            <Link
              href={`/chat?context=risk:${item.id}`}
              className="inline-flex items-center mt-3 text-sm font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              Discuss with AI advisor
            </Link>
          </div>
        </section>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap gap-3">
        {item.status === "active" && (
          <>
            <button
              type="button"
              onClick={() => onStatusChange(item.id, "mitigated")}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Mark as mitigated"
            >
              Mark as Mitigated
            </button>
            <button
              type="button"
              onClick={() => onStatusChange(item.id, "dismissed")}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 min-h-[44px]"
              aria-label="Dismiss risk"
            >
              Dismiss Risk
            </button>
          </>
        )}
        {item.status === "mitigated" && (
          <button
            type="button"
            onClick={() => onStatusChange(item.id, "active")}
            className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Reactivate risk"
          >
            Reactivate
          </button>
        )}
        {item.status === "dismissed" && (
          <button
            type="button"
            onClick={() => onStatusChange(item.id, "active")}
            className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[44px]"
            aria-label="Reactivate risk"
          >
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}
