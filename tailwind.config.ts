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
        ink: "#0A1020",
        paper: "#F7F6F2",
        line: "#E2E8F0",
        marine: "#102A43",
        mint: "#1F7A6D",
        saffron: "#B7791F",
        coral: "#B4463F"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 24px rgba(15, 23, 42, 0.06)",
        panel: "0 1px 2px rgba(15, 23, 42, 0.06), 0 18px 44px rgba(15, 23, 42, 0.08)",
        command: "0 24px 70px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
