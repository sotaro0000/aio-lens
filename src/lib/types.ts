// AIO Lens — 共通型定義

export type CheckStatus = "pass" | "warn" | "fail";

/** 個別チェック項目の結果 */
export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  /** 0-100 のスコア */
  score: number;
  /** 検出された実態の説明 */
  detail: string;
  /** 改善のための具体的な推奨アクション（status が pass の場合は空でも可） */
  recommendation?: string;
}

/** 診断軸（ディメンション）のキー */
export type DimensionKey =
  | "structuredData"
  | "citability"
  | "structure"
  | "trust"
  | "meta"
  | "crawlability";

/** 診断軸の結果 */
export interface DimensionResult {
  key: DimensionKey;
  label: string;
  description: string;
  /** 総合スコアへの重み（合計 1.0） */
  weight: number;
  /** 0-100 のディメンションスコア */
  score: number;
  checks: CheckResult[];
}

/** 取得・解析済みページのスナップショット（アナライザへの入力） */
export interface PageSnapshot {
  url: string;
  finalUrl: string;
  statusCode: number;
  html: string;
  lang: string | null;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  headings: { level: number; text: string }[];
  paragraphs: string[];
  /** 本文テキスト（タグ除去後） */
  textContent: string;
  wordCount: number;
  jsonLd: unknown[];
  jsonLdTypes: string[];
  ogTags: Record<string, string>;
  semanticTags: Record<string, number>;
  images: { total: number; withAlt: number };
  links: { internal: number; external: number };
  hasAuthor: boolean;
  publishedDate: string | null;
  modifiedDate: string | null;
  /** HTML 全体に占める本文テキストの割合（0-1） */
  textHtmlRatio: number;
}

/** LLM による定性評価（任意・キー未設定時は null） */
export interface LlmInsight {
  enabled: boolean;
  provider?: string;
  model?: string;
  /** 総評（AI から見たこのページの引用されやすさ） */
  summary: string;
  /** 優先度順の改善アクション */
  priorityActions: { title: string; reason: string; impact: "high" | "medium" | "low" }[];
  /** 自動生成された JSON-LD のサンプル（あれば） */
  generatedJsonLd?: string;
  /** エラー時のメッセージ */
  error?: string;
}

/** 診断全体の結果 */
export interface AnalysisResult {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  overallScore: number;
  grade: string;
  dimensions: DimensionResult[];
  snapshot: {
    title: string | null;
    wordCount: number;
    jsonLdTypes: string[];
    lang: string | null;
  };
  llm: LlmInsight | null;
  /** 処理時間（ms） */
  elapsedMs: number;
}
