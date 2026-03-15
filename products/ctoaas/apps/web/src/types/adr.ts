/**
 * ADR (Architecture Decision Record) domain types for CTOaaS.
 * Maps to the backend ADR API response shapes.
 *
 * [US-15][FR-030][FR-033]
 */

export type AdrStatus = "proposed" | "accepted" | "deprecated" | "superseded";

export interface Adr {
  id: string;
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  consequences: string;
  alternatives: string;
  diagram: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdrListResponse {
  adrs: Adr[];
}

export interface AdrCreateInput {
  title: string;
  status: AdrStatus;
  context: string;
  decision: string;
  consequences?: string;
  alternatives?: string;
  diagram?: string;
}

export interface AdrUpdateInput extends AdrCreateInput {
  id: string;
}

/**
 * Status display metadata.
 */
export const ADR_STATUS_META: Record<
  AdrStatus,
  { label: string; badgeColor: string }
> = {
  proposed: { label: "Proposed", badgeColor: "bg-blue-100 text-blue-800" },
  accepted: { label: "Accepted", badgeColor: "bg-green-100 text-green-800" },
  deprecated: {
    label: "Deprecated",
    badgeColor: "bg-gray-100 text-gray-800",
  },
  superseded: {
    label: "Superseded",
    badgeColor: "bg-orange-100 text-orange-800",
  },
};

/**
 * Valid status transitions.
 */
export const ADR_STATUS_TRANSITIONS: Record<AdrStatus, AdrStatus[]> = {
  proposed: ["accepted", "deprecated"],
  accepted: ["deprecated", "superseded"],
  deprecated: [],
  superseded: [],
};
