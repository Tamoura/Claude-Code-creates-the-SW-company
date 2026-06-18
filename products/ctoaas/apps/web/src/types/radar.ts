/**
 * Tech Radar domain types for CTOaaS.
 * Maps to the backend radar API response shapes.
 *
 * [US-14][FR-025][FR-026]
 */

export type RadarRing = "adopt" | "trial" | "assess" | "hold";

export type RadarQuadrant =
  | "languages-frameworks"
  | "platforms-infrastructure"
  | "tools"
  | "techniques";

export interface RadarItem {
  id: string;
  name: string;
  quadrant: RadarQuadrant;
  ring: RadarRing;
  description: string;
  rationale: string;
  isNew: boolean;
  isUserStack: boolean;
  relatedTechnologies: string[];
  relevanceScore: number | null;
}

export interface RadarResponse {
  items: RadarItem[];
  generatedAt: string | null;
}

/**
 * Ring display metadata: label, color, radius proportion.
 */
export const RADAR_RING_META: Record<
  RadarRing,
  { label: string; color: string; bgColor: string; order: number }
> = {
  adopt: { label: "Adopt", color: "text-green-700", bgColor: "bg-green-100", order: 0 },
  trial: { label: "Trial", color: "text-blue-700", bgColor: "bg-blue-100", order: 1 },
  assess: { label: "Assess", color: "text-yellow-700", bgColor: "bg-yellow-100", order: 2 },
  hold: { label: "Hold", color: "text-red-700", bgColor: "bg-red-100", order: 3 },
};

/**
 * Quadrant display metadata: label, angle offset.
 */
export const RADAR_QUADRANT_META: Record<
  RadarQuadrant,
  { label: string; shortLabel: string; order: number }
> = {
  "languages-frameworks": {
    label: "Languages & Frameworks",
    shortLabel: "Lang & FW",
    order: 0,
  },
  "platforms-infrastructure": {
    label: "Platforms & Infrastructure",
    shortLabel: "Platform",
    order: 1,
  },
  tools: {
    label: "Tools",
    shortLabel: "Tools",
    order: 2,
  },
  techniques: {
    label: "Techniques",
    shortLabel: "Techniques",
    order: 3,
  },
};

/**
 * Get badge color for a ring.
 */
export function getRingBadgeColor(ring: RadarRing): string {
  switch (ring) {
    case "adopt":
      return "bg-green-100 text-green-800";
    case "trial":
      return "bg-blue-100 text-blue-800";
    case "assess":
      return "bg-yellow-100 text-yellow-800";
    case "hold":
      return "bg-red-100 text-red-800";
  }
}
