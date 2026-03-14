/**
 * Cost analysis types for TCO calculator and Cloud Spend.
 * [US-12][US-13][FR-023][FR-027]
 */

// --- TCO Types ---

export interface TcoOption {
  name: string;
  upfrontCost: number;
  monthlyRecurring: number;
  teamSize: number;
  hourlyRate: number;
  durationMonths: number;
  scalingFactor: number;
}

export interface TcoOptionResult extends TcoOption {
  year1: number;
  year2: number;
  year3: number;
  totalCost: number;
}

export interface TcoComparison {
  id: string;
  title: string;
  options: TcoOptionResult[];
  winnerIndex: number;
  aiAnalysis?: string;
  createdAt: string;
}

export interface TcoFormData {
  title: string;
  options: TcoOption[];
}

// --- Cloud Spend Types ---

export type CloudProvider = "aws" | "gcp" | "azure" | "other";

export const CLOUD_PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Microsoft Azure",
  other: "Other",
};

export interface SpendCategories {
  compute: number;
  storage: number;
  database: number;
  networking: number;
  other: number;
}

export const SPEND_CATEGORY_LABELS: Record<keyof SpendCategories, string> = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  networking: "Networking",
  other: "Other",
};

export const SPEND_CATEGORY_COLORS: Record<keyof SpendCategories, string> = {
  compute: "bg-blue-500",
  storage: "bg-green-500",
  database: "bg-purple-500",
  networking: "bg-orange-500",
  other: "bg-gray-500",
};

export interface CloudSpendEntry {
  id: string;
  provider: CloudProvider;
  periodStart: string;
  periodEnd: string;
  categories: SpendCategories;
  total: number;
  createdAt: string;
}

export interface CloudSpendFormData {
  provider: CloudProvider;
  periodStart: string;
  periodEnd: string;
  categories: SpendCategories;
}

export interface BenchmarkComparison {
  category: keyof SpendCategories;
  yourSpend: number;
  industryAverage: number;
  percentDifference: number;
}

export interface SpendRecommendation {
  title: string;
  description: string;
  estimatedSavings: number;
  priority: "high" | "medium" | "low";
}

export interface CloudSpendAnalysis {
  totalSpend: number;
  breakdown: Array<{
    category: keyof SpendCategories;
    amount: number;
    percentage: number;
  }>;
  benchmarks: BenchmarkComparison[];
  recommendations: SpendRecommendation[];
}
