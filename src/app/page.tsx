"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import ResultView from "@/components/ResultView";

const EXAMPLES = ["https://ja.wikipedia.org/wiki/人工知能", "https://nextjs.org", "https://developer.mozilla.org"];

const DIMENSION_HINTS = [
  { label: "構造化データ", hint: "JSON-LD / schema.org" },
  { label: "コンテンツ引用性", hint: "簡潔さ・FAQ構造" },
  { label: "セマンティック構造", hint: "見出し階層・HTML5" },
  { label: "信頼性 (E-E-A-T)", hint: "著者・日付・出典" },
  { label: "メタ・基本SEO", hint: "title / description" },
  { label: "AIクローラビリティ", hint: "SSR・alt・密度" },
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
      if (!res.ok) {
        setError(data.error ?? "診断に失敗しました。");
      } else {
        setResult(data as AnalysisResult);
      }
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
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:py-16">
      {/* ヘッダー */}
      <header className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
          AIO — AI Optimization 診断ツール
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          AIO <span className="text-brand-600">Lens</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
          あなたのWebページは、ChatGPT や Google AI Overview などの生成AIに
          <strong className="text-slate-800">「引用・参照」</strong>されやすい状態ですか？
          <br className="hidden sm:block" />
          URL を入力するだけで、6 つの観点から AIO スコアを診断し、具体的な改善提案を提示します。
        </p>
      </header>

      {/* 入力フォーム */}
      <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/your-article"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "診断中…" : "診断する"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>例:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setUrl(ex);
                analyze(ex);
              }}
              disabled={loading}
              className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              {ex.replace(/^https?:\/\//, "")}
            </button>
          ))}
        </div>
      </form>

      {/* 状態表示 */}
      <div className="mt-10">
        {error && (
          <div className="mx-auto max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-28 animate-pulse rounded-xl bg-slate-200/50" />
              <div className="h-28 animate-pulse rounded-xl bg-slate-200/50" />
            </div>
            <p className="text-center text-xs text-slate-400">
              ページを取得して 6 軸で解析しています…
            </p>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6">
            <p className="mb-4 text-center text-sm font-medium text-slate-500">診断する 6 つの観点</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DIMENSION_HINTS.map((d) => (
                <div key={d.label} className="rounded-lg border border-slate-100 bg-white p-3 text-center">
                  <p className="text-xs font-semibold text-slate-700">{d.label}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{d.hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && <ResultView result={result} />}
      </div>

      <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
        <p>
          AIO Lens — 生成AI時代のWeb可視性診断ツール / Next.js · TypeScript · LLM
        </p>
        <p className="mt-1">
          ルールベース診断は API キー不要で動作します。LLM キー設定で定性評価が有効化されます。
        </p>
      </footer>
    </main>
  );
}
