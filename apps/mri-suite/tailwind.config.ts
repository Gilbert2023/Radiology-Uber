import type { Config } from "tailwindcss";

// Brand tokens. Navy/teal foundation pending the official Bank Hospital logo colour
// specification — update `brand` and `accent` once the approved logo file is supplied.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3fb", 100: "#d9e3f4", 200: "#b3c6e8", 300: "#7f9fd4", 400: "#4d74b8",
          500: "#2c5497", 600: "#1f3f7a", 700: "#183262", 800: "#12264b", 900: "#0c1a35", 950: "#08122a",
        },
        accent: {
          50: "#ecfbf8", 100: "#cff5ec", 200: "#a0ead9", 300: "#66d7c1", 400: "#33bca5",
          500: "#179f8b", 600: "#0f8072", 700: "#10665c", 800: "#11514a", 900: "#12433e",
        },
        canvas: "#f4f7fb",
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
