/**
 * Strategy to Portfolio (S2P) Value Stream Types
 */

export type DemandStatus = "new" | "assessing" | "approved" | "rejected" | "in_portfolio";
export type DemandPriority = "critical" | "high" | "medium" | "low";

export interface Demand {
  id: string;
  title: string;
  description: string;
  status: DemandStatus;
  priority: DemandPriority;
  requestor: string;
  businessValue: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PortfolioItemStatus = "proposed" | "planned" | "in_progress" | "completed" | "on_hold";

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  status: PortfolioItemStatus;
  priority: number;
  investment: number;
  expectedROI: number;
  owner: string;
  startDate: Date;
  targetDate: Date;
  progress: number;
}

export type ProposalStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  businessCase: string;
  status: ProposalStatus;
  requestedBudget: number;
  expectedBenefit: number;
  roi: number;
  submittedBy: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

export type InvestmentStatus = "active" | "completed" | "cancelled";

export interface Investment {
  id: string;
  name: string;
  description: string;
  status: InvestmentStatus;
  allocatedBudget: number;
  spentToDate: number;
  expectedValue: number;
  actualValue: number;
  startDate: Date;
  endDate: Date;
  sponsor: string;
}
