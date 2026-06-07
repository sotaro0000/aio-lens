// 診断軸 1 つ分のカード。スコアバーと、展開可能なチェック項目リストを表示。
"use client";

import { useState } from "react";
import type { CheckResult, DimensionResult } from "@/lib/types";

const STATUS_META: Record<CheckResult["status"], { icon: string; cls: string; label: string }> = {
  pass: { icon: "✓", cls: "text-green-600 bg-green-50 border-green-200", label: "良好" },
  warn: { icon: "!", cls: "text-amber-600 bg-amber-50 border-amber-200", label: "改善余地" },
  fail: { icon: "×", cls: "text-red-600 bg-red-50 border-red-200", label: "要改善" },
};

function barColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function DimensionCard({ dim }: { dim: DimensionResult }) {
  const [open, setOpen] = useState(false);
  const issues = dim.checks.filter((c) => c.status !== "pass").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-4 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">{dim.label}</h3>
            <span className="text-sm font-bold tabular-nums text-slate-700">{dim.score}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${barColor(dim.score)}`}
              style={{ width: `${dim.score}%`, transition: "width 0.8s ease-out" }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{dim.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {issues > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {issues} 件の指摘
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              指摘なし
            </span>
          )}
          <span className="text-xs text-slate-400">{open ? "閉じる ▲" : "詳細 ▼"}</span>
        </div>
      </button>

      {open && (
        <ul className="space-y-3 border-t border-slate-100 p-4">
          {dim.checks.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <li key={c.id} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs font-bold ${meta.cls}`}
                  title={meta.label}
                >
                  {meta.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">{c.label}</span>
                    <span className="text-xs tabular-nums text-slate-400">{c.score}/100</span>
                  </div>
                  <p className="text-xs text-slate-500">{c.detail}</p>
                  {c.recommendation && (
                    <p className="mt-1 rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-800">
                      💡 {c.recommendation}
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
