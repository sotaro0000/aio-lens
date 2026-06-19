import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0a09", // stone-950 相当の近黒（プライマリ）
      },
      fontFamily: {
        // 見出し・ワードマーク：Space Grotesk（技術的・エディトリアル）
        display: ['"Space Grotesk"', "Inter", "system-ui", "sans-serif"],
        // 本文：Inter
        sans: ["Inter", "system-ui", "-apple-system", "Hiragino Kaku Gothic ProN", "Meiryo", "sans-serif"],
        // ラベル・数値：等幅
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
