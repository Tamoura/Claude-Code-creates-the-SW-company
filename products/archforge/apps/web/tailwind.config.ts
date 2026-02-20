import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7950f2",
          50: "#f3f0ff",
          100: "#e5dbff",
          200: "#d0bfff",
          300: "#b197fc",
          400: "#9775fa",
          500: "#7950f2",
          600: "#7048e8",
          700: "#6741d9",
          800: "#5f3dc4",
          900: "#5235ab",
        },
        success: {
          DEFAULT: "#51cf66",
          50: "#ebfbee",
          100: "#d3f9d8",
          200: "#b2f2bb",
          300: "#8ce99a",
          400: "#69db7c",
          500: "#51cf66",
          600: "#40c057",
          700: "#37b24d",
          800: "#2f9e44",
          900: "#2b8a3e",
        },
        warning: {
          DEFAULT: "#ffd43b",
          50: "#fff9db",
          100: "#fff3bf",
          200: "#ffec99",
          300: "#ffe066",
          400: "#ffd43b",
          500: "#fcc419",
          600: "#fab005",
          700: "#f59f00",
          800: "#f08c00",
          900: "#e67700",
        },
        danger: {
          DEFAULT: "#ff6b6b",
          50: "#fff5f5",
          100: "#ffe3e3",
          200: "#ffc9c9",
          300: "#ffa8a8",
          400: "#ff8787",
          500: "#ff6b6b",
          600: "#fa5252",
          700: "#f03e3e",
          800: "#e03131",
          900: "#c92a2a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
