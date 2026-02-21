import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Port 3111 as assigned in PORT-REGISTRY.md
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
            // Next.js App Router does not require 'unsafe-inline' for scripts.
            // 'unsafe-eval' is needed in development only for Fast Refresh/HMR.
            process.env.NODE_ENV === "development"
              ? "script-src 'self' 'unsafe-eval'"
              : "script-src 'self'",
            // Next.js requires 'unsafe-inline' for styles because it injects
            // CSS via <style> tags for Tailwind and CSS-in-JS. This is a known
            // Next.js limitation; nonce-based style-src is not yet supported
            // in the App Router. See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5007"}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
