import { Badge } from "@/components/ui/badge";
import type { IncidentStatus, IncidentSeverity } from "@/types/d2c";

interface IncidentStatusBadgeProps {
  status: IncidentStatus;
}

const statusConfig: Record<IncidentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  new: { label: "New", variant: "info" },
  assigned: { label: "Assigned", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "warning" },
  pending: { label: "Pending", variant: "outline" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "default" },
};

export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface SeverityBadgeProps {
  severity: IncidentSeverity;
}

const severityConfig: Record<IncidentSeverity, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  1: { label: "Critical", variant: "destructive" },
  2: { label: "High", variant: "warning" },
  3: { label: "Medium", variant: "info" },
  4: { label: "Low", variant: "secondary" },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
