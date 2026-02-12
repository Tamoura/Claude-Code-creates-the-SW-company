import type { Config } from 'tailwindcss';

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
        dimension: {
          academic: '#3B82F6',
          'social-emotional': '#EC4899',
          behavioural: '#F59E0B',
          aspirational: '#8B5CF6',
          islamic: '#10B981',
          physical: '#EF4444',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Arabic',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
