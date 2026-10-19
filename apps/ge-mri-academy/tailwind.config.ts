import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#f7f5f0", 50: "#fbfaf7", 100: "#f7f5f0", 200: "#eeeae1", 300: "#e2dccf" },
        rule: "#d8d2c4",
        ink: { DEFAULT: "#13233f", 900: "#0c1830", 800: "#13233f", 700: "#24375a", 600: "#3c4f72", 500: "#5b6b88", 400: "#8291aa" },
        teal: { 50: "#ecf6f5", 100: "#d2ebe8", 500: "#13827a", 600: "#0f6f68", 700: "#0c5a55", 800: "#0a4744" },
        signal: { amber: "#b45309", amberBg: "#fdf3e1", red: "#b42318", redBg: "#fdecea", green: "#1f7a3f", greenBg: "#e8f4ec", blue: "#1f4fb4", blueBg: "#e9effb" },
      },
      fontFamily: {
        sans: ["'Inter'", "'Segoe UI'", "system-ui", "-apple-system", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
        serif: ["'Source Serif Pro'", "'Charter'", "'Iowan Old Style'", "Georgia", "'Times New Roman'", "serif"],
        mono: ["'JetBrains Mono'", "'SFMono-Regular'", "Menlo", "Consolas", "monospace"],
      },
      maxWidth: { page: "76rem" },
    },
  },
  plugins: [],
};
export default config;
