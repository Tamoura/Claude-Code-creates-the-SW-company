import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        qdb: {
          navy: "#003366",
          "navy-light": "#004080",
          "navy-dark": "#002244",
          gold: "#C8922A",
          "gold-light": "#E5A93A",
          "gold-dark": "#A57520",
        },
      },
      fontFamily: {
        arabic: ["Noto Sans Arabic", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
