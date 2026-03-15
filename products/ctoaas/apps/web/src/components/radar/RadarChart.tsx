"use client";

import { useState, useMemo } from "react";
import type { RadarItem, RadarQuadrant, RadarRing } from "@/types/radar";
import { RADAR_RING_META, RADAR_QUADRANT_META } from "@/types/radar";

interface RadarChartProps {
  items: RadarItem[];
  onSelectItem: (item: RadarItem) => void;
  selectedItemId?: string;
}

const RING_RADII = [0.22, 0.42, 0.62, 0.82] as const;
const RING_COLORS = ["#dcfce7", "#dbeafe", "#fef9c3", "#fecaca"] as const;
const RING_STROKE_COLORS = [
  "#86efac",
  "#93c5fd",
  "#fde047",
  "#fca5a5",
] as const;

const QUADRANT_ANGLES: Record<RadarQuadrant, { start: number; end: number }> = {
  "languages-frameworks": { start: 0, end: 90 },
  "platforms-infrastructure": { start: 90, end: 180 },
  tools: { start: 180, end: 270 },
  techniques: { start: 270, end: 360 },
};

/**
 * Simple seeded hash for deterministic pseudo-random positioning.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Calculate dot position within a quadrant and ring.
 */
function calculatePosition(
  item: RadarItem,
  index: number
): { cx: number; cy: number } {
  const ringOrder = RADAR_RING_META[item.ring].order;
  const innerRadius = ringOrder === 0 ? 0.04 : RING_RADII[ringOrder - 1];
  const outerRadius = RING_RADII[ringOrder];
  const midRadius = innerRadius + (outerRadius - innerRadius) * 0.5;

  const angles = QUADRANT_ANGLES[item.quadrant];
  const hash = hashCode(item.id + index.toString());
  const angleFraction = (hash % 80 + 10) / 100;
  const radiusFraction = ((hash >> 8) % 60 + 20) / 100;

  const angle =
    angles.start + (angles.end - angles.start) * angleFraction;
  const radius =
    innerRadius + (outerRadius - innerRadius) * radiusFraction;

  const rad = (angle * Math.PI) / 180;
  return {
    cx: 50 + radius * 50 * Math.cos(rad),
    cy: 50 + radius * 50 * Math.sin(rad),
  };
}

/**
 * SVG-based tech radar visualization.
 * 4 concentric rings (Adopt, Trial, Assess, Hold)
 * 4 quadrants (Languages, Platforms, Tools, Techniques)
 *
 * [US-14][FR-025]
 */
export function RadarChart({
  items,
  onSelectItem,
  selectedItemId,
}: RadarChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positions = useMemo(() => {
    return items.map((item, idx) => ({
      item,
      pos: calculatePosition(item, idx),
    }));
  }, [items]);

  const hoveredItem = items.find((i) => i.id === hoveredId);

  return (
    <div className="relative w-full" role="img" aria-label="Technology radar chart showing technologies across four rings and four quadrants">
      <svg viewBox="0 0 100 100" className="w-full h-auto">
        {/* Ring backgrounds */}
        {[...RING_RADII].reverse().map((radius, reverseIdx) => {
          const idx = RING_RADII.length - 1 - reverseIdx;
          return (
            <circle
              key={`ring-${idx}`}
              cx="50"
              cy="50"
              r={radius * 50}
              fill={RING_COLORS[idx]}
              stroke={RING_STROKE_COLORS[idx]}
              strokeWidth="0.2"
              data-testid={`ring-${idx}`}
            />
          );
        })}

        {/* Quadrant divider lines */}
        <line x1="50" y1="50" x2="100" y2="50" stroke="#d1d5db" strokeWidth="0.15" />
        <line x1="50" y1="50" x2="0" y2="50" stroke="#d1d5db" strokeWidth="0.15" />
        <line x1="50" y1="50" x2="50" y2="0" stroke="#d1d5db" strokeWidth="0.15" />
        <line x1="50" y1="50" x2="50" y2="100" stroke="#d1d5db" strokeWidth="0.15" />

        {/* Ring labels */}
        <text x="50" y={50 - RING_RADII[0] * 50 + 2.5} textAnchor="middle" fontSize="1.8" fill="#166534" fontWeight="500">Adopt</text>
        <text x="50" y={50 - RING_RADII[1] * 50 + 2.5} textAnchor="middle" fontSize="1.8" fill="#1e40af" fontWeight="500">Trial</text>
        <text x="50" y={50 - RING_RADII[2] * 50 + 2.5} textAnchor="middle" fontSize="1.8" fill="#854d0e" fontWeight="500">Assess</text>
        <text x="50" y={50 - RING_RADII[3] * 50 + 2.5} textAnchor="middle" fontSize="1.8" fill="#991b1b" fontWeight="500">Hold</text>

        {/* Technology dots */}
        {positions.map(({ item, pos }) => {
          const isSelected = item.id === selectedItemId;
          const isHovered = item.id === hoveredId;
          const isUserStack = item.isUserStack;
          const dotRadius = isUserStack ? 1.8 : 1.2;

          return (
            <g key={item.id}>
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={isHovered || isSelected ? dotRadius + 0.4 : dotRadius}
                fill={isUserStack ? "#7c3aed" : "#1f2937"}
                stroke={isSelected ? "#2563eb" : isUserStack ? "#a78bfa" : "transparent"}
                strokeWidth={isSelected ? 0.4 : 0.2}
                className="cursor-pointer transition-all"
                role="button"
                aria-label={`${item.name}, ${RADAR_RING_META[item.ring].label} ring, ${RADAR_QUADRANT_META[item.quadrant].label} quadrant${item.isNew ? ", new" : ""}`}
                tabIndex={0}
                onClick={() => onSelectItem(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectItem(item);
                  }
                }}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId(null)}
                data-testid={`radar-dot-${item.id}`}
              />
              {item.isNew && (
                <text
                  x={pos.cx + dotRadius + 0.5}
                  y={pos.cy - dotRadius}
                  fontSize="2"
                  fill="#eab308"
                  aria-hidden="true"
                >
                  &#9733;
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Quadrant labels */}
      <div className="absolute top-1 right-1 text-xs font-medium text-gray-600" aria-hidden="true">
        {RADAR_QUADRANT_META["languages-frameworks"].shortLabel}
      </div>
      <div className="absolute top-1 left-1 text-xs font-medium text-gray-600" aria-hidden="true">
        {RADAR_QUADRANT_META["techniques"].shortLabel}
      </div>
      <div className="absolute bottom-1 right-1 text-xs font-medium text-gray-600" aria-hidden="true">
        {RADAR_QUADRANT_META["platforms-infrastructure"].shortLabel}
      </div>
      <div className="absolute bottom-1 left-1 text-xs font-medium text-gray-600" aria-hidden="true">
        {RADAR_QUADRANT_META["tools"].shortLabel}
      </div>

      {/* Hover tooltip */}
      {hoveredItem && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10"
          role="tooltip"
        >
          <span className="font-medium">{hoveredItem.name}</span>
          <span className="text-gray-300"> &middot; {RADAR_RING_META[hoveredItem.ring].label}</span>
        </div>
      )}
    </div>
  );
}
