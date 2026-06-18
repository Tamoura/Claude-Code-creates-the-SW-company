"use client";

import type { RadarItem } from "@/types/radar";
import { RADAR_RING_META, RADAR_QUADRANT_META, getRingBadgeColor } from "@/types/radar";

interface RadarDetailProps {
  item: RadarItem;
  onClose: () => void;
}

/**
 * Detail panel for a selected radar technology.
 * Shows name, quadrant, ring, description, rationale, related technologies.
 *
 * [US-14][FR-026]
 */
export function RadarDetail({ item, onClose }: RadarDetailProps) {
  return (
    <div
      className="bg-background rounded-xl border border-border shadow-lg p-6 space-y-4"
      role="region"
      aria-label={`Details for ${item.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {item.name}
            </h2>
            {item.isNew && (
              <span
                className="text-yellow-500 text-sm"
                role="status"
                aria-label="New technology"
              >
                &#9733; New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRingBadgeColor(item.ring)}`}>
              {RADAR_RING_META[item.ring].label}
            </span>
            <span className="text-xs text-muted-foreground">
              {RADAR_QUADRANT_META[item.quadrant].label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="p-1 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Description</h3>
        <p className="text-sm text-muted-foreground">{item.description || "No description available."}</p>
      </div>

      {/* Rationale */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Rationale</h3>
        <p className="text-sm text-muted-foreground">{item.rationale || "No rationale provided."}</p>
      </div>

      {/* Relevance score */}
      {item.relevanceScore !== null && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Relevance Score</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${Math.min(100, item.relevanceScore)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">{item.relevanceScore}%</span>
          </div>
        </div>
      )}

      {/* Related technologies */}
      {item.relatedTechnologies.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Related Technologies</h3>
          <div className="flex flex-wrap gap-1">
            {item.relatedTechnologies.map((tech) => (
              <span
                key={tech}
                className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* User stack badge */}
      {item.isUserStack && (
        <div className="pt-2 border-t border-border">
          <span className="text-xs px-2 py-1 rounded-md bg-purple-100 text-purple-800 font-medium">
            In your tech stack
          </span>
        </div>
      )}
    </div>
  );
}
