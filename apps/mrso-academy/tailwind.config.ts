import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#050b18", 900: "#0a1428", 800: "#0f1d38", 700: "#16284b", 600: "#1f3866" },
        charcoal: { 900: "#111418", 800: "#1a1f26", 700: "#252b34" },
        cyan: { 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4" },
        hazard: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
        caution: { 400: "#facc15", 500: "#eab308" },
        safe: { 400: "#4ade80", 500: "#22c55e", 600: "#16a34a" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      keyframes: {
        fieldline: { "0%": { strokeDashoffset: "400" }, "100%": { strokeDashoffset: "0" } },
        pulseRing: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "0.8" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
      },
      animation: {
        fieldline: "fieldline 14s linear infinite",
        pulseRing: "pulseRing 4s ease-in-out infinite",
        fadeUp: "fadeUp .6s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
