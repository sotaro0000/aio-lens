// 診断軸 1 つ分のカード。スコアバーと、展開可能なチェック項目リストを表示。
"use client";

import { useState } from "react";
import type { CheckResult, DimensionResult } from "@/lib/types";

const STATUS_META: Record<CheckResult["status"], { glyph: string; cls: string; label: string }> = {
  pass: { glyph: "✓", cls: "border-emerald-300 text-emerald-700", label: "良好" },
  warn: { glyph: "!", cls: "border-amber-300 text-amber-700", label: "改善余地" },
  fail: { glyph: "✕", cls: "border-rose-300 text-rose-700", label: "要改善" },
};

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-sky-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function DimensionCard({ dim, index }: { dim: DimensionResult; index: number }) {
  const [open, setOpen] = useState(false);
  const issues = dim.checks.filter((c) => c.status !== "pass").length;

  return (
    <div className="border border-slate-200 bg-white transition-colors hover:border-slate-300">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="flex items-baseline gap-2 font-medium text-slate-900">
              <span className="font-mono text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              {dim.label}
            </h3>
            <span className="font-mono text-sm font-medium tabular-nums text-slate-800">{dim.score}</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden bg-slate-100">
            <div
              className={`h-full ${barColor(dim.score)}`}
              style={{ width: `${dim.score}%`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{dim.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`font-mono text-[11px] ${issues > 0 ? "text-amber-700" : "text-emerald-700"}`}
          >
            {issues > 0 ? `${issues} issues` : "clear"}
          </span>
          <span className="font-mono text-[11px] text-slate-400">{open ? "− close" : "+ detail"}</span>
        </div>
      </button>

      {open && (
        <ul className="space-y-3 border-t border-slate-100 p-4">
          {dim.checks.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <li key={c.id} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center border text-xs font-bold ${meta.cls}`}
                  title={meta.label}
                >
                  {meta.glyph}
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{c.label}</span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-400">{c.score}/100</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{c.detail}</p>
                  {c.recommendation && (
                    <p className="mt-1.5 border-l-2 border-slate-300 bg-slate-50 py-1 pl-2.5 text-xs leading-relaxed text-slate-600">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">改善 </span>
                      {c.recommendation}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
