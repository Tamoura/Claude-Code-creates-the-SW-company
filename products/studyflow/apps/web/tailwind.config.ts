import type { Config } from 'tailwindcss';

/**
 * StudyFlow — "Sage Enterprise" design system.
 *
 * Palette sampled from the ConnectGRC live site (calm sage/forest-green
 * enterprise aesthetic). The full system is documented in
 * `products/studyflow/DESIGN.md`.
 *
 * `brand` is aliased to the same `sage` scale so every existing `brand-*`
 * utility inherits the new palette with zero churn at the call site.
 */
const sage = {
  50: '#f1f9f7',
  100: '#d9efe9',
  200: '#b3ddd2',
  300: '#84c4b5',
  400: '#52a394',
  500: '#2d8576',
  600: '#00786f', // DEFAULT — matches the live "Sign up" / primary button
  700: '#005f5a', // heading-accent green, hover-darken
  800: '#0b4f4a',
  900: '#0c3e3a',
} as const;

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage,
        // Alias: keep all existing `brand-*` utilities working, now sage.
        brand: sage,
      },
      fontFamily: {
        // Body / UI default.
        sans: [
          'var(--font-inter)',
          'Inter',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        // Bold geometric display headlines.
        display: [
          'var(--font-poppins)',
          'Poppins',
          'var(--font-inter)',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // Soft, low-contrast card elevation matching the live site.
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        'card-hover':
          '0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.05)',
      },
      backgroundImage: {
        // Subtle dotted-grid pattern for hero / marketing sections.
        'dot-grid':
          'radial-gradient(circle, rgb(15 23 42 / 0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '22px 22px',
      },
    },
  },
  plugins: [],
};

export default config;
