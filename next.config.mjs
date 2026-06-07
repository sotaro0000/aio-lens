/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // cheerio をサーバーサイドの API Route でのみバンドルするための設定（Next 15+ で安定化）
  serverExternalPackages: ["cheerio"],
};

export default nextConfig;
