import { Badge } from "@/components/ui/badge";
import type { RequestStatus, SubscriptionStatus, ServiceCategory } from "@/types/r2f";

interface RequestStatusBadgeProps {
  status: RequestStatus;
}

const requestStatusConfig: Record<RequestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  fulfilling: { label: "Fulfilling", variant: "warning" },
  fulfilled: { label: "Fulfilled", variant: "success" },
  cancelled: { label: "Cancelled", variant: "default" },
};

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const config = requestStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface SubscriptionStatusBadgeProps {
  status: SubscriptionStatus;
}

const subscriptionStatusConfig: Record<SubscriptionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "warning" },
  expired: { label: "Expired", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = subscriptionStatusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface ServiceCategoryBadgeProps {
  category: ServiceCategory;
}

const serviceCategoryConfig: Record<ServiceCategory, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  compute: { label: "Compute", variant: "info" },
  storage: { label: "Storage", variant: "secondary" },
  database: { label: "Database", variant: "warning" },
  networking: { label: "Networking", variant: "default" },
  security: { label: "Security", variant: "destructive" },
  software: { label: "Software", variant: "success" },
};

export function ServiceCategoryBadge({ category }: ServiceCategoryBadgeProps) {
  const config = serviceCategoryConfig[category];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
