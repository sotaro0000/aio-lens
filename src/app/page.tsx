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
  const [copied, setCopied] = useState(false);

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
      {/* ===== ライトな SaaS 型ヒーロー（中央寄せ・入力主役）===== */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50 to-transparent"></div>
        <div className="pointer-events-none absolute left-1/2 top-[-6rem] h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl"></div>

        <div className="relative mx-auto max-w-5xl px-5">
          {/* トップバー */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-base font-bold tracking-tight text-slate-900">AIO Lens</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-500">analyzer</span>
            </div>
            <a href="https://github.com/sotaro0000/aio-lens" target="_blank" rel="noreferrer noopener" className="font-mono text-xs text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline">GitHub ↗</a>
          </div>

          {/* ヒーロー本体（中央寄せ・1カラム）*/}
          <div className="mx-auto max-w-2xl pb-6 pt-10 text-center sm:pt-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-blue-600">AI Optimization Analyzer</span>
            <h1 className="mt-5 font-display text-[2rem] font-bold leading-[1.18] tracking-tight text-slate-900 sm:text-[2.7rem]">
              生成AIに引用されるか、<br className="hidden sm:block" />
              <span className="text-blue-600">6 軸</span>で測る。
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              生成AIに引用されることは、新しい検索流入の入口。URL を入力するだけで、構造化データ・引用性・E-E-A-T など 6 観点をスコア化し、改善点を具体的に示します。
            </p>

            <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-xl">
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:pl-5">
                <input
                  type="text"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 rounded-xl bg-transparent px-4 py-3 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:px-0"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-full"
                >
                  {loading ? "解析中…" : "解析する"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-mono text-[11px] text-slate-400">e.g.</span>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setUrl(ex);
                      analyze(ex);
                    }}
                    disabled={loading}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-500 transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                  >
                    {ex.replace(/^https?:\/\//, "")}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["登録不要", "APIキー不要", "6軸スコア＋改善提案"].map((b) => (
                <span key={b} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">{b}</span>
              ))}
            </div>

            {/* スコア・プレビュー（主役のビジュアル）*/}
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xl shadow-slate-200/70">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue-600">AIO Score</span>
                <span className="font-mono text-[10px] text-slate-400">example.com</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative flex h-20 w-20 flex-none items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeDasharray="213" strokeDashoffset="51" />
                  </svg>
                  <span className="absolute font-display text-xl font-bold text-slate-900">76</span>
                </div>
                <div className="flex-1 space-y-2">
                  {[["構造化データ", "58", "w-[58%] bg-amber-500"], ["コンテンツ引用性", "80", "w-[80%] bg-emerald-500"], ["E-E-A-T", "78", "w-[78%] bg-emerald-500"]].map(([k, v, bar]) => (
                    <div key={k}>
                      <div className="flex justify-between text-[10px] text-slate-500"><span>{k}</span><span className="font-mono">{v}</span></div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-800"><span className="font-mono text-[9px] uppercase tracking-wider text-blue-600">改善提案 </span>FAQ構造とJSON-LDの追加で、AIへの引用性が向上します</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 本体（ライト）===== */}
      <main className="mx-auto max-w-5xl px-5 py-14">
        <div>
          {error && (
            <div className="border-l-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}

          {loading && (
            <div className="space-y-px bg-slate-200">
              <div className="h-44 animate-pulse bg-slate-100" />
              <div className="h-28 animate-pulse bg-slate-100" />
              <div className="h-40 animate-pulse bg-slate-100" />
            </div>
          )}

          {!loading && !result && !error && (
            <div className="space-y-12">
              {/* メリット（「なぜ使うか」を先出し） */}
              <div>
                <p className="label-mono mb-4">AIO Lens でできること</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ["定量スコア化", "“AIから見た”引用適性を 100点満点で可視化し、改善の優先度がわかる"],
                    ["具体的な改善提案", "各項目に「何を・なぜ直すべきか」を明示。次の一手に直結"],
                    ["登録不要・即診断", "APIキー不要のルールベースで即結果。LLMキー設定で定性評価も"],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">{t}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 使い方 3ステップ */}
              <div>
                <p className="label-mono mb-4">使い方 — 3 ステップ</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    ["01", "URL を入力", "記事・LP・商品ページなどの URL を貼り付け"],
                    ["02", "6 軸で自動解析", "構造化データ〜E-E-A-T まで自動でチェック"],
                    ["03", "スコア＋改善提案", "100点満点の評価と、直すべき点を具体的に提示"],
                  ].map(([n, t, d]) => (
                    <div key={n} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <span className="font-mono text-sm font-medium text-blue-600">{n}</span>
                      <p className="mt-1.5 text-sm font-medium text-slate-800">{t}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 診断する6観点 */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <p className="label-mono border-b border-slate-100 px-5 py-3">診断する 6 つの観点</p>
                <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                  {DIMENSIONS.map((d, i) => (
                    <div key={d.label} className="flex items-start gap-3 bg-white p-5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 h-5 w-5 flex-none text-slate-400"
                      >
                        {d.icon}
                      </svg>
                      <div>
                        <p className="flex items-baseline gap-2 text-sm font-medium text-slate-800">
                          <span className="font-mono text-[11px] text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                          {d.label}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">{d.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div>
              {/* 結果ヘッダ：再実行・共有動線 */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setUrl("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  ← 別の URL を解析
                </button>
                <button
                  onClick={() => {
                    const text = [
                      `AIO スコア: ${result.overallScore}/100（${result.grade}）`,
                      `対象: ${result.finalUrl}`,
                      "",
                      ...result.dimensions.map((d) => `・${d.label}: ${d.score}/100`),
                      "",
                      "— AIO Lens (https://aio-lens.vercel.app) で診断",
                    ].join("\n");
                    navigator.clipboard?.writeText(text).then(
                      () => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      },
                      () => {},
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {copied ? "コピーしました" : "結果をコピー"}
                </button>
              </div>
              <ResultView result={result} />
            </div>
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-5 pb-12 pt-6">
        <div className="border-t border-slate-200 pt-5 font-mono text-[11px] leading-relaxed text-slate-400">
          <p>AIO Lens — generative-AI visibility analyzer · Next.js / TypeScript / LLM</p>
          <p className="mt-1">ルールベース診断は API キー不要で動作。LLM キー設定で定性評価を有効化。</p>
        </div>
      </footer>
    </div>
  );
}
