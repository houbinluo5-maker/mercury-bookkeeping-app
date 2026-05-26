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
        ink: "#0B1220",
        paper: "#F5F3EF",
        line: "#D9DEE8",
        marine: "#123A55",
        mint: "#287A68",
        saffron: "#B7791F",
        coral: "#A9433C"
      },
      boxShadow: {
        soft: "0 10px 28px rgba(16, 24, 40, 0.08)",
        panel: "0 1px 2px rgba(11, 18, 32, 0.06), 0 18px 44px rgba(11, 18, 32, 0.08)",
        command: "0 22px 60px rgba(11, 18, 32, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
