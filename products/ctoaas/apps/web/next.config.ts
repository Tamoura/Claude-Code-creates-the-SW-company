import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Port 3120 as assigned in PORT-REGISTRY.md
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Next.js App Router injects inline <script> tags for RSC
            // hydration payloads. 'unsafe-inline' is required for React
            // hydration. 'unsafe-eval' is only needed in dev mode for
            // React DevTools and hot module replacement.
            process.env.NODE_ENV === "development"
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            // Use the API origin only (no path) -- CSP path-matching
            // without a trailing slash matches ONLY that exact path.
            `connect-src 'self' ${new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5015").origin}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
