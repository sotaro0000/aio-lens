// 診断結果全体の表示。総合スコア・LLM 総評・優先アクション・各軸カード。
"use client";

import type { AnalysisResult } from "@/lib/types";
import ScoreGauge from "./ScoreGauge";
import DimensionCard from "./DimensionCard";

const IMPACT_META: Record<string, { label: string; cls: string }> = {
  high: { label: "効果 大", cls: "text-rose-700" },
  medium: { label: "効果 中", cls: "text-amber-700" },
  low: { label: "効果 小", cls: "text-stone-500" },
};

export default function ResultView({ result }: { result: AnalysisResult }) {
  const { llm } = result;

  return (
    <div className="animate-fade-up space-y-px bg-stone-200">
      {/* サマリー */}
      <section className="bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row">
          <ScoreGauge score={result.overallScore} grade={result.grade} />
          <div className="min-w-0 flex-1">
            <p className="label-mono">Analyzed Page</p>
            <h2 className="mt-1 break-words font-display text-lg font-semibold text-stone-900">
              {result.snapshot.title || result.finalUrl}
            </h2>
            <a
              href={result.finalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="break-all font-mono text-xs text-stone-400 underline-offset-2 hover:text-stone-700 hover:underline"
            >
              {result.finalUrl}
            </a>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {[
                { k: "本文語数", v: `${result.snapshot.wordCount}` },
                { k: "lang", v: result.snapshot.lang ?? "—" },
                { k: "構造化データ", v: result.snapshot.jsonLdTypes.length ? `${result.snapshot.jsonLdTypes.length}件` : "なし" },
                { k: "解析時間", v: `${result.elapsedMs}ms` },
              ].map((x) => (
                <div key={x.k}>
                  <dt className="label-mono">{x.k}</dt>
                  <dd className="font-mono text-sm text-stone-800">{x.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 総評 */}
      {llm && (
        <section className="bg-white p-6 sm:p-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="label-mono">Assessment</p>
            <span className="font-mono text-[11px] text-stone-400">
              {llm.enabled ? `${llm.provider} · ${llm.model}` : "rule-based"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-stone-700">{llm.summary}</p>

          {llm.priorityActions.length > 0 && (
            <ol className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
              {llm.priorityActions.map((a, i) => (
                <li key={i} className="flex gap-4 py-3">
                  <span className="font-mono text-sm text-stone-300">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span className="text-sm font-medium text-stone-900">{a.title}</span>
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${IMPACT_META[a.impact].cls}`}>
                        {IMPACT_META[a.impact].label}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-500">{a.reason}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {llm.generatedJsonLd && (
            <details className="mt-5 border border-stone-200">
              <summary className="cursor-pointer bg-stone-50 px-3 py-2 font-mono text-xs text-stone-600">
                推奨 JSON-LD サンプルを表示
              </summary>
              <pre className="overflow-x-auto bg-ink p-4 text-xs leading-relaxed text-stone-100">
                <code>{llm.generatedJsonLd}</code>
              </pre>
            </details>
          )}

          {llm.error && (
            <p className="mt-3 border-l-2 border-amber-300 bg-amber-50 py-1.5 pl-2.5 text-xs text-amber-700">{llm.error}</p>
          )}
        </section>
      )}

      {/* 軸別 */}
      <section className="bg-white p-6 sm:p-8">
        <p className="label-mono mb-4">Dimensions / 6 axes</p>
        <div className="grid gap-px bg-stone-200 sm:grid-cols-2">
          {result.dimensions.map((d, i) => (
            <DimensionCard key={d.key} dim={d} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
