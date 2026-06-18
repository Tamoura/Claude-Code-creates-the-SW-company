"use client";

import { ExternalLink } from "lucide-react";
import type { Citation } from "@/types/chat";

interface CitationPanelProps {
  citations: Citation[];
}

/**
 * Displays a list of citation sources with title, author,
 * relevance score, and optional "View source" link.
 * [US-01][FR-002]
 */
export function CitationPanel({ citations }: CitationPanelProps) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Sources
      </h4>
      {citations.map((citation, index) => (
        <div
          key={citation.id}
          className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100"
        >
          <span className="flex-shrink-0 w-5 h-5 text-xs font-bold text-primary-600 bg-primary-100 rounded-full flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {citation.title}
            </p>
            <p className="text-xs text-gray-500">{citation.author}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">
                Relevance: {Math.round(citation.relevanceScore * 100)}%
              </span>
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                >
                  View source
                  <ExternalLink
                    className="w-3 h-3"
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
