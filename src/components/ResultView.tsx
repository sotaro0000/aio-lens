// 診断結果全体の表示。総合スコア・LLM 総評・優先アクション・各軸カード。
"use client";

import type { AnalysisResult } from "@/lib/types";
import ScoreGauge from "./ScoreGauge";
import DimensionCard from "./DimensionCard";

const IMPACT_META: Record<string, { label: string; cls: string }> = {
  high: { label: "効果大", cls: "bg-red-100 text-red-700" },
  medium: { label: "効果中", cls: "bg-amber-100 text-amber-700" },
  low: { label: "効果小", cls: "bg-slate-100 text-slate-600" },
};

export default function ResultView({ result }: { result: AnalysisResult }) {
  const { llm } = result;

  return (
    <div className="animate-fade-up space-y-6">
      {/* サマリーカード */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <ScoreGauge score={result.overallScore} grade={result.grade} />
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">AIO スコア</p>
            <h2 className="mt-1 break-all text-lg font-bold text-slate-800">
              {result.snapshot.title || result.finalUrl}
            </h2>
            <a
              href={result.finalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all text-xs text-slate-400 hover:text-brand-600 hover:underline"
            >
              {result.finalUrl}
            </a>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                本文 {result.snapshot.wordCount} 語
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                lang: {result.snapshot.lang ?? "未設定"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                構造化データ: {result.snapshot.jsonLdTypes.length ? result.snapshot.jsonLdTypes.join(", ") : "なし"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                解析 {result.elapsedMs}ms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LLM / ルールベース 総評 */}
      {llm && (
        <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-bold text-slate-800">AI による総評と改善提案</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                llm.enabled ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {llm.enabled ? `${llm.provider} / ${llm.model}` : "ルールベース（LLM キー未設定）"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{llm.summary}</p>

          {llm.priorityActions.length > 0 && (
            <ol className="mt-4 space-y-2">
              {llm.priorityActions.map((a, i) => (
                <li key={i} className="flex gap-3 rounded-lg bg-white/70 p-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{a.title}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${IMPACT_META[a.impact].cls}`}>
                        {IMPACT_META[a.impact].label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{a.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {llm.generatedJsonLd && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-brand-700">
                追加推奨の JSON-LD サンプルを表示
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                <code>{llm.generatedJsonLd}</code>
              </pre>
            </details>
          )}

          {llm.error && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">⚠ {llm.error}</p>
          )}
        </section>
      )}

      {/* 軸別カード */}
      <section>
        <h3 className="mb-3 font-bold text-slate-800">診断軸ごとの評価</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {result.dimensions.map((d) => (
            <DimensionCard key={d.key} dim={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
