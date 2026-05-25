import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        paper: "#F6F7F9",
        line: "#D9E0EA",
        marine: "#1E5A78",
        mint: "#2E7D64",
        saffron: "#B7791F",
        coral: "#B5473F"
      },
      boxShadow: {
        soft: "0 10px 28px rgba(16, 24, 40, 0.08)",
        panel: "0 1px 2px rgba(16, 24, 40, 0.06), 0 12px 32px rgba(16, 24, 40, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
