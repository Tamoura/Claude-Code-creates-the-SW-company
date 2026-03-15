"use client";

import Link from "next/link";
import { Shield, Server, Building2, Settings2 } from "lucide-react";
import type { RiskCategorySummary, RiskCategory } from "@/types/risks";
import {
  getScoreColor,
  getTrendDisplay,
  RISK_CATEGORY_META,
} from "@/types/risks";

const CATEGORY_ICONS: Record<RiskCategory, React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>> = {
  compliance: Shield,
  "tech-debt": Server,
  vendor: Building2,
  operational: Settings2,
};

interface RiskCardProps {
  summary: RiskCategorySummary;
}

/**
 * Card displaying a risk category summary with score, trend, and active count.
 * Links to the category detail page.
 * [US-10][FR-020]
 */
export function RiskCard({ summary }: RiskCardProps) {
  const { category, score, trend, activeCount } = summary;
  const meta = RISK_CATEGORY_META[category];
  const scoreColor = getScoreColor(score);
  const trendDisplay = getTrendDisplay(trend);
  const Icon = CATEGORY_ICONS[category];

  return (
    <Link
      href={`/risks/${category}`}
      aria-label={`${meta.label} risks: score ${score} out of 10, ${activeCount} active risks, trend ${trendDisplay.label.toLowerCase()}`}
      className="block bg-background rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-foreground" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {meta.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {meta.description}
            </p>
          </div>
        </div>
        <div
          data-testid="risk-score"
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor.bg} ${scoreColor.text}`}
        >
          {score}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {activeCount} active {activeCount === 1 ? "risk" : "risks"}
        </span>
        <span className={`text-xs font-medium ${trendDisplay.color} flex items-center gap-1`}>
          <span aria-hidden="true">{trendDisplay.arrowChar}</span>
          {trendDisplay.label}
        </span>
      </div>
    </Link>
  );
}
