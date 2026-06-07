// 対象 URL を取得し、AIO 診断に必要な構造を抽出して PageSnapshot を生成する。
import * as cheerio from "cheerio";
import type { PageSnapshot } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 4_000_000; // 4MB

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchError";
  }
}

/** 入力 URL を検証・正規化する */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new FetchError("URL を入力してください。");
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new FetchError("URL の形式が正しくありません。");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FetchError("http(s) の URL のみ診断できます。");
  }
  // SSRF 対策: 内部ネットワーク宛のホストを拒否する
  const host = parsed.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) {
    throw new FetchError("内部ネットワーク宛の URL は診断できません。");
  }
  return parsed.toString();
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // 一般的なブラウザ UA を提示しつつ AIO 診断ボットであることを明示
        "User-Agent":
          "Mozilla/5.0 (compatible; AIO-Lens/1.0; +https://github.com/) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.8",
      },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new FetchError(`HTML ページではありません（Content-Type: ${contentType || "不明"}）。`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new FetchError("ページサイズが大きすぎます（4MB 超）。");
    }
    const html = new TextDecoder("utf-8").decode(buf);
    return { html, finalUrl: res.url || url, status: res.status };
  } catch (err) {
    if (err instanceof FetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchError("ページの取得がタイムアウトしました。");
    }
    throw new FetchError("ページを取得できませんでした。URL を確認してください。");
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLd($: cheerio.CheerioAPI): { data: unknown[]; types: string[] } {
  const data: unknown[] = [];
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        data.push(node);
        collectTypes(node, types);
      }
    } catch {
      // 不正な JSON-LD は無視する
    }
  });
  return { data, types: [...types] };
}

function collectTypes(node: unknown, acc: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") acc.add(t);
  else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && acc.add(x));
  // @graph 内も探索する
  const graph = obj["@graph"];
  if (Array.isArray(graph)) graph.forEach((g) => collectTypes(g, acc));
}

/** URL を取得して PageSnapshot を構築する */
export async function buildSnapshot(rawUrl: string): Promise<PageSnapshot> {
  const url = normalizeUrl(rawUrl);
  const { html, finalUrl, status } = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 本文抽出のためスクリプト/スタイル等を除去したクローンを用意
  const $body = cheerio.load(html);
  $body("script, style, noscript, template, svg").remove();
  const textContent = $body("body").text().replace(/\s+/g, " ").trim();
  const wordCount = countWords(textContent);

  const headings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const level = Number(el.tagName.substring(1));
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) headings.push({ level, text });
  });

  const paragraphs: string[] = [];
  $body("p").each((_, el) => {
    const text = $body(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 0) paragraphs.push(text);
  });

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"], meta[name^="og:"]').each((_, el) => {
    const key = ($(el).attr("property") || $(el).attr("name") || "").trim();
    const content = ($(el).attr("content") || "").trim();
    if (key && content) ogTags[key] = content;
  });

  const semanticTagNames = ["article", "section", "main", "nav", "header", "footer", "aside", "figure"];
  const semanticTags: Record<string, number> = {};
  for (const tag of semanticTagNames) {
    const count = $(tag).length;
    if (count > 0) semanticTags[tag] = count;
  }

  let imagesWithAlt = 0;
  const imagesTotal = $("img").length;
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (typeof alt === "string" && alt.trim().length > 0) imagesWithAlt += 1;
  });

  const origin = new URL(finalUrl).origin;
  let internal = 0;
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const abs = new URL(href, finalUrl);
      if (abs.origin === origin) internal += 1;
      else external += 1;
    } catch {
      /* 無効なリンクは無視 */
    }
  });

  const { data: jsonLd, types: jsonLdTypes } = parseJsonLd($);

  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  const lang = $("html").attr("lang")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;
  const title = $("title").first().text().trim() || ogTags["og:title"] || null;

  const hasAuthor =
    $('meta[name="author"]').length > 0 ||
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0 ||
    /"author"\s*:/.test(JSON.stringify(jsonLd));

  const publishedDate =
    $('meta[property="article:published_time"]').attr("content")?.trim() ||
    $("time[datetime]").first().attr("datetime")?.trim() ||
    null;
  const modifiedDate =
    $('meta[property="article:modified_time"]').attr("content")?.trim() || null;

  const textHtmlRatio = html.length > 0 ? Math.min(1, textContent.length / html.length) : 0;

  return {
    url,
    finalUrl,
    statusCode: status,
    html,
    lang,
    title,
    metaDescription,
    canonical,
    headings,
    paragraphs,
    textContent,
    wordCount,
    jsonLd,
    jsonLdTypes,
    ogTags,
    semanticTags,
    images: { total: imagesTotal, withAlt: imagesWithAlt },
    links: { internal, external },
    hasAuthor,
    publishedDate,
    modifiedDate,
    textHtmlRatio,
  };
}

/** 日本語/英語混在を考慮した簡易ワードカウント */
export function countWords(text: string): number {
  // CJK 文字は 1 文字 = 1 語相当としてカウントし、それ以外は空白区切り
  const cjk = (text.match(/[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/g) || []).length;
  const nonCjk = text
    .replace(/[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + nonCjk;
}
