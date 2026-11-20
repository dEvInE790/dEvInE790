import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#050505", 900: "#0a0a0a", 800: "#111111", 700: "#1a1a1a", 600: "#262626" },
        blood: { DEFAULT: "#e10600", 400: "#ff2a1f", 500: "#e10600", 600: "#b80500", 700: "#7a0300", 900: "#2a0100" },
        bone: "#f4efe9",
      },
      fontFamily: {
        graffiti: ["var(--font-graffiti)", "Impact", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(225,6,0,.55), 0 0 64px rgba(225,6,0,.25)",
        "glow-sm": "0 0 12px rgba(225,6,0,.5)",
      },
      screens: { xs: "380px" },
    },
  },
  plugins: [],
} satisfies Config;
