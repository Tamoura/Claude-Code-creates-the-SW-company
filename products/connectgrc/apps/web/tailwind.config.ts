import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8eef5',
          100: '#c5d5e8',
          200: '#9fb9d9',
          300: '#789eca',
          400: '#5b8abf',
          500: '#3e76b4',
          600: '#1e3a5f',
          700: '#1a3253',
          800: '#152a47',
          900: '#11223b',
          DEFAULT: '#1e3a5f',
        },
        accent: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
          DEFAULT: '#2196f3',
        },
        secondary: {
          50: '#e0f2f1',
          100: '#b2dfdb',
          200: '#80cbc4',
          300: '#4db6ac',
          400: '#26a69a',
          500: '#00897b',
          600: '#00796b',
          700: '#00695c',
          800: '#00594d',
          900: '#004d40',
          DEFAULT: '#00897b',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#1a1a2e',
        },
        background: {
          DEFAULT: '#f8fafc',
          dark: '#0f0f23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};

export default config;
