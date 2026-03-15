"use client";

import { useState } from "react";
import { RadarChart } from "@/components/radar/RadarChart";
import { RadarListView } from "@/components/radar/RadarListView";
import { RadarDetail } from "@/components/radar/RadarDetail";
import { useRadar } from "@/hooks/useRadar";
import type { RadarItem } from "@/types/radar";
import { RADAR_RING_META } from "@/types/radar";

/**
 * Tech Radar page with SVG visualization (desktop) and list view (mobile).
 * [US-14][FR-025][FR-026]
 */
export default function RadarPage() {
  const { items, isLoading, error } = useRadar();
  const [selectedItem, setSelectedItem] = useState<RadarItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tech Radar</h1>
        <div className="flex items-center justify-center py-16">
          <div className="text-muted-foreground" role="status" aria-label="Loading radar data">
            Loading radar data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tech Radar</h1>
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tech Radar</h1>
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "technology" : "technologies"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No technologies tracked yet</p>
          <p className="text-sm">
            Complete your onboarding profile to see personalized technology recommendations.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Radar chart (hidden on mobile, shown on lg+) */}
          <div className="hidden lg:block flex-1 min-w-0">
            <RadarChart
              items={items}
              onSelectItem={setSelectedItem}
              selectedItemId={selectedItem?.id}
            />
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
              {(["adopt", "trial", "assess", "hold"] as const).map((ring) => (
                <div key={ring} className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-3 h-3 rounded-full ${RADAR_RING_META[ring].bgColor}`}
                    aria-hidden="true"
                  />
                  <span className={RADAR_RING_META[ring].color}>
                    {RADAR_RING_META[ring].label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full bg-purple-200" aria-hidden="true" />
                <span className="text-purple-700">Your stack</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-yellow-500" aria-hidden="true">&#9733;</span>
                <span className="text-gray-600">New</span>
              </div>
            </div>
          </div>

          {/* List view (shown on mobile, hidden on lg+) */}
          <div className="lg:hidden">
            <RadarListView
              items={items}
              onSelectItem={setSelectedItem}
            />
          </div>

          {/* Detail panel */}
          {selectedItem && (
            <div className="lg:w-80 flex-shrink-0">
              <RadarDetail
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
