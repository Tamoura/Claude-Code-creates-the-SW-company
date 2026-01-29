import { Badge } from "@/components/ui/badge";
import type { DemandStatus, PortfolioItemStatus, InvestmentStatus, ProposalStatus } from "@/types/s2p";

interface DemandStatusBadgeProps {
  status: DemandStatus;
}

const demandStatusConfig: Record<
  DemandStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  new: { label: "New", variant: "outline" },
  under_review: { label: "Under Review", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  in_portfolio: { label: "In Portfolio", variant: "default" },
};

export function DemandStatusBadge({ status }: DemandStatusBadgeProps) {
  const config = demandStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface PortfolioStatusBadgeProps {
  status: PortfolioItemStatus;
}

const portfolioStatusConfig: Record<
  PortfolioItemStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  backlog: { label: "Backlog", variant: "outline" },
  planned: { label: "Planned", variant: "info" },
  active: { label: "Active", variant: "success" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function PortfolioStatusBadge({ status }: PortfolioStatusBadgeProps) {
  const config = portfolioStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface InvestmentStatusBadgeProps {
  status: InvestmentStatus;
}

const investmentStatusConfig: Record<
  InvestmentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  proposed: { label: "Proposed", variant: "outline" },
  approved: { label: "Approved", variant: "info" },
  active: { label: "Active", variant: "success" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function InvestmentStatusBadge({ status }: InvestmentStatusBadgeProps) {
  const config = investmentStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

const proposalStatusConfig: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }
> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const config = proposalStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
