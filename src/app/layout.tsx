import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIO Lens｜あなたのWebページは生成AIに引用されているか？",
  description:
    "URL を入力するだけで、ChatGPT・Google AI Overview などの生成AIが引用しやすいページかを 6 つの観点で診断し、改善提案を提示する AIO（AI Optimization）診断ツール。",
  openGraph: {
    title: "AIO Lens — 生成AI時代のWeb可視性診断",
    description: "生成AIに引用されやすいページかを診断する AIO 最適化ツール。",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
