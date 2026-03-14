import type { AdrStatus } from "@/types/adr";
import { ADR_STATUS_META } from "@/types/adr";

interface AdrStatusBadgeProps {
  status: AdrStatus;
}

/**
 * Badge component for ADR statuses.
 * [US-15][FR-030]
 */
export function AdrStatusBadge({ status }: AdrStatusBadgeProps) {
  const meta = ADR_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${meta.badgeColor}`}
    >
      {meta.label}
    </span>
  );
}
