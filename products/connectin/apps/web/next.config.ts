import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent i18n packages from being bundled into the server-side prerender
  // of special pages (/_global-error, /_not-found). These packages use
  // i18next-browser-languagedetector which accesses browser APIs at module
  // init time and causes React context errors during Next.js static prerender.
  serverExternalPackages: [
    "i18next-browser-languagedetector",
  ],
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
            // Next.js App Router injects inline <script> tags for RSC hydration
            // payloads in both dev and production builds. 'unsafe-inline' is
            // required for React hydration to work. 'unsafe-eval' is only needed
            // in dev mode for React DevTools and Turbopack hot module replacement.
            // TODO: replace 'unsafe-inline' with nonce-based CSP once the
            // nonce middleware is implemented.
            process.env.NODE_ENV === "development"
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-inline'",
            // Next.js requires 'unsafe-inline' for styles because it injects
            // CSS via <style> tags for Tailwind and CSS-in-JS. This is a known
            // Next.js limitation; nonce-based style-src is not yet supported
            // in the App Router. See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            // Use the API origin only (no path) — CSP path-matching without a
            // trailing slash matches ONLY that exact path, not sub-paths.
            // e.g. http://localhost:5007/api/v1 would block /api/v1/auth/login.
            `connect-src 'self' ${new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5007").origin}`,
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
      { protocol: "https", hostname: "*.cloudinary.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
