"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import ResultView from "@/components/ResultView";

const EXAMPLES = ["https://ja.wikipedia.org/wiki/人工知能", "https://nextjs.org", "https://developer.mozilla.org"];

// 6 軸（番号・ラベル・補足・ラインアイコン）
const DIMENSIONS: { label: string; hint: string; icon: React.ReactNode }[] = [
  {
    label: "構造化データ",
    hint: "JSON-LD / schema.org",
    icon: (
      <path d="M8 4 4 12l4 8M16 4l4 8-4 8" />
    ),
  },
  {
    label: "コンテンツ引用性",
    hint: "簡潔さ・FAQ 構造",
    icon: <path d="M7 8h10M7 12h7M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4V5a1 1 0 0 1 1-1z" />,
  },
  {
    label: "セマンティック構造",
    hint: "見出し階層・HTML5",
    icon: <path d="M4 5h16M7 10h13M7 15h13M4 10v10M4 10h0" />,
  },
  {
    label: "信頼性 (E-E-A-T)",
    hint: "著者・日付・出典",
    icon: <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3zM9 12l2 2 4-4" />,
  },
  {
    label: "メタ・基本SEO",
    hint: "title / description",
    icon: <path d="M3 7h18M3 12h18M3 17h10" />,
  },
  {
    label: "AIクローラビリティ",
    hint: "SSR・alt・密度",
    icon: <path d="M5 8a7 7 0 0 1 14 0v4a7 7 0 0 1-14 0V8zM9 11h.01M15 11h.01M9 15h6" />,
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function analyze(target: string) {
    const trimmed = target.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "解析に失敗しました。");
      else setResult(data as AnalysisResult);
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    analyze(url);
  }

  return (
    <div className="min-h-screen">
      {/* トップバー */}
      <header className="border-b border-stone-200 bg-stone-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-base font-bold tracking-tight text-ink">AIO Lens</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">analyzer</span>
          </div>
          <a
            href="https://github.com/sotaro0000/aio-lens"
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-xs text-stone-500 underline-offset-4 hover:text-blue-600 hover:underline"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        {/* 見出し + 入力 */}
        <div className="max-w-2xl">
          <p className="label-mono">AI Optimization Analyzer</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.25] tracking-tight text-ink sm:text-[2.5rem]">
            生成AIに引用されるページか、<br className="hidden sm:block" />
            6 軸で測る。
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-500">
            生成AIに引用されることは、<span className="font-medium text-stone-700">新しい検索流入の入口</span>になります。
            ChatGPT や Google AI Overview が「何を根拠に引用先を選ぶか」を起点に URL を解析し、
            構造化データ・引用性・E-E-A-T など 6 観点をスコア化して、改善点を具体的に示します。
          </p>

          <form onSubmit={onSubmit} className="mt-7">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-sm text-stone-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "解析中…" : "解析する"}
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-stone-400">e.g.</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setUrl(ex);
                    analyze(ex);
                  }}
                  disabled={loading}
                  className="border border-stone-200 px-2 py-0.5 font-mono text-[11px] text-stone-500 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                >
                  {ex.replace(/^https?:\/\//, "")}
                </button>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] text-stone-400">
              登録不要・APIキー不要で今すぐ診断（LLMキー設定で定性評価も有効化）
            </p>
          </form>
        </div>

        {/* 状態 */}
        <div className="mt-12">
          {error && (
            <div className="border-l-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {loading && (
            <div className="space-y-px bg-stone-200">
              <div className="h-44 animate-pulse bg-stone-100" />
              <div className="h-28 animate-pulse bg-stone-100" />
              <div className="h-40 animate-pulse bg-stone-100" />
            </div>
          )}

          {!loading && !result && !error && (
            <div className="space-y-12">
              {/* 使い方 3ステップ */}
              <div>
                <p className="label-mono mb-4">使い方 — 3 ステップ</p>
                <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
                  {[
                    ["01", "URL を入力", "記事・LP・商品ページなどの URL を貼り付け"],
                    ["02", "6 軸で自動解析", "構造化データ〜E-E-A-T まで自動でチェック"],
                    ["03", "スコア＋改善提案", "100点満点の評価と、直すべき点を具体的に提示"],
                  ].map(([n, t, d]) => (
                    <div key={n} className="bg-white p-5">
                      <span className="font-mono text-sm font-medium text-blue-600">{n}</span>
                      <p className="mt-1.5 text-sm font-medium text-stone-800">{t}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 診断する6観点 */}
              <div className="border border-stone-200 bg-white">
                <p className="label-mono border-b border-stone-100 px-5 py-3">診断する 6 つの観点</p>
                <div className="grid grid-cols-1 gap-px bg-stone-100 sm:grid-cols-2 lg:grid-cols-3">
                  {DIMENSIONS.map((d, i) => (
                    <div key={d.label} className="flex items-start gap-3 bg-white p-5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 h-5 w-5 flex-none text-stone-400"
                      >
                        {d.icon}
                      </svg>
                      <div>
                        <p className="flex items-baseline gap-2 text-sm font-medium text-stone-800">
                          <span className="font-mono text-[11px] text-stone-300">{String(i + 1).padStart(2, "0")}</span>
                          {d.label}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-stone-400">{d.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* メリット */}
              <div className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-3">
                {[
                  ["定量スコア化", "“AIから見た”引用適性を 100点満点で可視化し、改善の優先度がわかる"],
                  ["具体的な改善提案", "各項目に「何を・なぜ直すべきか」を明示。次の一手に直結"],
                  ["登録不要・即診断", "APIキー不要のルールベースで即結果。LLMキー設定で定性評価も"],
                ].map(([t, d]) => (
                  <div key={t} className="bg-white p-5">
                    <p className="text-sm font-semibold text-stone-900">{t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && <ResultView result={result} />}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-5 pb-12 pt-6">
        <div className="border-t border-stone-200 pt-5 font-mono text-[11px] leading-relaxed text-stone-400">
          <p>AIO Lens — generative-AI visibility analyzer · Next.js / TypeScript / LLM</p>
          <p className="mt-1">ルールベース診断は API キー不要で動作。LLM キー設定で定性評価を有効化。</p>
        </div>
      </footer>
    </div>
  );
}
