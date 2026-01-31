/**
 * Strategy to Portfolio (S2P) Value Stream Types
 */

export type DemandStatus = "new" | "under_review" | "approved" | "rejected" | "in_portfolio";
export type DemandPriority = "critical" | "high" | "medium" | "low";

export interface Demand {
  id: string;
  title: string;
  description: string;
  status: DemandStatus;
  priority: DemandPriority;
  requestor: string;
  department: string;
  businessValue: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PortfolioItemStatus = "backlog" | "planned" | "active" | "on_hold" | "completed" | "cancelled";

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  status: PortfolioItemStatus;
  priority: DemandPriority;
  strategicAlignment: number; // percentage 0-100
  dependencies: number; // count of dependencies
  owner: string;
  targetQuarter: string; // e.g., "Q1", "Q2", "Q3", "Q4"
  startDate?: Date;
  targetDate?: Date;
}

export type ProposalStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";
export type RiskLevel = "low" | "medium" | "high";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  businessCase: string;
  status: ProposalStatus;
  requestor: string;
  estimatedCost: number;
  expectedROI: number; // percentage
  strategicAlignment: number; // percentage 0-100
  riskLevel: RiskLevel;
  createdAt: Date;
  decisionDate?: Date;
}

export type InvestmentType = "strategic" | "operational" | "compliance" | "innovation";
export type InvestmentStatus = "proposed" | "approved" | "active" | "on_hold" | "completed" | "cancelled";

export interface Investment {
  id: string;
  name: string;
  description: string;
  type: InvestmentType;
  status: InvestmentStatus;
  budget: number;
  spent: number;
  roi: number; // percentage
  owner: string;
  startDate: Date;
  endDate?: Date;
  kpis: string[];
}

export type RoadmapItemStatus = "planned" | "in_progress" | "completed" | "delayed" | "cancelled";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  quarter: string; // e.g., "Q1", "Q2", "Q3", "Q4"
  year: number; // e.g., 2026, 2027
  status: RoadmapItemStatus;
  dependencies: string[]; // IDs of other roadmap items
  owner: string;
  milestones: string[];
}
