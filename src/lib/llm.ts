// LLM 強化レイヤー。
// API キーが設定されていれば LLM に定性評価・改善提案・JSON-LD 生成を依頼する。
// キーが無い場合はヒューリスティック結果から決定論的に「次の一手」を導出してフォールバックする。
import type { DimensionResult, LlmInsight, PageSnapshot } from "./types";

interface LlmConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
}

function readConfig(): LlmConfig | null {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    };
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

const SYSTEM_PROMPT = `あなたは「AIO（AI Optimization）」の専門家です。AIO とは、ChatGPT・Google AI Overview・Perplexity などの生成AIが、Webページを回答の根拠として「引用・参照」しやすくするための最適化を指します。
与えられたページのヒューリスティック診断結果とコンテンツ要約をもとに、生成AIから見た引用されやすさを評価し、改善提案を行ってください。
必ず指定された JSON スキーマのみを出力し、説明文や前置きは一切付けないでください。日本語で記述してください。`;

function buildUserPrompt(snapshot: PageSnapshot, dimensions: DimensionResult[]): string {
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3);
  const excerpt = snapshot.textContent.slice(0, 1500);
  return `# 診断対象
URL: ${snapshot.finalUrl}
タイトル: ${snapshot.title ?? "（なし）"}
言語: ${snapshot.lang ?? "（不明）"}
本文語数: ${snapshot.wordCount}
JSON-LD 型: ${snapshot.jsonLdTypes.join(", ") || "（なし）"}

# 各軸のスコア
${dimensions.map((d) => `- ${d.label}: ${d.score}/100`).join("\n")}

# 特にスコアが低い軸
${weakest.map((d) => `- ${d.label}（${d.score}/100）: ${d.checks.filter((c) => c.status !== "pass").map((c) => c.label).join(" / ") || "—"}`).join("\n")}

# 本文抜粋（先頭 1500 文字）
${excerpt}

# 出力スキーマ（この JSON のみを出力）
{
  "summary": "生成AIから見たこのページの引用されやすさの総評（150〜250文字）",
  "priorityActions": [
    { "title": "改善アクション名", "reason": "なぜ引用されやすさが上がるのか", "impact": "high|medium|low" }
  ],
  "generatedJsonLd": "このページに追加すべき JSON-LD のサンプル（<script>タグは不要、JSON文字列のみ。不要なら空文字）"
}
priorityActions は重要度の高い順に 3〜5 件。`;
}

/** OpenAI Chat Completions（JSON mode）を呼ぶ */
async function callOpenAI(cfg: LlmConfig, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "{}";
}

/** Anthropic Messages API を呼ぶ */
async function callAnthropic(cfg: LlmConfig, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1500,
      temperature: 0.3,
      system: `${SYSTEM_PROMPT}\n必ず JSON オブジェクトのみを返してください。`,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = Array.isArray(json.content)
    ? json.content.map((c: { text?: string }) => c.text ?? "").join("")
    : "";
  return text || "{}";
}

/** モデル出力テキストから JSON を頑健に抽出する */
function extractJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fallthrough */
      }
    }
    return {};
  }
}

/** ヒューリスティック結果のみから「次の一手」を導出するフォールバック */
export function buildHeuristicInsight(dimensions: DimensionResult[]): LlmInsight {
  const failing = dimensions
    .flatMap((d) => d.checks.map((c) => ({ dim: d, check: c })))
    .filter((x) => x.check.status !== "pass" && x.check.recommendation)
    .sort((a, b) => a.check.score - b.check.score)
    .slice(0, 5);

  const avg = Math.round(dimensions.reduce((a, d) => a + d.score, 0) / (dimensions.length || 1));

  return {
    enabled: false,
    summary:
      `ルールベース診断による暫定評価です（平均 ${avg} 点）。` +
      `スコアの低い軸から改善すると、生成AIがこのページを回答の根拠として引用しやすくなります。` +
      `LLM API キーを設定すると、本文を踏まえた定性評価と JSON-LD 自動生成が利用できます。`,
    priorityActions: failing.map((x) => ({
      title: `[${x.dim.label}] ${x.check.label}の改善`,
      reason: x.check.recommendation ?? "",
      impact: x.check.score < 30 ? "high" : x.check.score < 60 ? "medium" : "low",
    })),
  };
}

/** LLM による定性評価を取得。キーが無ければ null（呼び出し側でフォールバック）。 */
export async function getLlmInsight(
  snapshot: PageSnapshot,
  dimensions: DimensionResult[],
): Promise<LlmInsight | null> {
  const cfg = readConfig();
  if (!cfg) return null;

  const user = buildUserPrompt(snapshot, dimensions);
  try {
    const raw = cfg.provider === "anthropic" ? await callAnthropic(cfg, user) : await callOpenAI(cfg, user);
    const parsed = extractJson(raw);
    const actions = Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [];
    return {
      enabled: true,
      provider: cfg.provider,
      model: cfg.model,
      summary: typeof parsed.summary === "string" ? parsed.summary : "（要約を取得できませんでした）",
      priorityActions: actions
        .filter((a: unknown): a is Record<string, unknown> => !!a && typeof a === "object")
        .map((a: Record<string, unknown>) => ({
          title: String(a.title ?? ""),
          reason: String(a.reason ?? ""),
          impact: (["high", "medium", "low"].includes(String(a.impact)) ? a.impact : "medium") as
            | "high"
            | "medium"
            | "low",
        }))
        .slice(0, 5),
      generatedJsonLd:
        typeof parsed.generatedJsonLd === "string" && parsed.generatedJsonLd.trim()
          ? parsed.generatedJsonLd.trim()
          : undefined,
    };
  } catch (err) {
    return {
      enabled: false,
      summary: "LLM による評価中にエラーが発生したため、ルールベース診断のみを表示しています。",
      priorityActions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
