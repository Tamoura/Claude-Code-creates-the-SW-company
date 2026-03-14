"use client";

import Link from "next/link";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          AI CTO Advisor
        </h1>
        <p className="text-muted-foreground mt-1">
          Ask questions about technology strategy, architecture,
          team structure, and engineering best practices.
        </p>
      </div>

      {/* Chat area placeholder */}
      <div className="flex-1 bg-muted/30 rounded-xl border border-border flex flex-col">
        {/* Messages area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Start a conversation
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              The AI advisor is powered by CopilotKit and will be
              connected to your organization context once configured.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Review my architecture",
                "Technology recommendations",
                "Team scaling advice",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled
                  className="px-3 py-1.5 text-sm bg-background border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Message the AI advisor
            </label>
            <input
              id="chat-input"
              type="text"
              disabled
              placeholder="Ask your AI CTO advisor..."
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            />
            <button
              type="button"
              disabled
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            CopilotKit integration will be activated in{" "}
            <Link
              href="/dashboard"
              className="text-primary-600 hover:underline"
            >
              IMPL-011
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
