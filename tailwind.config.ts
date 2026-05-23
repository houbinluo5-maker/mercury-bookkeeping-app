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
        ink: "#172033",
        paper: "#F7F8FA",
        line: "#DEE3EA",
        marine: "#255E7E",
        mint: "#3F8F72",
        saffron: "#B7791F",
        coral: "#B95047"
      },
      boxShadow: {
        soft: "0 10px 28px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
