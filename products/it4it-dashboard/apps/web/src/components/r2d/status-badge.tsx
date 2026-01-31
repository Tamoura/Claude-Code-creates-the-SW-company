import { Badge } from "@/components/ui/badge";
import type { BuildStatus, DeploymentStatus, ReleaseStatus } from "@/types/r2d";

interface BuildStatusBadgeProps {
  status: BuildStatus;
}

const buildStatusConfig: Record<BuildStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  pending: { label: "Pending", variant: "outline" },
  running: { label: "Running", variant: "info" },
  success: { label: "Success", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function BuildStatusBadge({ status }: BuildStatusBadgeProps) {
  const config = buildStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface DeploymentStatusBadgeProps {
  status: DeploymentStatus;
}

const deploymentStatusConfig: Record<DeploymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  pending: { label: "Pending", variant: "outline" },
  in_progress: { label: "In Progress", variant: "info" },
  success: { label: "Success", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  rolled_back: { label: "Rolled Back", variant: "warning" },
};

export function DeploymentStatusBadge({ status }: DeploymentStatusBadgeProps) {
  const config = deploymentStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ReleaseStatusBadgeProps {
  status: ReleaseStatus;
}

const releaseStatusConfig: Record<ReleaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  draft: { label: "Draft", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export function ReleaseStatusBadge({ status }: ReleaseStatusBadgeProps) {
  const config = releaseStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
