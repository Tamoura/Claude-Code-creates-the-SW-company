"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import type {
  ChatMessage as ChatMessageType,
  FeedbackType,
  Citation,
} from "@/types/chat";
import { AI_DISCLAIMER } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
  onFeedback: (messageId: string, type: FeedbackType) => void;
}

/**
 * Renders a single chat message with role-based styling,
 * citation markers, feedback buttons, and AI disclaimer.
 * [US-01][FR-001][FR-002]
 */
export function ChatMessage({ message, onFeedback }: ChatMessageProps) {
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);
  const isUser = message.role === "user";

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggleCitation = (citationId: string) => {
    setExpandedCitation((prev) => (prev === citationId ? null : citationId));
  };

  const renderContentWithCitations = (
    content: string,
    citations?: Citation[]
  ) => {
    if (!citations || citations.length === 0) {
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    // Split content on citation markers like [1], [2]
    const parts = content.split(/(\[\d+\])/g);
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const idx = parseInt(match[1], 10) - 1;
            const citation = citations[idx];
            if (citation) {
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Citation ${match[1]}: ${citation.title}`}
                  onClick={() => toggleCitation(citation.id)}
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-600 bg-primary-100 rounded-full hover:bg-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 mx-0.5 align-super"
                >
                  {match[1]}
                </button>
              );
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  const expandedCitationData = message.citations?.find(
    (c) => c.id === expandedCitation
  );

  return (
    <div
      data-testid={`message-${message.id}`}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="text-sm leading-relaxed">
          {renderContentWithCitations(message.content, message.citations)}
        </div>

        {/* Expanded citation detail */}
        {expandedCitationData && (
          <div className="mt-2 p-2 bg-white/80 rounded-lg border border-gray-200 text-xs text-gray-700">
            <p className="font-semibold">{expandedCitationData.title}</p>
            <p className="text-gray-500 mt-0.5">
              {expandedCitationData.author}
            </p>
            <p className="text-gray-400 mt-0.5">
              Relevance: {Math.round(expandedCitationData.relevanceScore * 100)}%
            </p>
            {expandedCitationData.url && (
              <a
                href={expandedCitationData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline mt-1 inline-block"
              >
                View source
              </a>
            )}
          </div>
        )}

        {/* AI disclaimer for assistant messages */}
        {!isUser && (
          <p className="text-xs text-gray-500 mt-2 italic">
            {AI_DISCLAIMER}
          </p>
        )}

        {/* Footer: timestamp and feedback */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <time
            dateTime={message.createdAt}
            className={`text-xs ${isUser ? "text-indigo-200" : "text-gray-400"}`}
          >
            {formattedTime}
          </time>

          {!isUser && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Thumbs up"
                onClick={() => onFeedback(message.id, "positive")}
                className={`p-1 rounded hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                  message.feedback === "positive"
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                <ThumbsUp className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Thumbs down"
                onClick={() => onFeedback(message.id, "negative")}
                className={`p-1 rounded hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                  message.feedback === "negative"
                    ? "text-red-600"
                    : "text-gray-400"
                }`}
              >
                <ThumbsDown className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
