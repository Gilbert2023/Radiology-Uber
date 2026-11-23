import type { Config } from "tailwindcss";

// Brand tokens derived from the official Bank Hospital logo: charcoal, amber, red (red reserved for alerts/H mark).
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { // charcoal – lettering of the official Bank Hospital logo (#2C3135)
          50: "#f4f5f6", 100: "#e6e8ea", 200: "#ccd0d4", 300: "#a6adb3", 400: "#78828a",
          500: "#59636b", 600: "#454d54", 700: "#363c42", 800: "#2c3135", 900: "#1f2326", 950: "#131619",
        },
        accent: { // amber – ring of the official logo (#FDA900)
          50: "#fff9eb", 100: "#ffefc6", 200: "#ffdd88", 300: "#ffc94a", 400: "#feb820",
          500: "#fda900", 600: "#df8500", 700: "#b05a02", 800: "#8c4508", 900: "#733a0b",
        },
        logored: "#ed0000",
        canvas: "#f7f6f2",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,26,53,.06), 0 1px 3px rgba(12,26,53,.08)",
        lift: "0 4px 14px rgba(12,26,53,.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
