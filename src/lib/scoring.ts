// 各診断軸のスコアを重み付き合成し、総合スコアとグレードを算出する。
import type { AnalysisResult, DimensionResult, LlmInsight, PageSnapshot } from "./types";

/** 重み付き総合スコア（0-100） */
export function calcOverallScore(dimensions: DimensionResult[]): number {
  const totalWeight = dimensions.reduce((a, d) => a + d.weight, 0) || 1;
  const weighted = dimensions.reduce((a, d) => a + d.score * d.weight, 0);
  return Math.round(weighted / totalWeight);
}

/** スコアを A〜D のグレードに変換 */
export function toGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

/** スナップショット・診断軸・LLM 結果を最終的な AnalysisResult に束ねる */
export function assembleResult(
  snapshot: PageSnapshot,
  dimensions: DimensionResult[],
  llm: LlmInsight | null,
  fetchedAt: string,
  elapsedMs: number,
): AnalysisResult {
  const overallScore = calcOverallScore(dimensions);
  return {
    url: snapshot.url,
    finalUrl: snapshot.finalUrl,
    fetchedAt,
    overallScore,
    grade: toGrade(overallScore),
    dimensions,
    snapshot: {
      title: snapshot.title,
      wordCount: snapshot.wordCount,
      jsonLdTypes: snapshot.jsonLdTypes,
      lang: snapshot.lang,
    },
    llm,
    elapsedMs,
  };
}
