import type { Config } from 'tailwindcss';

/**
 * RTL RULE (addendum design pattern 8, DEC-001):
 *   Arabic layout is achieved with logical properties (`ms-*`, `me-*`, `ps-*`,
 *   `pe-*`, `start-*`, `end-*`) and `dir="rtl"` on <html>. NEVER
 *   `transform: scaleX(-1)` — it mirrors Arabic glyphs. On the designer canvas,
 *   RTL is a coordinate projection; stored coordinates stay canonical.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
