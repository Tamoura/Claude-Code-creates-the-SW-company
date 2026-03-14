/**
 * Risk domain types for CTOaaS risk dashboard.
 * Maps to the backend risk API response shapes.
 *
 * [US-10][US-11][FR-020][FR-021][FR-022]
 */

export type RiskCategory =
  | "tech-debt"
  | "vendor"
  | "compliance"
  | "operational";

export type RiskTrend = "up" | "down" | "stable";

export type RiskStatus = "active" | "mitigated" | "dismissed";

export interface RiskCategorySummary {
  category: RiskCategory;
  score: number;
  trend: RiskTrend;
  activeCount: number;
}

export interface RiskItem {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  severity: number;
  trend: RiskTrend;
  status: RiskStatus;
  affectedSystems: string[];
  mitigations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RiskSummaryResponse {
  categories: RiskCategorySummary[];
  lastGeneratedAt: string | null;
}

export interface RiskCategoryDetailResponse {
  category: RiskCategory;
  score: number;
  trend: RiskTrend;
  items: RiskItem[];
}

/**
 * Map category to display metadata.
 */
export const RISK_CATEGORY_META: Record<
  RiskCategory,
  { label: string; iconName: string; description: string }
> = {
  "tech-debt": {
    label: "Tech Debt",
    iconName: "Server",
    description: "Technical debt and code quality risks",
  },
  vendor: {
    label: "Vendor",
    iconName: "Building2",
    description: "Vendor lock-in and dependency risks",
  },
  compliance: {
    label: "Compliance",
    iconName: "Shield",
    description: "Regulatory and compliance risks",
  },
  operational: {
    label: "Operational",
    iconName: "Settings2",
    description: "Operational and infrastructure risks",
  },
};

/**
 * Get score color class based on severity.
 * Green (1-3), Yellow (4-6), Red (7-10).
 */
export function getScoreColor(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score <= 3) {
    return {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    };
  }
  if (score <= 6) {
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    };
  }
  return {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  };
}

/**
 * Get trend display properties.
 */
export function getTrendDisplay(trend: RiskTrend): {
  label: string;
  arrowChar: string;
  color: string;
} {
  switch (trend) {
    case "up":
      return { label: "Increasing", arrowChar: "\u2191", color: "text-red-600" };
    case "down":
      return { label: "Decreasing", arrowChar: "\u2193", color: "text-green-600" };
    case "stable":
      return { label: "Stable", arrowChar: "\u2192", color: "text-gray-600" };
  }
}
