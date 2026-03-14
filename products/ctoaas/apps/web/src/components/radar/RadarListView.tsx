"use client";

import { useState, useMemo } from "react";
import type { RadarItem, RadarQuadrant, RadarRing } from "@/types/radar";
import {
  RADAR_RING_META,
  RADAR_QUADRANT_META,
  getRingBadgeColor,
} from "@/types/radar";

interface RadarListViewProps {
  items: RadarItem[];
  onSelectItem: (item: RadarItem) => void;
}

const ALL_QUADRANTS: RadarQuadrant[] = [
  "languages-frameworks",
  "platforms-infrastructure",
  "tools",
  "techniques",
];

const ALL_RINGS: RadarRing[] = ["adopt", "trial", "assess", "hold"];

/**
 * Mobile fallback list view for the tech radar.
 * Grouped by quadrant, filterable by quadrant/ring, searchable.
 *
 * [US-14][FR-025]
 */
export function RadarListView({ items, onSelectItem }: RadarListViewProps) {
  const [search, setSearch] = useState("");
  const [quadrantFilter, setQuadrantFilter] = useState<RadarQuadrant | "all">(
    "all"
  );
  const [ringFilter, setRingFilter] = useState<RadarRing | "all">("all");

  const filtered = useMemo(() => {
    let result = items;
    if (quadrantFilter !== "all") {
      result = result.filter((i) => i.quadrant === quadrantFilter);
    }
    if (ringFilter !== "all") {
      result = result.filter((i) => i.ring === ringFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }
    return result;
  }, [items, quadrantFilter, ringFilter, search]);

  const grouped = useMemo(() => {
    const groups = new Map<RadarQuadrant, RadarItem[]>();
    for (const q of ALL_QUADRANTS) {
      const qItems = filtered.filter((i) => i.quadrant === q);
      if (qItems.length > 0) {
        groups.set(q, qItems);
      }
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label htmlFor="radar-search" className="sr-only">
            Search technologies
          </label>
          <input
            id="radar-search"
            type="search"
            placeholder="Search technologies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
        </div>
        <div>
          <label htmlFor="quadrant-filter" className="sr-only">
            Filter by quadrant
          </label>
          <select
            id="quadrant-filter"
            value={quadrantFilter}
            onChange={(e) =>
              setQuadrantFilter(e.target.value as RadarQuadrant | "all")
            }
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <option value="all">All quadrants</option>
            {ALL_QUADRANTS.map((q) => (
              <option key={q} value={q}>
                {RADAR_QUADRANT_META[q].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ring-filter" className="sr-only">
            Filter by ring
          </label>
          <select
            id="ring-filter"
            value={ringFilter}
            onChange={(e) => setRingFilter(e.target.value as RadarRing | "all")}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <option value="all">All rings</option>
            {ALL_RINGS.map((r) => (
              <option key={r} value={r}>
                {RADAR_RING_META[r].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No technologies match your filters.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([quadrant, qItems]) => (
            <section key={quadrant} aria-labelledby={`quadrant-${quadrant}`}>
              <h3
                id={`quadrant-${quadrant}`}
                className="text-sm font-semibold text-foreground mb-2"
              >
                {RADAR_QUADRANT_META[quadrant].label}
              </h3>
              <ul className="space-y-1" role="list">
                {qItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectItem(item)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 flex items-center gap-2 min-h-[44px]"
                      aria-label={`${item.name}, ${RADAR_RING_META[item.ring].label} ring${item.isNew ? ", new" : ""}${item.isUserStack ? ", in your stack" : ""}`}
                    >
                      <span className="flex-1 text-sm text-foreground">
                        {item.name}
                        {item.isNew && (
                          <span
                            className="ml-1 text-yellow-500 text-xs"
                            aria-label="New"
                          >
                            &#9733;
                          </span>
                        )}
                        {item.isUserStack && (
                          <span className="ml-1 inline-block w-2 h-2 bg-purple-500 rounded-full" aria-label="In your stack" />
                        )}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRingBadgeColor(item.ring)}`}
                      >
                        {RADAR_RING_META[item.ring].label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
