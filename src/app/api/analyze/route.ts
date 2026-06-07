// POST /api/analyze — URL を受け取り AIO 診断を実行して結果を返す。
import { NextRequest, NextResponse } from "next/server";
import { buildSnapshot, FetchError } from "@/lib/fetcher";
import { runHeuristics } from "@/lib/analyzers";
import { getLlmInsight, buildHeuristicInsight } from "@/lib/llm";
import { assembleResult } from "@/lib/scoring";

// 外部 fetch を行うため Node.js ランタイムを明示
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です。" }, { status: 400 });
  }

  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url を指定してください。" }, { status: 400 });
  }

  try {
    const snapshot = await buildSnapshot(url);
    const dimensions = runHeuristics(snapshot);

    // LLM 強化（キーがあれば）。失敗・未設定時はヒューリスティック由来の提案にフォールバック。
    const llmResult = await getLlmInsight(snapshot, dimensions);
    const llm = llmResult ?? buildHeuristicInsight(dimensions);

    const result = assembleResult(
      snapshot,
      dimensions,
      llm,
      new Date(startedAt).toISOString(),
      Date.now() - startedAt,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof FetchError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[analyze] unexpected error", err);
    return NextResponse.json({ error: "診断中に予期しないエラーが発生しました。" }, { status: 500 });
  }
}
