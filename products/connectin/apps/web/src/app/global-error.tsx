"use client";

import { useEffect } from "react";

/**
 * Global error boundary — renders when the root layout itself crashes.
 * Must include <html> and <body> tags and must NOT use any providers
 * or context from the root layout, because those are unavailable here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "480px",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please refresh the page or contact
            support if the problem persists.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              backgroundColor: "#0B6E7F",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
