import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fdf2f4',
          100: '#fbe8ec',
          200: '#f6d0d9',
          300: '#eeaab9',
          400: '#e37991',
          500: '#d1506d',
          600: '#b83253',
          700: '#9a2545',
          800: '#8B1538',
          900: '#741634',
          DEFAULT: '#8B1538',
        },
        gold: {
          50: '#faf8f3',
          100: '#f4ede0',
          200: '#e8d9bf',
          300: '#d9bf96',
          400: '#C5A572',
          500: '#b8935d',
          600: '#a67e51',
          700: '#896544',
          800: '#70533c',
          900: '#5c4433',
          DEFAULT: '#C5A572',
        },
        sand: {
          50: '#fdfcfa',
          100: '#fcf9f3',
          200: '#F5E6CC',
          300: '#f0ddb8',
          400: '#e8cc96',
          500: '#deb56e',
          600: '#d09a4d',
          700: '#b17d3f',
          800: '#8e6437',
          900: '#73522f',
          DEFAULT: '#F5E6CC',
        },
        pearl: '#FAFAFA',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],
};

export default config;
