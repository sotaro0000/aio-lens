import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIO Lens — 生成AIへの引用最適化アナライザー",
  description:
    "URL を入力すると、ChatGPT・Google AI Overview などの生成AIが引用しやすいページかを 6 軸で評価し、改善点を提示する AIO（AI Optimization）アナライザー。",
  openGraph: {
    title: "AIO Lens — 生成AIへの引用最適化アナライザー",
    description: "生成AIに引用されやすいページかを 6 軸で評価する AIO アナライザー。",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
