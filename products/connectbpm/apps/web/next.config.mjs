/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5018';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Lint is its own required CI job (`pnpm lint`), not a build side effect.
  // Next 14's built-in ESLint integration passes removed options to ESLint 9
  // and errors; the standalone `eslint` run is the gate that counts.
  eslint: { ignoreDuringBuilds: true },
  // Type errors DO fail the build. `tsc --noEmit` runs in CI as well.
  typescript: { ignoreBuildErrors: false },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            process.env.NODE_ENV === 'development'
              ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "img-src 'self' data: blob:",
            `connect-src 'self' ${new URL(apiUrl).origin}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ],
};

export default nextConfig;
